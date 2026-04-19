import { Injectable } from '@nestjs/common';
import { ImageUploadService } from './services/image-upload.service';
import { FileUploadService } from './services/file-upload.service';
import { UploadOptions } from './interfaces/storage-strategy.interface';
import { ConfigService } from '@nestjs/config';
import { FileType, StorageProvider } from '../files/schemas/file.schema';
import { FilesService } from '../files/files.service';
import { LocalStrategy } from './strategies/local.strategy';
import { CloudinaryStrategy } from './strategies/cloudinary.strategy';
import { UploadFactory } from './upload.factory';

@Injectable()
export class UploadService {
  constructor(
    private readonly imageUploadService: ImageUploadService,
    private readonly fileUploadService: FileUploadService,
    private readonly configService: ConfigService,
    private readonly filesService: FilesService,
    private readonly uploadFactory: UploadFactory,
  ) {}

  async uploadImage(file: Express.Multer.File, options?: UploadOptions) {
    let result: any;
    try {
      const strategy = this.uploadFactory.getImageStrategy();

      //1 upload thật (local/cloud)
      result = await strategy.upload(file, options);
      //2 xác định provider
      const provider = this.getProvider(result.url);
      //3 lưu DB
      const fileDoc = await this.filesService.create({
        url: result.url,
        storageKey: result.storageKey,
        type: FileType.LOGO,
        provider,
        ownerId: options.userId,
      });

      return {
        fileId: fileDoc._id,
        url: result.url,
      };
    } catch (error) {
      if (result) {
        try {
          await this.deleteUploadedFile(result);
        } catch (e) {
          console.error('Rollback delete failed', e);
        }
      }
      throw error;
    }
  }

  async uploadFile(file: Express.Multer.File, options?: UploadOptions) {
    let result: any;
    try {
      const strategy = this.uploadFactory.getImageStrategy();

      result = await strategy.upload(file, options);

      const provider = this.getProvider(result.url);

      const fileDoc = await this.filesService.create({
        url: result.url,
        storageKey: result.storageKey,
        type: FileType.CV,
        provider,
        ownerId: options.userId,
      });

      return {
        fileId: fileDoc._id,
        url: result.url,
      };
    } catch (error) {
      //rollback nếu upload đã thành công nhưng DB fail
      if (result) {
        try {
          await this.deleteUploadedFile(result);
        } catch (e) {
          console.error('Rollback delete failed', e);
        }
      }

      throw error;
    }
  }

  private async deleteUploadedFile(result: any) {
    const provider = this.getProvider(result.url);

    const strategy = this.uploadFactory.getStrategyByProvider(provider);

    await strategy.delete(result.storageKey);
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

  //xác định nơi lưu trữ
  private getProvider(url: string): StorageProvider {
    if (url.includes('cloudinary')) {
      return StorageProvider.CLOUDINARY;
    }

    if (url.includes('supabase')) {
      return StorageProvider.SUPABASE;
    }

    return StorageProvider.LOCAL;
  }

  async deleteFileById(fileId: string) {
    //1. lấy file từ DB
    const file = await this.filesService.findById(fileId);

    //2. lấy strategy đúng
    const strategy = this.uploadFactory.getStrategyByProvider(file.provider);

    //3.xóa file vật lý
    await strategy.delete(file.storageKey, file.resourceType);

    //4. xóa DB
    await this.filesService.deleteRecord(fileId);
    return { message: 'Delete file success' };
  }
}
