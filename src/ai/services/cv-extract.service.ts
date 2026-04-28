import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PDFParse } from 'pdf-parse';
import {
  Application,
  ApplicationDocument,
} from '../../application/schemas/application.schema';
import { Model } from 'mongoose';
import { FilesService } from '../../files/files.service';
import { SupabaseStrategy } from '../../upload/strategies/supabase.strategy';
import axios from 'axios';

@Injectable()
export class CvExtractService {
  private readonly logger = new Logger(CvExtractService.name);

  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
    private readonly filesService: FilesService,
    private readonly supabaseStrategy: SupabaseStrategy,
  ) {}

  private async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      return result.text?.trim() ?? '';
    } finally {
      // Giải phóng resource sau khi dùng xong
      await parser.destroy();
    }
  }

  async extractAndCache(applicationId: string): Promise<void> {
    try {
      const application = await this.applicationModel
        .findById(applicationId)
        .populate('cvFileId');

      if (!application) return;

      const file = application.cvFileId as any;

      if (!file?.storageKey) {
        this.logger.warn(`Application ${applicationId} không có storageKey`);
        await this.applicationModel.findByIdAndUpdate(applicationId, {
          cvExtractStatus: 'failed',
        });
        return;
      }

      // Lấy signed URL mới vì bucket private
      const signedUrl = await this.supabaseStrategy.getSignedUrl(
        file.storageKey,
        3600,
      );

      // Download PDF về buffer
      const response = await axios.get(signedUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const cvText = await this.extractTextFromBuffer(
        Buffer.from(response.data),
      );

      if (!cvText) {
        this.logger.warn(
          `Extract được text rỗng cho application ${applicationId}`,
        );
        await this.applicationModel.findByIdAndUpdate(applicationId, {
          cvExtractStatus: 'failed',
        });
        return;
      }

      await this.applicationModel.findByIdAndUpdate(applicationId, {
        cvText,
        cvExtractStatus: 'extracted',
      });

      this.logger.log(
        `Extract CV thành công cho application ${applicationId} — ${cvText.length} ký tự`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.error(
        `Extract CV thất bại cho application ${applicationId}: ${message}`,
      );
      await this.applicationModel.findByIdAndUpdate(applicationId, {
        cvExtractStatus: 'failed',
      });
    }
  }
}
