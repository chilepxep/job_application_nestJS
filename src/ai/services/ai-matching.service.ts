import { Inject, Injectable, Logger } from '@nestjs/common';
import { GEMINI_CLIENT } from '../providers/gemini.provider';
import { InjectModel } from '@nestjs/mongoose';
import {
  Application,
  ApplicationDocument,
} from '../../application/schemas/application.schema';
import { Model } from 'mongoose';
import { Job } from '../../jobs/schemas/job.schema';
import { IMatchAnalysis } from '../interfaces/ai-analysis.interface';

@Injectable()
export class AiMatchingService {
  private readonly logger = new Logger(AiMatchingService.name);

  constructor(
    @Inject(GEMINI_CLIENT) private readonly geminiModel: any,
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
  ) {}

  async analyzeJob(jobId: string, job: Job): Promise<void> {
    const applications = await this.applicationModel.find({
      job: jobId,
      isDeleted: false,
      cvExtractStatus: 'extracted',
      matchStatus: { $in: ['not_analyzed', 'failed'] },
    });

    this.logger.log(
      `Bắt đầu phân tích ${applications.length} CV cho job ${jobId}`,
    );

    for (const application of applications) {
      await this.analyzeOne(application, job);
      await this.delay(4000);
    }

    this.logger.log(`Hoàn thành phân tích job ${jobId}`);
  }

  private async analyzeOne(
    application: ApplicationDocument,
    job: Job,
    retryCount = 0,
  ): Promise<void> {
    const MAX_RETRIES = 2; // ← tăng từ 1 lên 3 vì 503 cần retry nhiều hơn

    await this.applicationModel.findByIdAndUpdate(application._id, {
      matchStatus: 'analyzing',
    });

    try {
      const prompt = this.buildPrompt(application.cvText, job);
      const result = await this.geminiModel.generateContent(prompt);
      const rawText = result.response.text();

      this.logger.debug(
        `Gemini raw (application ${application._id}): ${rawText.slice(0, 300)}`,
      );

      const analysis = this.parseResponse(rawText);

      if (!this.isValidAnalysis(analysis)) {
        throw new Error(`AI trả về sai format: ${JSON.stringify(analysis)}`);
      }

      await this.applicationModel.findByIdAndUpdate(application._id, {
        matchScore: analysis.score,
        matchAnalysis: analysis,
        matchStatus: 'done',
        analyzedAt: new Date(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);

      // ✅ Gom tất cả lỗi retryable vào 1 chỗ
      const retryableErrors = [
        { pattern: '429', label: 'Rate limit' },
        { pattern: 'Too Many Requests', label: 'Rate limit' },
        { pattern: '503', label: 'Service unavailable' },
        { pattern: 'Service Unavailable', label: 'Service unavailable' },
        { pattern: 'high demand', label: 'High demand' },
      ];

      const matched = retryableErrors.find((e) => message.includes(e.pattern));

      if (matched && retryCount < MAX_RETRIES) {
        // 429 → dùng delay từ header Gemini trả về
        // 503 → exponential backoff: 10s, 20s, 40s
        const retryDelay = message.includes('429')
          ? (this.parseRetryDelay(message) ?? 40000)
          : Math.min(10000 * Math.pow(2, retryCount), 60000); // max 60s

        this.logger.warn(
          `[${matched.label}] application ${application._id} — retry sau ${retryDelay / 1000}s (${retryCount + 1}/${MAX_RETRIES})`,
        );

        await this.delay(retryDelay);
        return this.analyzeOne(application, job, retryCount + 1);
      }

      this.logger.error(
        `Phân tích thất bại application ${application._id}: ${message}`,
      );
      await this.applicationModel.findByIdAndUpdate(application._id, {
        matchStatus: 'failed',
      });
    }
  }
  private buildPrompt(cvText: string, job: Job): string {
    const cleanedCv = this.preprocessCv(cvText); // ← gọi preprocessCv

    return `
Bạn là chuyên gia tuyển dụng.

⚠️ BẮT BUỘC:
- CHỈ trả về JSON hợp lệ
- KHÔNG markdown, KHÔNG giải thích, KHÔNG text ngoài JSON
- JSON phải parse được bằng JSON.parse()

=== JOB ===
Title: ${job.title}
Requirements: ${job.requirements}
Skills: ${job.skills.join(', ')}
Experience: ${job.experience} năm

=== CV ===
${cleanedCv}

=== OUTPUT FORMAT ===
{"score":number,"summary":"string","strengths":["string"],"weaknesses":["string"],"suggestion":"string"}
    `.trim();
  }

  private parseResponse(text: string): IMatchAnalysis {
    try {
      this.logger.debug(`Raw response length: ${text.length}`);

      let jsonStr = text.trim();

      // B1: Bóc markdown code block nếu có
      // ```json ... ``` hoặc ``` ... ```
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      // B2: Tìm JSON object trong text
      // Tìm từ { đầu tiên đến } cuối cùng
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');

      if (start === -1 || end === -1 || start >= end) {
        throw new Error(
          `Không tìm thấy JSON block. Text: ${jsonStr.slice(0, 100)}`,
        );
      }

      jsonStr = jsonStr.slice(start, end + 1);

      // B3: Fix trailing comma
      jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

      const parsed = JSON.parse(jsonStr);

      if (!this.isValidAnalysis(parsed)) {
        throw new Error(`Invalid format: ${JSON.stringify(parsed)}`);
      }

      return parsed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Parse Gemini thất bại: ${message} | Raw (200): ${text.slice(0, 200)}`,
      );
      return {
        score: 0,
        summary: 'Không thể phân tích',
        strengths: [],
        weaknesses: [],
        suggestion: 'Vui lòng thử lại',
      };
    }
  }

  private preprocessCv(cvText: string): string {
    return cvText
      .replace(/\S+@\S+/g, '') // xóa email
      .replace(/\+?\d[\d\s-]{8,}/g, '') // xóa phone
      .replace(/\d{1,4}.*(Street|St|Road|Rd|City|VIC|District)/gi, '') // xóa address
      .replace(/--\s*\d+\s*of\s*\d+\s*--/g, '') // xóa footer pdf
      .replace(/\s{2,}/g, ' ') // chuẩn hóa whitespace
      .trim()
      .slice(0, 2000);
  }

  private parseRetryDelay(message: string): number | null {
    const match = message.match(/retry in (\d+(\.\d+)?)s/i);
    if (!match) return null;
    return Math.ceil(parseFloat(match[1])) * 1000 + 2000;
  }

  private isValidAnalysis(data: any): data is IMatchAnalysis {
    return (
      data &&
      typeof data.score === 'number' &&
      typeof data.summary === 'string' &&
      Array.isArray(data.strengths) &&
      Array.isArray(data.weaknesses) &&
      typeof data.suggestion === 'string'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
