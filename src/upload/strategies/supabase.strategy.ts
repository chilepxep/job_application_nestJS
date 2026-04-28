import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  IStorageStrategy,
  UploadOptions,
  UploadResult,
} from '../interfaces/storage-strategy.interface';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SupabaseStrategy implements IStorageStrategy {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('upload.supabase.url');
    const key = this.configService.get<string>('upload.supabase.key');
    this.supabase = createClient(url, key);
    this.bucket = this.configService.get<string>('upload.supabase.bucket');
  }

  async upload(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      const folder = options?.folder || 'cv';
      const userId = options?.userId || 'anonymous';

      const ext = path.extname(file.originalname);
      const fileName = `${uuidv4()}${ext}`;

      const storageKey = `${folder}/${userId}/${fileName}`;

      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(storageKey, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      const { data, error: signedError } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(storageKey, 60 * 60); //1h

      if (signedError) {
        throw new Error(signedError.message);
      }

      return {
        url: data.signedUrl, //URL tạm
        storageKey, //dùng để delete
        fileName,
        size: file.size,
        mimetype: file.mimetype,
        resourceType: 'application',
      };
    } catch (error) {
      throw new InternalServerErrorException('Upload to Supabase failed');
    }
  }

  async delete(key: string, resourceType?: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([key]);

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      throw new InternalServerErrorException('Delete from Supabase failed');
    }
  }

  async getSignedUrl(storageKey: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresIn);

    if (error)
      throw new InternalServerErrorException('Không thể tạo signed URL');

    return data.signedUrl;
  }
}
