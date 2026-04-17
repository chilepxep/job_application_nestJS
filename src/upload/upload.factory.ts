import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageType } from './constants/storage.constant';
import { IStorageStrategy } from './interfaces/storage-strategy.interface';

import { LocalStrategy } from './strategies/local.strategy';

@Injectable()
export class UploadFactory {
  private readonly logger = new Logger(UploadFactory.name);
  constructor(
    private readonly configService: ConfigService,
    // private readonly cloudinaryStrategy: CloudinaryStrategy,
    private readonly localStrategy: LocalStrategy,
    // private readonly supabaseStrategy: SupabaseStrategy,
  ) {}

  getImageStrategy(): IStorageStrategy {
    const type = this.configService.get<StorageType>('upload.imageStorage');
    this.logger.log(`Image storage strategy: ${type}`);
    switch (type) {
      case StorageType.CLOUDINARY:
        console.log('Using cloudinary strategy');
        return this.localStrategy;

      case StorageType.LOCAL:
        console.log('Using local strategy');
        return this.localStrategy;
      default:
        return this.localStrategy;
    }
  }

  getFileStrategy(): IStorageStrategy {
    const type = this.configService.get<StorageType>('upload.fileStorage');
    this.logger.log(`Image storage strategy: ${type}`);
    switch (type) {
      case StorageType.SUPABASE:
        console.log('Using Supabase strategy');
        return this.localStrategy; // tạm thời

      case StorageType.LOCAL:
        console.log('Using local strategy');
        return this.localStrategy;
      default:
        return this.localStrategy;
    }
  }
}
