import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schemas';
import mongoose, { ClientSession, Connection, Model } from 'mongoose';

import bcrypt from 'bcrypt';

import { QueryUserDto } from './dto/query-user.dto';

import {
  AddCvDto,
  ReplaceCvDto,
  UpdateCandidateProfileDto,
  UpdateHrProfileDto,
  UpdateMeDto,
} from './dto/update-me.dto';
import { RolesService } from '../roles/roles.service';
import { CompaniesService } from '../companies/companies.service';
import { ProfileStrategyRegistry } from '../common/strategies/profile/profile-strategy.registry';
import { IUser } from '../common/interfaces/user.interface';
import { SortOrder } from '../permissions/dto/query-permission.dto';
import { SubscriptionService } from './subscription.service';
import { FilesService } from '../files/files.service';
import { withTransaction } from '../common/helpers/with-transaction.helper';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private uploadService: UploadService,
    private rolesService: RolesService,
    private profileStrategyRegistry: ProfileStrategyRegistry,
    private subscriptionService: SubscriptionService,
    private filesService: FilesService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  //========================HELPER===============================

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private ensureCandidate(user: UserDocument): void {
    const roleName = this.getRoleName(user);
    if (roleName !== 'CANDIDATE') {
      throw new ForbiddenException(
        'Chỉ Candidate mới thực hiện được hành động này',
      );
    }
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

    const cvFileIds = dto.candidateProfile?.cvFileIds;

    const candidateProfileDto = dto.candidateProfile
      ? { ...dto.candidateProfile }
      : null;

    if (candidateProfileDto) {
      delete candidateProfileDto.cvFileIds;
    }

    const roleName = this.getRoleName(currentUser);
    const strategy = this.profileStrategyRegistry.getStrategy(roleName);

    if (dto.candidateProfile && roleName !== 'CANDIDATE') {
      throw new ForbiddenException(
        'Chỉ Candidate mới update được candidateProfile',
      );
    }

    if (dto.hrProfile && roleName !== 'HR') {
      throw new ForbiddenException('Chỉ HR mới update được hrProfile');
    }

    let updateData: any = {};

    // --- HANDLE CV UPLOAD ---
    if (cvFileIds && cvFileIds.length > 0) {
      const currentCvIds = currentUser.candidateProfile?.cvFileIds || [];
      const plan = currentUser.candidateProfile?.subscription?.plan || 'free';
      const limit = this.subscriptionService.getCvLimit(plan);

      if (currentCvIds.length + cvFileIds.length > limit) {
        throw new BadRequestException(`Bạn chỉ được upload tối đa ${limit} CV`);
      }

      for (const fileId of cvFileIds) {
        await this.filesService.validateForUse(fileId, user._id.toString());
      }

      updateData['candidateProfile.cvFileIds'] = [
        ...currentCvIds,
        ...cvFileIds,
      ];
    }

    // --- HANDLE profile chung ---
    if (dto.profile) {
      updateData = {
        ...updateData,
        ...this.buildNestedUpdate('profile', dto.profile),
      };
    }

    const roleDto = candidateProfileDto ?? dto.hrProfile ?? null;

    if (roleDto) {
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

    if (cvFileIds && cvFileIds.length > 0) {
      for (const fileId of cvFileIds) {
        await this.filesService.markAsActive(fileId, user._id.toString());
      }
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

  async findOneWithRefreshToken(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    const user = await this.userModel
      .findById(userId)
      .select('+refreshToken')
      .populate({
        path: 'role',
        select: 'name permissions',
        populate: {
          path: 'permissions',
          select: 'apiPath method',
        },
      })
      .exec();

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    return user;
  }

  async createFromAuth(data: {
    email: string;
    password: string; // đã hash
    role: string;
    profile: Partial<{
      fullName: string;
      phone: string;
      gender: string;
    }>;
    isActive?: boolean;
  }) {
    const { email, password, role, profile, isActive } = data;

    this.validateObjectId(role, 'Role ID');
    const roleDoc = await this.rolesService.findOne(role);

    // Lấy strategy theo role → khởi tạo đúng profile
    const strategy = this.profileStrategyRegistry.getStrategy(roleDoc.name);
    const profileData = strategy.initProfile();

    return this.userModel.create({
      email,
      password,
      role: roleDoc._id,
      profile: profile ?? {},
      ...profileData,
      isActive: isActive ?? true,
    });
  }

  // HR update company sau khi đăng ký
  async updateHrCompany(userId: string, companyId: string, position?: string) {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          'hrProfile.company': new mongoose.Types.ObjectId(companyId),
          ...(position && { 'hrProfile.position': position }),
        },
      },
    );
  }

  //thêm cv
  async addCv(userId: string, dto: AddCvDto, user: IUser) {
    const currentUser = await this.findMe(userId);
    this.ensureCandidate(currentUser);

    const currentCvIds = currentUser.candidateProfile?.cvFileIds || [];
    const plan = currentUser.candidateProfile?.subscription?.plan || 'free';
    const limit = this.subscriptionService.getCvLimit(plan);

    if (currentCvIds.length + dto.cvFileIds.length > limit) {
      throw new BadRequestException(`Bạn chỉ được upload tối đa ${limit} CV`);
    }

    // Validate tất cả file TRƯỚC khi mở transaction (chỉ đọc, không cần session)
    for (const fileId of dto.cvFileIds) {
      await this.filesService.validateForUse(fileId, userId);
    }

    return withTransaction(this.connection, async (session: ClientSession) => {
      const updated = await this.userModel
        .findByIdAndUpdate(
          userId,
          {
            $push: { 'candidateProfile.cvFileIds': { $each: dto.cvFileIds } },
            $set: { updatedBy: { _id: user._id, email: user.email } },
          },
          { returnDocument: 'after', session },
        )
        .populate({ path: 'role', select: 'name' })
        .select('-__v -password -refreshToken');

      if (!updated) throw new NotFoundException('Không tìm thấy user');

      for (const fileId of dto.cvFileIds) {
        await this.filesService.markAsActive(fileId, userId, session);
      }

      return updated;
    });
  }

  //xoá cv
  async removeCv(userId: string, fileId: string, user: IUser) {
    this.validateObjectId(fileId);

    const currentUser = await this.findMe(userId);
    this.ensureCandidate(currentUser);

    const fileObjectId = new mongoose.Types.ObjectId(fileId);

    const exists = currentUser.candidateProfile?.cvFileIds?.some(
      (id) => id.toString() === fileId,
    );

    if (!exists) {
      throw new NotFoundException('CV không tồn tại trong danh sách');
    }

    // lấy file trước
    const fileRecord = await this.filesService.findById(fileId);

    const updated = await withTransaction(
      this.connection,
      async (session: ClientSession) => {
        const result = await this.userModel
          .findByIdAndUpdate(
            userId,
            {
              $pull: { 'candidateProfile.cvFileIds': fileObjectId },
              $set: {
                updatedBy: { _id: user._id, email: user.email },
              },
            },
            { returnDocument: 'after', session },
          )
          .populate({ path: 'role', select: 'name' })
          .select('-__v -password -refreshToken');

        if (!result) throw new NotFoundException('Không tìm thấy user');

        await this.filesService.deleteRecord(fileId, session);

        return result;
      },
    );

    // 🔥 delete cloud OUTSIDE transaction
    try {
      await this.uploadService.deletePhysicalFile(
        fileRecord.storageKey,
        fileRecord.provider,
        fileRecord.resourceType,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);

      this.logger.warn(
        `Xóa cloud thất bại cho file ${fileId}: ${message} — sẽ cleanup sau`,
      );
    }

    return updated;
  }

  //thay đổi cv
  async replaceCv(
    userId: string,
    oldFileId: string,
    dto: ReplaceCvDto,
    user: IUser,
  ) {
    this.validateObjectId(oldFileId);

    const currentUser = await this.findMe(userId);
    this.ensureCandidate(currentUser);

    const cvIds = currentUser.candidateProfile?.cvFileIds || [];

    const index = cvIds.findIndex((id) => id.toString() === oldFileId);

    if (index === -1) {
      throw new NotFoundException('CV cần thay thế không tồn tại');
    }

    // validate file mới
    await this.filesService.validateForUse(dto.newFileId, userId);

    // lấy file cũ
    const oldFileRecord = await this.filesService.findById(oldFileId);

    const updated = await withTransaction(
      this.connection,
      async (session: ClientSession) => {
        const newCvIds = [...cvIds];

        newCvIds[index] = new mongoose.Types.ObjectId(dto.newFileId);

        const result = await this.userModel
          .findByIdAndUpdate(
            userId,
            {
              $set: {
                'candidateProfile.cvFileIds': newCvIds,
                updatedBy: { _id: user._id, email: user.email },
              },
            },
            { returnDocument: 'after', session },
          )
          .populate({ path: 'role', select: 'name' })
          .select('-__v -password -refreshToken');

        if (!result) throw new NotFoundException('Không tìm thấy user');

        // activate file mới
        await this.filesService.markAsActive(dto.newFileId, userId, session);

        // xoá record file cũ
        await this.filesService.deleteRecord(oldFileId, session);

        return result;
      },
    );

    // 🔥 delete vật lý ngoài transaction
    try {
      await this.uploadService.deletePhysicalFile(
        oldFileRecord.storageKey,
        oldFileRecord.provider,
        oldFileRecord.resourceType,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);

      this.logger.warn(
        `Xóa cloud thất bại cho file ${oldFileId}: ${message} — sẽ cleanup sau`,
      );
    }

    return updated;
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
