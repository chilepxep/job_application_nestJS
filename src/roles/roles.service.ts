import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Role, RoleDocument } from './schemas/role.schemas';
import mongoose, { Model } from 'mongoose';

import { QueryRoleDto } from './dto/query-role.dto';
import { SortOrder } from '../permissions/dto/query-permission.dto';
import { IUser } from '../common/interfaces/user.interface';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,
  ) {}

  async create(createRoleDto: CreateRoleDto, user: IUser) {
    const { name, description, isActive, permissions } = createRoleDto;
    const existed = await this.roleModel.findOne({
      name: name.toLocaleUpperCase(),
    });
    if (existed) {
      throw new ConflictException(`Role ${name.toUpperCase()} đã tồn tại`);
    }
    const role = await this.roleModel.create({
      name,
      description,
      isActive,
      permissions: permissions.map((id) => new mongoose.Types.ObjectId(id)),
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });
  }

  async findAll(query: QueryRoleDto) {
    const { page = 1, limit = 10, isActive, isDeleted, sort } = query;

    const skip = (page - 1) * limit;

    //tạo filter động
    const filter: any = {};

    //lọc theo trạng thái active
    if (isActive !== undefined) filter.isActive = isActive;

    //dùng aggregate để xem role bị xoá
    if (isDeleted === true) {
      //chạy song song vừa query data vừa query count
      const [data, total] = await Promise.all([
        this.roleModel.aggregate([
          {
            //lấy thêm trường isActive
            $match: {
              isDeleted: true,
              ...(isActive !== undefined && { isActive }),
            },
          },
          //join với permission
          {
            $lookup: {
              from: 'permissions', // tên collection trong MongoDB
              localField: 'permissions', // field trong Role
              foreignField: '_id', // field trong Permission
              as: 'permissions', // tên field sau khi join
            },
          },
          //1=ASC -1 DESC
          { $sort: { createdAt: sort === SortOrder.ASC ? 1 : -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: { __v: 0 } },
        ]),
        //đếm tổng record
        this.roleModel.aggregate([
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

    const [data, total] = await Promise.all([
      this.roleModel
        .find(filter)
        .populate({
          path: 'permissions',
          // Chỉ lấy các field cần thiết, bỏ __v
          select: 'name apiPath method module -_id',
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        .select('-__v'),
      this.roleModel.countDocuments({ ...filter, isDeleted: { $ne: true } }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const role = await this.roleModel
      .findById(id)
      .populate({
        path: 'permissions',
        select: 'name apiPath method module',
      })
      .select('-__v')
      .exec();

    if (!role) {
      throw new NotFoundException('Không tìm thấy role');
    }
    return role;
  }

  async update(id: string, dto: UpdateRoleDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    // $ne: id để loại trừ chính role đang update
    if (dto.name) {
      const existed = await this.roleModel.findOne({
        name: dto.name.toUpperCase(),
        _id: { $ne: id },
      });
      if (existed) {
        throw new ConflictException(
          `Role ${dto.name.toUpperCase()} đã tồn tại`,
        );
      }
    }

    const updated = await this.roleModel
      .findByIdAndUpdate(
        id,
        {
          ...dto,
          updatedBy: { _id: user._id, email: user.email },
        },
        { returnDocument: 'after' }, // trả về doc sau khi update
      )
      .populate({ path: 'permissions', select: 'name apiPath method module' })
      .select('-__v');

    if (!updated) {
      throw new NotFoundException('Không tìm thấy role');
    }

    return updated;
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    await this.findOne(id);

    await this.roleModel.updateOne(
      { _id: id },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: { _id: user._id, email: user.email },
      },
    );
    return { message: 'Xoá role thành công' };
  }

  // FIND BY NAME — dùng nội bộ (auth, guard)
  async findByName(name: string): Promise<RoleDocument | null> {
    return this.roleModel
      .findOne({ name: name.toUpperCase() })
      .populate({
        path: 'permissions',
        // Chỉ lấy field cần thiết cho PermissionGuard
        select: 'apiPath method',
      })
      .exec();
  }

  //thêm mới permissions cho role
  async addPermissions(id: string, permissionIds: string[], user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    // Kiểm tra role tồn tại
    await this.findOne(id);

    const updated = await this.roleModel
      .findByIdAndUpdate(
        id,
        {
          // $addToSet: thêm vào mảng nhưng không tạo duplicate
          $addToSet: {
            permissions: {
              $each: permissionIds.map(
                (pid) => new mongoose.Types.ObjectId(pid),
              ),
            },
          },
          updatedBy: { _id: user._id, email: user.email },
        },
        { returnDocument: 'after' },
      )
      .populate({ path: 'permissions', select: 'name apiPath method module' })
      .select('-__v');

    return updated;
  }

  //xoá permissions khỏi role
  async removePermissions(id: string, permissionIds: string[], user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    // Kiểm tra role tồn tại
    await this.findOne(id);

    const updated = await this.roleModel
      .findByIdAndUpdate(
        id,
        {
          // $pull: xoá các phần tử khỏi mảng thoả điều kiện $in
          $pull: {
            permissions: {
              $in: permissionIds.map((pid) => new mongoose.Types.ObjectId(pid)),
            },
          },
          updatedBy: { _id: user._id, email: user.email },
        },
        { returnDocument: 'after' },
      )
      .populate({ path: 'permissions', select: 'name apiPath method module' })
      .select('-__v');

    return updated;
  }
}
