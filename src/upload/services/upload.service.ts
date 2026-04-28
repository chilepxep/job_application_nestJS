import { Injectable } from '@nestjs/common';
import { UploadOptions } from '../interfaces/storage-strategy.interface';
import { ImageUploadService } from './image-upload.service';
import { FileUploadService } from './file-upload.service';

@Injectable()
export class UploadService {
  constructor(
    private readonly imageUploadService: ImageUploadService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  uploadImage(file: Express.Multer.File, options?: UploadOptions) {
    return this.imageUploadService.upload(file, options);
  }

  uploadFile(file: Express.Multer.File, options?: UploadOptions) {
    return this.fileUploadService.upload(file, options);
  }
}
