import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageType } from './constants/storage.constant';
import { IStorageStrategy } from './interfaces/storage-strategy.interface';

import { LocalStrategy } from './strategies/local.strategy';
import { CloudinaryStrategy } from './strategies/cloudinary.strategy';
import { StorageProvider } from '../files/schemas/file.schema';
import { SupabaseStrategy } from './strategies/supabase.strategy';

@Injectable()
export class UploadFactory {
  private readonly logger = new Logger(UploadFactory.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly cloudinaryStrategy: CloudinaryStrategy,
    private readonly localStrategy: LocalStrategy,
    private readonly supabaseStrategy: SupabaseStrategy,
  ) {}

  //chọn strategy khi upload Image
  getImageStrategy(): IStorageStrategy {
    const type = this.configService.get<StorageType>('upload.imageStorage');
    this.logger.log(`Image storage strategy: ${type}`);
    switch (type) {
      case StorageType.CLOUDINARY:
        console.log('Using cloudinary strategy');
        return this.cloudinaryStrategy;

      case StorageType.LOCAL:
        console.log('Using local strategy');
        return this.localStrategy;
      default:
        return this.localStrategy;
    }
  }

  //chọn strategy khi upload FILE (CV)
  getFileStrategy(): IStorageStrategy {
    const type = this.configService.get<StorageType>('upload.fileStorage');
    this.logger.log(`Image storage strategy: ${type}`);
    switch (type) {
      case StorageType.SUPABASE:
        console.log('Using Supabase strategy');
        return this.supabaseStrategy;

      case StorageType.LOCAL:
        console.log('Using local strategy');
        return this.localStrategy;
      default:
        return this.localStrategy;
    }
  }

  //dùng cho delete
  getStrategyByProvider(provider: StorageProvider): IStorageStrategy {
    switch (provider) {
      case StorageProvider.LOCAL:
        return this.localStrategy;

      case StorageProvider.CLOUDINARY:
        return this.cloudinaryStrategy;

      case StorageProvider.SUPABASE:
        return this.supabaseStrategy;

      default:
        throw new Error('Invalid provider');
    }
  }
}
