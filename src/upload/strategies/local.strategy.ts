import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  IStorageStrategy,
  UploadOptions,
  UploadResult,
} from '../interfaces/storage-strategy.interface';
import * as fs from 'fs';
import * as path from 'path';
import 'multer';

@Injectable()
export class LocalStrategy implements IStorageStrategy {
  constructor() {}
  private readonly uploadPath = path.join(process.cwd(), 'uploads');

  async upload(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      const folder = options?.folder || 'others';
      const userId = options?.userId;

      const basePath = path.join(this.uploadPath, folder);

      const uploadDir = userId ? path.join(basePath, userId) : basePath;

      await this.ensureDir(uploadDir);

      const fileName = this.generateFileName(file.originalname);
      const filePath = path.join(uploadDir, fileName);

      await fs.promises.writeFile(filePath, file.buffer);

      const url = userId
        ? `/uploads/${folder}/${userId}/${fileName}`
        : `/uploads/${folder}/${fileName}`;

      return {
        url,
        fileName,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      console.error('UPLOAD ERROR:', error);
      throw new InternalServerErrorException('Failed to upload file locally');
    }
  }

  private async ensureDir(dir: string): Promise<void> {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  private generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    return `${name}-${uniqueSuffix}${ext}`;
  }
}
