import { Injectable } from '@nestjs/common';
import { ImageUploadService } from './services/image-upload.service';
import { FileUploadService } from './services/file-upload.service';
import { UploadOptions } from './interfaces/storage-strategy.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  constructor(
    private readonly imageUploadService: ImageUploadService,
    private readonly fileUploadService: FileUploadService,
    private readonly configService: ConfigService,
  ) {}

  async uploadImage(file: Express.Multer.File, options?: UploadOptions) {
    try {
      const result = await this.imageUploadService.upload(file, options);
      return this.buildFileUrl(result);
    } catch (error) {
      throw error;
    }
  }

  async uploadFile(file: Express.Multer.File, options?: UploadOptions) {
    try {
      const result = await this.fileUploadService.upload(file, options);
      return this.buildFileUrl(result);
    } catch (error) {
      throw error;
    }
  }

  private buildFileUrl(result: any) {
    const baseUrl = this.configService.get<string>('APP_URL');

    return {
      ...result,
      url: result.url.startsWith('http')
        ? result.url // cloud (Cloudinary, Supabase)
        : `${baseUrl}${result.url}`, // local
    };
  }
}
