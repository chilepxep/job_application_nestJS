import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { ImageUploadService } from './services/image-upload.service';
import { FileUploadService } from './services/file-upload.service';
import { UploadFactory } from './upload.factory';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [
    UploadService,
    ImageUploadService,
    FileUploadService,
    UploadFactory,
    LocalStrategy,
    // CloudinaryStrategy (sau)
    // SupabaseStrategy (sau)
  ],
})
export class UploadModule {}
