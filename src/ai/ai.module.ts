import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Application,
  ApplicationSchema,
} from '../application/schemas/application.schema';
import { FilesModule } from '../files/files.module';
import { UploadModule } from '../upload/upload.module';
import { GeminiProvider } from './providers/gemini.provider';
import { CvExtractService } from './services/cv-extract.service';
import { AiMatchingService } from './services/ai-matching.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
    ]),
    FilesModule,
    UploadModule,
  ],
  providers: [GeminiProvider, CvExtractService, AiMatchingService],
  exports: [CvExtractService, AiMatchingService],
})
export class AiModule {}
