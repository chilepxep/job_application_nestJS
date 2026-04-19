import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectModel } from '@nestjs/mongoose';
import { CompaniesDocument, Company } from './schemas/company.schema';
import mongoose, { Model } from 'mongoose';

import { QueryCompanyDto } from './dto/query-company.dto';
import { IUser } from '../common/interfaces/user.interface';
import { SortOrder } from '../permissions/dto/query-permission.dto';
import { FilesService } from '../files/files.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);
  constructor(
    @InjectModel(Company.name)
    private companyModel: Model<CompaniesDocument>,
    private filesService: FilesService,
    private uploadService: UploadService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto, user: IUser) {
    const { logoId, ...rest } = createCompanyDto;
    const isActive =
      user.role.name === 'ADMIN'
        ? (createCompanyDto.isActive ?? true) // Admin không truyền → true
        : false;
    let logoUrl: string | undefined;
    let logoFileId: any = null;

    if (logoId) {
      const file = await this.filesService.validateForUse(
        logoId,
        user._id.toString(),
      );

      logoUrl = file.url;
      logoFileId = file._id;
    }
    const company = await this.companyModel.create({
      ...rest,
      logo: logoUrl,
      logoFileId,
      isActive, // ← đặt sau spread để override
      createdByUser: user._id,
      createdBy: { _id: user._id, email: user.email },
    });

    if (logoId) {
      await this.filesService.markAsActive(logoId, company._id.toString());
    }

    return {
      _id: company._id,
      name: company.name,
      logo: company.logo,
      isActive: company.isActive,
      createdAt: company.createdAt,
    };
  }

  //dành cho Candidate
  async findAllPublic(query: QueryCompanyDto) {
    const { page = 1, limit = 10, name, industry, city, sort } = query;
    const skip = (page - 1) * limit;

    // Chỉ lấy company đã được Admin duyệt
    const filter: any = { isActive: true };

    if (name) filter.name = { $regex: name, $options: 'i' };
    if (industry) filter.industry = { $regex: industry, $options: 'i' };
    if (city) filter['address.city'] = { $regex: city, $options: 'i' };

    const [data, total] = await Promise.all([
      this.companyModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        // Ẩn thông tin nhạy cảm với public
        .select('-__v -createdBy -updatedBy -deletedBy -createdByUser'),
      this.companyModel.countDocuments({ ...filter, isDeleted: { $ne: true } }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  //dành cho Admin
  async findAllAdmin(query: QueryCompanyDto) {
    const {
      page = 1,
      limit = 10,
      name,
      industry,
      city,
      isActive,
      isDeleted,
      sort,
    } = query;
    const skip = (page - 1) * limit;

    // Xem company đã xoá → bypass pre hook bằng aggregate
    if (isDeleted === true) {
      const matchFilter: any = { isDeleted: true };
      if (name) matchFilter.name = { $regex: name, $options: 'i' };
      if (industry) matchFilter.industry = { $regex: industry, $options: 'i' };

      const [data, total] = await Promise.all([
        this.companyModel.aggregate([
          { $match: matchFilter },
          { $sort: { createdAt: sort === SortOrder.ASC ? 1 : -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: { __v: 0 } },
        ]),
        this.companyModel.aggregate([
          { $match: { isDeleted: true } },
          { $count: 'total' },
        ]),
      ]);

      return {
        meta: {
          page,
          limit,
          total: total[0]?.total ?? 0,
          totalPages: Math.ceil((total[0]?.total ?? 0) / limit),
        },
        data,
      };
    }

    // Query bình thường — Admin thấy tất cả isActive: true/false
    const filter: any = {};
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (industry) filter.industry = { $regex: industry, $options: 'i' };
    if (city) filter['address.city'] = { $regex: city, $options: 'i' };
    if (isActive !== undefined) filter.isActive = isActive;

    const [data, total] = await Promise.all([
      this.companyModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        .select('-__v'),
      this.companyModel.countDocuments({ ...filter, isDeleted: { $ne: true } }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  //xem chi tiết công ty
  async findOne(id: string): Promise<CompaniesDocument> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID vvv không hợp lệ');
    }

    const company = await this.companyModel.findById(id).select('-__v').exec();

    if (!company) {
      throw new NotFoundException('Không tìm thấy công ty');
    }

    return company;
  }

  // HR chỉ update công ty của mình
  // Admin update bất kỳ
  // ───────────────────────────────────────────
  async update(id: string, dto: UpdateCompanyDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const company = await this.findOne(id);

    // Phân quyền
    if (
      user.role.name !== 'ADMIN' &&
      company.createdByUser?.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Bạn không có quyền cập nhật công ty này');
    }

    // Tách dto, không mutate tham số đầu vào
    const { logoId, isActive, ...rest } = dto;
    const safeFields =
      user.role.name === 'ADMIN' ? { ...rest, isActive } : rest;

    // Xử lý logo
    const isSameLogo = logoId && company.logoFileId?.toString() === logoId;

    let newLogoUrl = company.logo;
    let newLogoFileId = company.logoFileId;

    if (logoId && !isSameLogo) {
      // ADMIN có thể update logo của bất kỳ ai → không check owner
      const file =
        user.role.name === 'ADMIN'
          ? await this.filesService.findById(logoId)
          : await this.filesService.validateForUse(logoId, user._id.toString());

      if (!file) {
        throw new BadRequestException('File logo không hợp lệ');
      }

      newLogoUrl = file.url;
      newLogoFileId = file._id;
    }

    const updated = await this.companyModel
      .findByIdAndUpdate(
        id,
        {
          ...safeFields,
          logo: newLogoUrl,
          logoFileId: newLogoFileId,
          updatedBy: { _id: user._id, email: user.email },
        },
        { returnDocument: 'after' },
      )
      .select('-__v')
      .lean();

    if (!updated) {
      throw new NotFoundException('Không tìm thấy công ty');
    }

    // Xử lý file sau khi update DB thành công
    if (logoId && !isSameLogo) {
      // 1. Mark file mới là ACTIVE
      await this.filesService.markAsActive(logoId, updated._id.toString());

      // 2. Xóa logo cũ nếu có — lỗi chỉ log
      if (company.logoFileId) {
        try {
          await this.uploadService.deleteFileById(
            company.logoFileId.toString(),
          );
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.logger.warn(
            `[CompanyService] Không xóa được logo cũ (id=${company.logoFileId}): ${error.message}`,
            error.stack,
          );
        }
      }
    }

    return updated;
  }

  //xoá công ty
  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const company = await this.findOne(id);

    // HR chỉ được xoá công ty do mình tạo
    if (
      user.role.name !== 'ADMIN' &&
      company.createdByUser?.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Bạn không có quyền xoá công ty này');
    }

    await this.companyModel.updateOne(
      { _id: id },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: { _id: user._id, email: user.email },
      },
    );

    return { message: 'Xoá công ty thành công' };
  }

  //ADMIN duyệt công ty
  async approve(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const updated = await this.companyModel
      .findByIdAndUpdate(
        id,
        {
          isActive: true,
          updatedBy: { _id: user._id, email: user.email },
        },
        { returnDocument: 'after' },
      )
      .select('-__v');

    if (!updated) {
      throw new NotFoundException('Không tìm thấy công ty');
    }

    return updated;
  }
}
