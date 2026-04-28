import 'multer';
export interface UploadResult {
  url: string;
  storageKey: string;
  fileName: string;
  size: number;
  mimetype: string;
  resourceType?: string;
}

export interface UploadOptions {
  folder?: string; // logo, cv, avatar...
  userId?: string; // để phân user
}

export interface IStorageStrategy {
  upload(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  delete(key: string, resourceType?: string): Promise<boolean>;
}
