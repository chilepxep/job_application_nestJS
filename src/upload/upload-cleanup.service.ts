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

    // Giới hạn 100 file mỗi lần chạy, tránh OOM
    const files = await this.filesService.findTempFiles(threshold, 100);

    this.logger.log(`Found ${files.length} TEMP files to process`);

    let deleted = 0;
    let skipped = 0;
    let failed = 0;

    await this.processInBatches(files, 10, async (file) => {
      try {
        //Atomic claim — tránh race condition với user đang dùng file
        const claimed = await this.filesService.claimForCleanup(
          file._id.toString(),
        );

        if (!claimed) {
          //File đã được user kích hoạt giữa lúc query và lúc xử lý
          skipped++;
          return;
        }

        //Xóa vật lý trên cloud
        const strategy = this.uploadFactory.getStrategyByProvider(
          file.provider,
        );
        await strategy.delete(file.storageKey, file.resourceType);

        //Xóa record DB
        await this.filesService.deleteRecord(file._id.toString());

        deleted++;
        this.logger.log(`Deleted file: ${file._id}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : JSON.stringify(error);

        failed++;
        this.logger.error(
          `Failed to cleanup file ${file._id}: ${message}`,
          error,
        );
      }
    });

    this.logger.log(
      `Cleanup done — deleted: ${deleted}, skipped: ${skipped}, failed: ${failed}`,
    );
  }
  private async processInBatches<T>(
    items: T[],
    batchSize: number,
    handler: (item: T) => Promise<void>,
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(handler));
    }
  }
}
