import { Injectable } from '@nestjs/common';
import { UploadOptions } from '../interfaces/storage-strategy.interface';
import { UploadFactory } from '../upload.factory';

@Injectable()
export class FileUploadService {
  constructor(private readonly uploadFactory: UploadFactory) {}

  async upload(file: Express.Multer.File, options?: UploadOptions) {
    const strategy = this.uploadFactory.getFileStrategy();
    return strategy.upload(file, options);
  }
}
