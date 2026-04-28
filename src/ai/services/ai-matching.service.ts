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
    retryCount = 0, // ← track số lần retry
  ): Promise<void> {
    const MAX_RETRIES = 1;

    await this.applicationModel.findByIdAndUpdate(application._id, {
      matchStatus: 'analyzing',
    });

    try {
      const prompt = this.buildPrompt(application.cvText, job);
      const result = await this.geminiModel.generateContent(prompt);

      const rawText = result.response.text();
      this.logger.debug(`Gemini raw response: ${rawText}`);
      // 🔥 LOG RAW để debug
      this.logger.debug(
        `Gemini raw response (application ${application._id}): ${rawText}`,
      );

      const analysis = this.parseResponse(rawText);

      // 🔥 VALIDATE output
      if (!this.isValidAnalysis(analysis)) {
        throw new Error('AI trả về sai format');
      }

      await this.applicationModel.findByIdAndUpdate(application._id, {
        matchScore: analysis.score,
        matchAnalysis: analysis,
        matchStatus: 'done',
        analyzedAt: new Date(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);

      // Kiểm tra có phải lỗi 429 không
      const is429 =
        message.includes('429') || message.includes('Too Many Requests');

      if (is429 && retryCount < MAX_RETRIES) {
        // Parse retry delay từ message Gemini trả về, fallback 40s
        const retryDelay = this.parseRetryDelay(message) ?? 40000;

        this.logger.warn(
          `Rate limit cho application ${application._id} — retry sau ${retryDelay / 1000}s (lần ${retryCount + 1}/${MAX_RETRIES})`,
        );

        await this.delay(retryDelay);

        // Retry
        return this.analyzeOne(application, job, retryCount + 1);
      }

      // Không phải 429 hoặc đã hết retry → mark failed
      this.logger.error(
        `Phân tích thất bại cho application ${application._id}: ${message}`,
      );

      await this.applicationModel.findByIdAndUpdate(application._id, {
        matchStatus: 'failed',
      });
    }
  }

  // Parse "Please retry in 35.05s" từ error message
  private parseRetryDelay(message: string): number | null {
    const match = message.match(/retry in (\d+(\.\d+)?)s/i);
    if (!match) return null;

    const seconds = parseFloat(match[1]);
    return Math.ceil(seconds) * 1000 + 2000; // thêm 2s buffer
  }

  private buildPrompt(cvText: string, job: Job): string {
    return `
Bạn là chuyên gia tuyển dụng.

⚠️ BẮT BUỘC:
- CHỈ trả về JSON hợp lệ
- KHÔNG markdown
- KHÔNG giải thích
- KHÔNG text ngoài JSON
- Key phải có dấu "
- JSON phải parse được bằng JSON.parse()

=== JOB ===
Title: ${job.title}
Description: ${job.description}
Requirements: ${job.requirements}
Skills: ${job.skills.join(', ')}

=== CV ===
${cvText.slice(0, 3000)}

=== OUTPUT ===
{
  "score": number,
  "summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "suggestion": string
}
  `.trim();
  }

  private parseResponse(text: string): IMatchAnalysis {
    try {
      // 🔥 B1: extract JSON từ text
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Không tìm thấy JSON');
      }

      let cleaned = jsonMatch[0];

      // 🔥 B2: fix JSON lỗi phổ biến
      cleaned = cleaned
        .replace(/(\w+):/g, '"$1":') // key không có ""
        .replace(/'/g, '"') // ' -> "
        .replace(/,\s*}/g, '}') // trailing comma
        .replace(/,\s*]/g, ']');

      return JSON.parse(cleaned);
    } catch (err) {
      this.logger.warn(`Parse Gemini thất bại. Raw: ${text}`);

      return {
        score: 0,
        summary: 'Không thể phân tích',
        strengths: [],
        weaknesses: [],
        suggestion: 'Vui lòng thử lại',
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
  private preprocessCv(cvText: string): string {
    // 1. remove email
    cvText = cvText.replace(/\S+@\S+/g, '');

    // 2. remove phone
    cvText = cvText.replace(/\+?\d[\d\s-]{8,}/g, '');

    // 3. remove address (basic)
    cvText = cvText.replace(
      /\d{1,4}.*(Street|St|Road|Rd|City|VIC|District)/gi,
      '',
    );

    // 4. limit length
    return cvText.slice(0, 2000);
  }
}
