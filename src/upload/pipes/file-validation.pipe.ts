import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

export interface FileValidationOptions {
  maxSizeMB: number;
  allowedMimeTypes: string[];
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly options: FileValidationOptions) {}

  transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
    if (!file) {
      throw new BadRequestException('Vui lòng đính kèm file');
    }

    const maxSizeBytes = this.options.maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File không được vượt quá ${this.options.maxSizeMB}MB `,
      );
    }

    if (!this.options.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File sai định dạng, chỉ chấp nhận: ${this.options.allowedMimeTypes.join(', ')}`,
      );
    }

    return file;
  }
}
