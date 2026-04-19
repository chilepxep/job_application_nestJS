import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import {
  IStorageStrategy,
  UploadOptions,
  UploadResult,
} from '../interfaces/storage-strategy.interface';
import { Readable } from 'stream';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class CloudinaryStrategy implements IStorageStrategy {
  constructor(private readonly configService: ConfigService) {}
  onModuleInit() {
    cloudinary.config({
      cloud_name: this.configService.get('upload.cloudinary.cloudName'),
      api_key: this.configService.get('upload.cloudinary.apiKey'),
      api_secret: this.configService.get('upload.cloudinary.apiSecret'),
    });
  }

  upload(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const folder = options?.folder || 'others';
    const userId = options?.userId;

    const finalFolder = userId ? `${folder}/${userId}` : folder;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: finalFolder,
          //tự động nhận diện ảnh, video,...
          resource_type: 'auto',

          transformation: [
            { width: 500, height: 500, crop: 'limit' },
            { quality: 'auto' },
            //convert sang webp nếu cần
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            return reject(
              new InternalServerErrorException('Upload to Cloudinary failed'),
            );
          }
          resolve({
            //https
            url: result.secure_url,
            resourceType: result.resource_type,
            storageKey: result.public_id,
            fileName: result.public_id,
            size: result.bytes,
            mimetype: `${result.resource_type}/${result.format}`,
          });
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async delete(key: string, resourceType: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(key, {
        invalidate: true,
        resource_type: resourceType,
      });

      //ok hoặc không tồn tại đều coi như thành công
      if (result.result === 'ok' || result.result === 'not found') {
        return true;
      }

      throw new Error(`Cloudinary delete failed: ${result.result}`);
    } catch (error) {
      throw new Error('Delete from Cloudinary failed');
    }
  }
}
