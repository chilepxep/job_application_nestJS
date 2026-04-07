import {
  BadRequestException,
  ForbiddenException,
  Injectable,
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

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name)
    private companyModel: Model<CompaniesDocument>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto, user: IUser) {
    const isActive =
      user.role.name === 'ADMIN'
        ? (createCompanyDto.isActive ?? true) // Admin không truyền → true
        : false;
    const company = await this.companyModel.create({
      ...createCompanyDto,
      isActive, // ← đặt sau spread để override
      createdByUser: user._id,
      createdBy: { _id: user._id, email: user.email },
    });

    return {
      _id: company._id,
      name: company.name,
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
      throw new BadRequestException('ID không hợp lệ');
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

    // HR chỉ được update công ty do mình tạo
    if (
      user.role.name !== 'ADMIN' &&
      company.createdByUser?.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Bạn không có quyền cập nhật công ty này');
    }

    // HR không được tự set isActive
    if (user.role.name !== 'ADMIN') {
      delete dto.isActive;
    }

    const updated = await this.companyModel
      .findByIdAndUpdate(
        id,
        {
          ...dto,
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
