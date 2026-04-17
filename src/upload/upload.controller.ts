import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { Public } from '../decorator/customize';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from './pipes/file-validation.pipe';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Public()
  @Post('test-upload')
  @UseInterceptors(FileInterceptor('file'))
  async testUpload(
    @UploadedFile(
      new FileValidationPipe({
        maxSizeMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.uploadService.uploadImage(file, {
      folder: 'logo',
    });
  }

  @Public()
  @Post('test-upload-cv')
  @UseInterceptors(FileInterceptor('file'))
  async testUploadCV(
    @UploadedFile(
      new FileValidationPipe({
        maxSizeMB: 5,
        allowedMimeTypes: ['application/pdf'],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.uploadService.uploadFile(file, {
      folder: 'cv',
      userId: 'user123',
    });
  }
}
