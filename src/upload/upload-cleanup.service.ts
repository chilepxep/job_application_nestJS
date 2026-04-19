import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FilesService } from '../files/files.service';
import { UploadFactory } from './upload.factory';
import { FileStatus } from '../files/schemas/file.schema';

@Injectable()
export class UploadCleanupService {
  private readonly logger = new Logger(UploadCleanupService.name);

  constructor(
    private readonly filesService: FilesService,
    private readonly uploadFactory: UploadFactory,
  ) {}

  // chạy mỗi ngày lúc 2h sáng
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanup() {
    this.logger.log('Start cleaning TEMP files...');

    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const files = await this.filesService.findTempFiles(threshold);

    this.logger.log(`Found ${files.length} TEMP files`);

    for (const file of files) {
      try {
        const latest = await this.filesService.findById(file._id.toString());

        if (latest.status !== FileStatus.TEMP) {
          continue;
        }

        const strategy = this.uploadFactory.getStrategyByProvider(
          file.provider,
        );

        await strategy.delete(file.storageKey, file.resourceType);

        await this.filesService.deleteRecord(file._id.toString());

        this.logger.log(`Deleted file: ${file._id}`);
      } catch (error) {
        this.logger.error(`Failed to cleanup file: ${file._id}`, error);
      }
    }

    this.logger.log('Cleanup done');
  }
}
