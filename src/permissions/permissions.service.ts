import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import mongoose, { Model, Types } from 'mongoose';
import { IUser } from 'src/common/interfaces/user.interface';
import { QueryPermissionDto, SortOrder } from './dto/query-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto, user: IUser) {
    const { name, apiPath, method, module } = createPermissionDto;
    const existed = await this.permissionModel.findOne({
      apiPath,
      method: method.toUpperCase(),
    });
    if (existed) {
      throw new ConflictException(
        `Permission ${method.toUpperCase()} ${apiPath} đã tồn tại`,
      );
    }
    const permission = await this.permissionModel.create({
      name,
      apiPath,
      method,
      module,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });
    return {
      _id: permission._id,
      createdAt: permission.createdAt,
    };
  }

  async findAll(query: QueryPermissionDto) {
    const { page = 1, limit = 10, module, method, isDeleted, sort } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Lọc theo module
    if (module) filter.module = module.toUpperCase();

    // Lọc theo method
    if (method) filter.method = method.toUpperCase();

    // Lọc theo isDeleted
    // Mặc định pre hook đã filter isDeleted: false
    // Nếu muốn xem docs đã xoá → dùng aggregate để bypass pre hook
    if (isDeleted === true) {
      const [data, total] = await Promise.all([
        this.permissionModel.aggregate([
          {
            $match: {
              isDeleted: true,
              ...(module && { module: module.toUpperCase() }),
              ...(method && { method: method.toUpperCase() }),
            },
          },
          { $sort: { createdAt: sort === SortOrder.ASC ? 1 : -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: { __v: 0 } },
        ]),
        this.permissionModel.aggregate([
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

    // Query bình thường — pre hook tự filter isDeleted: false
    const [data, total] = await Promise.all([
      this.permissionModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        .select('-__v'),
      this.permissionModel.countDocuments(filter),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data,
    };
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const permission = await this.permissionModel.findById(id).select('-__v');

    if (!permission) {
      throw new NotFoundException('Không tìm thấy permission');
    }

    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    // kiểm tra trùng
    if (dto.apiPath || dto.method) {
      const current = await this.findOne(id);

      const apiPath = dto.apiPath ?? current.apiPath;
      const method = dto.method ?? current.method;

      const existed = await this.permissionModel.findOne({
        apiPath,
        method: method.toUpperCase(),
        _id: { $ne: id }, // loại trừ chính nó
      });

      if (existed) {
        throw new ConflictException(
          `Permission ${method.toUpperCase()} ${apiPath} đã tồn tại`,
        );
      }
    }

    const updated = await this.permissionModel
      .findByIdAndUpdate(
        id,
        {
          ...dto,
          updatedBy: { _id: user._id, email: user.email },
        },
        { returnDocument: 'after' }, // trả về doc sau khi update
      )
      .select('-__v');

    if (!updated) {
      throw new NotFoundException('Không tìm thấy permission');
    }

    return updated;
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const existed = await this.findOne(id);
    if (!existed) {
      throw new NotFoundException('Không tìm thấy permission');
    }

    await this.permissionModel.updateOne(
      { _id: id },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: { _id: user._id, email: user.email },
      },
    );

    return { message: 'Xoá permission thành công' };
  }
}
