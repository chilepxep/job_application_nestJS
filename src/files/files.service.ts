import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { LocalStrategy } from '../upload/strategies/local.strategy';
import { CloudinaryStrategy } from '../upload/strategies/cloudinary.strategy';
import {
  FileDocument,
  FileStatus,
  StorageProvider,
} from './schemas/file.schema';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectModel(File.name)
    private readonly fileModel: Model<FileDocument>,
    private readonly configService: ConfigService,
  ) {}

  //tạo file khi upload với trạng thái TEMP
  async create(data: {
    url: string;
    storageKey: string;
    type: string;
    provider: StorageProvider;
    ownerId: any;
    resourceType?: string;
  }) {
    return this.fileModel.create({
      ...data,
      status: FileStatus.TEMP,
    });
  }

  //lấy file
  async findById(id: string) {
    const file = await this.fileModel.findById(id);

    if (!file) {
      throw new NotFoundException('File không tồn tại');
    }

    return file;
  }

  //validate trước khi dùng _ check dùng được không
  async validateForUse(fileId: string, userId: string) {
    const file = await this.findById(fileId);

    if (file.status !== FileStatus.TEMP) {
      throw new BadRequestException('File đã được sử dụng');
    }

    if (file.ownerId.toString() !== userId.toString()) {
      throw new BadRequestException('Không có quyền sử dụng file này');
    }

    return file;
  }

  //gán cho resource (company)
  async markAsActive(fileId: string, relatedId: string) {
    return this.fileModel.findByIdAndUpdate(
      fileId,
      {
        status: FileStatus.ACTIVE,
        relatedId,
      },
      { returnDocument: 'after' },
    );
  }

  //xoá trong DB
  async deleteRecord(fileId: string) {
    return this.fileModel.findByIdAndDelete(fileId);
  }

  async findTempFiles(threshold: Date) {
    return this.fileModel.find({
      status: FileStatus.TEMP,
      createdAt: { $lt: threshold },
    });
  }
}
