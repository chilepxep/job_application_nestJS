import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Query } from 'mongoose';
import {
  AuditUser,
  AuditUserSchema,
} from 'src/common/Schemas/audit-user.schema';
import { Company } from 'src/companies/schemas/company.schema';
import { Role } from 'src/roles/schemas/role.schemas';

export type UserDocument = HydratedDocument<User> & {
  createdAt: Date;
  updatedAt: Date;
};

//dùng chung cho tất cả
@Schema({ _id: false })
class Profile {
  @Prop({ trim: true })
  fullName: string;

  @Prop({ trim: true })
  phone: string;

  @Prop()
  avatar: string;

  @Prop()
  dateOfBirth: Date;

  @Prop({ enum: ['male', 'female', 'other'] })
  gender: string;
}
const ProfileSchema = SchemaFactory.createForClass(Profile);

@Schema({ _id: false })
class CandidateSubscription {
  //hạng mức
  @Prop({
    enum: ['free', 'basic', 'permium'],
    default: 'free',
  })
  plan: string;

  //số lần push cv lên top còn lại
  @Prop({ default: 0 })
  cvPushCount: number;

  //xem số người cạnh tranh trong job
  @Prop({ default: false })
  canViewCompetitors: boolean;

  //Huy hiệu ứng viên nổi bật - HR thấy đầu
  @Prop({ default: false })
  isHighlighted: boolean;

  //HR đã xem CV chưa
  @Prop({ default: false })
  canTrackView: boolean;

  @Prop({ default: null })
  expiredAt: Date;

  @Prop({ default: false })
  isActive: boolean;
}

const CandidateSubscriptionSchema = SchemaFactory.createForClass(
  CandidateSubscription,
);

@Schema({ _id: false })
class CandidateProfile {
  //URL file CV sau khi upload lên clound
  @Prop({ type: [String], default: [] })
  cvUrl: string[];

  @Prop({ type: [String], default: [] })
  skills: string[];

  //số năm kinh nghiệm
  @Prop({ default: 0 })
  experience: number;

  @Prop({ trim: true })
  currentPosition: string;

  @Prop({ default: 0 })
  desiredSalary: number;

  @Prop({ trim: true })
  desiredLocation: string;

  @Prop({ type: CandidateSubscription, default: {} })
  subscription: CandidateSubscription;
}
const CandidateProfileSchema = SchemaFactory.createForClass(CandidateProfile);

@Schema({ _id: false })
class HrProfile {
  //ref đến company
  //null nếu chưa gán
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Company.name,
    default: null,
  })
  company: mongoose.Types.ObjectId | Company;

  //chức vụ
  @Prop({ trim: true })
  position: string;
}

const HrProfileSchema = SchemaFactory.createForClass(HrProfile);

@Schema({ _id: false })
class CompanySubscription {
  @Prop({
    enum: ['free', 'eco', 'pro'],
    default: 'free',
  })
  plan: string;

  //số job được đăng còn lại
  @Prop({ default: 5 })
  jobPostLimit: number;

  //số lần push job lên top còn lại
  @Prop({ default: 0 })
  pushTopCount: number;

  //đề xuất CV phù hợp
  @Prop({ default: false })
  aiRecommend: boolean;

  @Prop({ default: null })
  expiredAt: Date;

  @Prop({ default: false })
  isActive: boolean;
}

//dùng cho đăng nhập với Auth
@Schema({ _id: false })
class AuthProvider {
  @Prop({ enum: ['local', 'google', 'facebook'], required: true })
  provider: string;

  @Prop({ required: true })
  providerId: string;
}

const AuthProviderSchema = SchemaFactory.createForClass(AuthProvider);

//schema chính
@Schema({ timestamps: true })
export class User {
  //thông tin đăng nhập
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  })
  email: string;

  @Prop({ select: false })
  password: string;

  // Auth providers — local, google, facebook
  @Prop({ type: [AuthProviderSchema], default: [] })
  providers: AuthProvider[];

  @Prop({ default: true })
  isActive: boolean;

  //lấy role
  //poupulate lấy permission khi check quyền
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Role.name,
    required: true,
  })
  role: mongoose.Types.ObjectId | Role;

  //profile chung
  @Prop({ type: ProfileSchema, default: {} })
  profile: Profile;

  //là null nếu không phải ứng viên
  @Prop({ type: CandidateProfileSchema, default: null })
  candidateProfile: CandidateProfile;

  // null nếu không phải HR
  @Prop({ type: HrProfileSchema, default: null })
  hrProfile: HrProfile;

  //Auth
  // Hashed refresh token
  // select: false → không trả về khi query
  @Prop({ select: false, default: null })
  refreshToken: string;

  // ── Audit fields ──────────────────────────────
  @Prop({ type: AuditUserSchema, default: null })
  createdBy: AuditUser;

  @Prop({ type: AuditUserSchema, default: null })
  updatedBy: AuditUser;

  @Prop({ type: AuditUserSchema, default: null })
  deletedBy: AuditUser;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null })
  deletedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index tìm kiếm theo tên — dùng cho Admin search user
UserSchema.index({ 'profile.fullName': 'text' });

// Soft delete middleware
UserSchema.pre<Query<any, UserDocument>>(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

// Index tìm kiếm nhanh theo provider
UserSchema.index({ 'providers.provider': 1, 'providers.providerId': 1 });

// Thêm index cho các field hay filter
UserSchema.index({ role: 1 }); // filter theo role
UserSchema.index({ isActive: 1 }); // filter theo isActive
UserSchema.index({ isDeleted: 1 }); // soft delete query
UserSchema.index({ createdAt: -1 }); // sort theo thời gian

// Compound index cho query phổ biến nhất
UserSchema.index({ isDeleted: 1, isActive: 1, role: 1 });
