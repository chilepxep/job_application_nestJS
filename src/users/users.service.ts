import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schemas';
import mongoose, { Model } from 'mongoose';
import { RolesService } from 'src/roles/roles.service';
import { CompaniesService } from 'src/companies/companies.service';
import bcrypt from 'bcrypt';
import { IUser } from 'src/common/interfaces/user.interface';
import { QueryUserDto } from './dto/query-user.dto';
import { SortOrder } from 'src/permissions/dto/query-permission.dto';
import {
  UpdateCandidateProfileDto,
  UpdateHrProfileDto,
  UpdateMeDto,
} from './dto/update-me.dto';
import { ProfileStrategyRegistry } from 'src/common/strategies/profile/profile-strategy.registry';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    private rolesService: RolesService,
    private companiesService: CompaniesService,
    private profileStrategyRegistry: ProfileStrategyRegistry,
  ) {}

  //========================HELPER===============================

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private validateObjectId(id: string, field = 'ID') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${field} không hợp lệ`);
    }
  }

  private buildNestedUpdate(
    prefix: string,
    obj: Record<string, any>,
  ): Record<string, any> {
    const result: any = {};
    Object.keys(obj).forEach((key) => {
      result[`${prefix}.${key}`] = obj[key];
    });
    return result;
  }

  //lấy rolename
  private getRoleName(user: UserDocument): string {
    return (user.role as any)?.name ?? '';
  }

  //========================SERVICE===============================

  async create(dto: CreateUserDto, admin: IUser) {
    const { email, password, role, profile } = dto;

    // Kiểm tra email đã tồn tại chưa
    const existed = await this.userModel.exists({ email });
    if (existed) {
      throw new ConflictException(`Email ${email} đã tồn tại`);
    }

    // Kiểm tra role tồn tại + lấy thông tin role
    this.validateObjectId(role, 'Role ID');
    const roleDoc = await this.rolesService.findOne(role);

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Lấy strategy theo role → khởi tạo đúng profile
    // CANDIDATE → { candidateProfile: {...}, hrProfile: null }
    // HR        → { hrProfile: {...}, candidateProfile: null }
    // ADMIN     → { candidateProfile: null, hrProfile: null }
    const strategy = this.profileStrategyRegistry.getStrategy(roleDoc.name);
    const profileData = strategy.initProfile();

    const user = await this.userModel.create({
      email,
      password: hashedPassword,
      role: roleDoc._id,
      profile: profile ?? {},
      ...profileData, // ← spread profile đúng theo role
      createdBy: { _id: admin._id, email: admin.email },
    });

    return {
      _id: user._id,
      email: user.email,
      role: roleDoc.name,
      createdAt: user.createdAt,
    };
  }

  async findAll(query: QueryUserDto) {
    const {
      page = 1,
      limit = 10,
      name,
      role,
      isActive,
      isDeleted,
      sort,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (name)
      filter['profile.fullName'] = { $regex: `^${name}`, $options: 'i' };
    if (role) {
      this.validateObjectId(role, 'Role ID');
      filter.role = new mongoose.Types.ObjectId(role);
    }
    if (isActive !== undefined) filter.isActive = isActive;

    if (isDeleted === true) {
      const matchFilter: any = { isDeleted: true };
      if (name)
        matchFilter['profile.fullName'] = { $regex: `^${name}`, $options: 'i' };
      if (role) matchFilter.role = new mongoose.Types.ObjectId(role);
      if (isActive !== undefined) matchFilter.isActive = isActive;

      const [data, total] = await Promise.all([
        this.userModel.aggregate([
          { $match: matchFilter },
          {
            $lookup: {
              from: 'roles',
              localField: 'role',
              foreignField: '_id',
              as: 'role',
              pipeline: [{ $project: { name: 1 } }],
            },
          },
          { $unwind: { path: '$role', preserveNullAndEmptyArrays: true } },
          { $sort: { createdAt: sort === SortOrder.ASC ? 1 : -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: { __v: 0, password: 0, refreshToken: 0 } },
        ]),
        this.userModel.aggregate([
          { $match: matchFilter },
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

    // Query bình thường
    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .populate({ path: 'role', select: 'name' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        .select('-__v -password -refreshToken'),
      this.userModel.countDocuments({ ...filter, isDeleted: { $ne: true } }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  async findOne(id: string): Promise<UserDocument> {
    this.validateObjectId(id);

    // query cơ bản trước
    const user = await this.userModel
      .findById(id)
      .populate({ path: 'role', select: 'name description' })
      .select('-__v -password -refreshToken')
      .exec();

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    // chỉ populate company nếu là HR
    if (user.hrProfile?.company) {
      await user.populate({
        path: 'hrProfile.company',
        select: 'name logo industry',
      });
    }

    return user;
  }

  //dùng cho auth service
  async findByEmail(email: string): Promise<UserDocument | null> {
    return (
      this.userModel
        .findOne({ email: email.toLowerCase() })
        // populate role + permissions để JwtAuthGuard dùng
        .populate({
          path: 'role',
          populate: { path: 'permissions', select: 'apiPath method' },
        })
        .select('+password') // lấy password để verify lúc login
        .exec()
    );
  }

  //user xem profile chính mình -  lấy từ JWT token
  async findMe(userId: string): Promise<UserDocument> {
    this.validateObjectId(userId);

    const user = await this.userModel
      .findById(userId)
      .populate({ path: 'role', select: 'name' })
      .populate({
        path: 'hrProfile.company',
        select: 'name logo website industry',
      })
      .select('-__v -password -refreshToken')
      .exec();

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    return user;
  }

  //candidate/hr tự update profile
  async updateMe(userId: string, dto: UpdateMeDto, user: IUser) {
    this.validateObjectId(userId);

    const currentUser = await this.findMe(userId);
    let updateData: any = {};

    // Update profile chung — tất cả role
    if (dto.profile) {
      updateData = {
        ...updateData,
        ...this.buildNestedUpdate('profile', dto.profile),
      };
    }

    // Lấy role name để tìm strategy
    const roleName = this.getRoleName(currentUser);
    const strategy = this.profileStrategyRegistry.getStrategy(roleName);

    // Lấy dto tương ứng với role
    // CANDIDATE → dto.candidateProfile
    // HR        → dto.hrProfile
    // ADMIN     → null (không có profile riêng)
    const roleDto = dto.candidateProfile ?? dto.hrProfile ?? null;

    if (roleDto) {
      // Kiểm tra user có gửi đúng profile cho role không
      // VD: HR gửi candidateProfile → báo lỗi
      if (dto.candidateProfile && roleName !== 'CANDIDATE') {
        throw new ForbiddenException(
          'Chỉ Candidate mới update được candidateProfile',
        );
      }
      if (dto.hrProfile && roleName !== 'HR') {
        throw new ForbiddenException('Chỉ HR mới update được hrProfile');
      }

      const roleUpdate = await strategy.buildUpdate(roleDto, currentUser);
      updateData = { ...updateData, ...roleUpdate };
    }

    const updated = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            ...updateData,
            updatedBy: { _id: user._id, email: user.email },
          },
        },
        { returnDocument: 'after' },
      )
      .populate({ path: 'role', select: 'name' })
      .select('-__v -password -refreshToken');

    if (!updated) {
      throw new NotFoundException('Không tìm thấy user');
    }

    return updated;
  }

  async update(id: string, dto: UpdateUserDto, admin: IUser) {
    this.validateObjectId(id);

    const currentUser = await this.findOne(id);
    const roleName = this.getRoleName(currentUser);

    let updateData: any = {};

    // Update profile chung
    if (dto.profile) {
      updateData = {
        ...updateData,
        ...this.buildNestedUpdate('profile', dto.profile),
      };
    }

    // Lấy strategy theo role hiện tại của user
    const strategy = this.profileStrategyRegistry.getStrategy(roleName);

    // Update candidateProfile
    if (dto.candidateProfile) {
      if (roleName !== 'CANDIDATE') {
        throw new BadRequestException('User này không phải Candidate');
      }
      const candidateUpdate = await strategy.buildUpdate(
        dto.candidateProfile,
        currentUser,
      );
      updateData = { ...updateData, ...candidateUpdate };
    }

    // Update hrProfile
    if (dto.hrProfile) {
      if (roleName !== 'HR') {
        throw new BadRequestException('User này không phải HR');
      }
      const hrUpdate = await strategy.buildUpdate(dto.hrProfile, currentUser);
      updateData = { ...updateData, ...hrUpdate };
    }

    // Update role — Admin đổi role user
    if (dto.role) {
      this.validateObjectId(dto.role, 'Role ID');
      const newRoleDoc = await this.rolesService.findOne(dto.role);

      // Khi đổi role → reset profile cũ, khởi tạo profile mới
      // VD: CANDIDATE → HR thì xoá candidateProfile, tạo hrProfile
      const newStrategy = this.profileStrategyRegistry.getStrategy(
        newRoleDoc.name,
      );
      const newProfileData = newStrategy.initProfile();

      updateData = { ...updateData, role: newRoleDoc._id, ...newProfileData };
    }

    // Update isActive
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            ...updateData,
            updatedBy: { _id: admin._id, email: admin.email },
          },
        },
        { returnDocument: 'after' },
      )
      .populate({ path: 'role', select: 'name' })
      .select('-__v -password -refreshToken');

    if (!updated) {
      throw new NotFoundException('Không tìm thấy user');
    }

    return updated;
  }

  async toggleActive(id: string, admin: IUser) {
    this.validateObjectId(id);

    const user = await this.findOne(id);

    // Đảo ngược trạng thái isActive
    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          isActive: !user.isActive,
          updatedBy: { _id: admin._id, email: admin.email },
        },
        { returnDocument: 'after' },
      )
      .select('-__v -password -refreshToken');

    return {
      _id: updated._id,
      email: updated.email,
      isActive: updated.isActive,
      message: updated.isActive
        ? 'Mở khoá tài khoản thành công'
        : 'Khoá tài khoản thành công',
    };
  }

  async remove(id: string, admin: IUser) {
    this.validateObjectId(id);

    await this.findOne(id);

    await this.userModel.updateOne(
      { _id: id },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: { _id: admin._id, email: admin.email },
      },
    );

    return { message: 'Xoá user thành công' };
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    // Hash refresh token trước khi lưu
    // Lý do: nếu DB bị leak, attacker không dùng được refresh token
    const hashed = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;

    await this.userModel.updateOne({ _id: userId }, { refreshToken: hashed });
  }

  // PATCH /api/v1/users/:id/reset-password
  // → Gửi email reset password (làm sau khi có Mail Module)
  async sendResetPassword(id: string, admin: IUser) {
    const user = await this.findOne(id);

    // Tạo reset token ngẫu nhiên
    // Lưu vào DB kèm expiredAt
    // Gửi email chứa link reset
    // → Làm sau khi có Mail Module

    return { message: `Đã gửi email reset password đến ${user.email}` };
  }
}
