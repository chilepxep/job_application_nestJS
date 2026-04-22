import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { ImageUploadService } from './services/image-upload.service';
import { FileUploadService } from './services/file-upload.service';
import { UploadFactory } from './upload.factory';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryStrategy } from './strategies/cloudinary.strategy';
import { UploadCleanupService } from './upload-cleanup.service';
import { FilesModule } from '../files/files.module';
import { SupabaseStrategy } from './strategies/supabase.strategy';

@Module({
  imports: [ConfigModule, FilesModule],
  controllers: [UploadController],
  providers: [
    UploadService,
    ImageUploadService,
    FileUploadService,
    UploadFactory,
    LocalStrategy,
    CloudinaryStrategy,
    UploadCleanupService,
    SupabaseStrategy,
  ],
  exports: [UploadService],
})
export class UploadModule {}
