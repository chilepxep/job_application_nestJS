import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Query } from 'mongoose';
import { Company } from '../../companies/schemas/company.schema';
import { User } from '../../users/schemas/user.schemas';
import {
  AuditUser,
  AuditUserSchema,
} from '../../common/Schemas/audit-user.schema';

export type jobDocument = HydratedDocument<Job> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum JobType {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
}

export enum JobStatus {
  PENDING = 'pending',
  OPEN = 'open',
  CLOSED = 'closed',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  requirements: string;

  @Prop()
  benefits: string;

  @Prop({
    required: true,
    enum: JobType,
    default: JobType.FULL_TIME,
  })
  jobType: JobType;

  @Prop({ required: true, trim: true })
  location: string;

  // VD: 'Thoả thuận', '10-15 triệu', 'Cạnh tranh'
  @Prop({ required: true, trim: true })
  salary: string;

  // 0 = không yêu cầu kinh nghiệm
  @Prop({ default: 0 })
  experience: number;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Prop({ default: null })
  expiredAt: Date;

  @Prop({ default: 1 })
  quantity: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Company.name,
    required: true,
  })
  company: mongoose.Types.ObjectId | Company;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  createdByUser: mongoose.Types.ObjectId | User;

  @Prop({ type: AuditUserSchema, default: null })
  createdBy: AuditUser;

  @Prop({ type: AuditUserSchema, default: null })
  updatedBy: AuditUser;

  @Prop({ type: AuditUserSchema, default: null })
  deletedBy: AuditUser;

  // ── Soft delete ───────────────────────────
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null })
  deletedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Index tìm kiếm theo title, description
JobSchema.index({ title: 'text', description: 'text' });

// Index filter hay dùng
JobSchema.index({ status: 1 });
JobSchema.index({ company: 1 });
JobSchema.index({ createdByUser: 1 });
JobSchema.index({ jobType: 1 });
JobSchema.index({ isDeleted: 1 });
JobSchema.index({ expiredAt: 1 });

// Compound index
JobSchema.index({ isDeleted: 1, status: 1, company: 1 });

// Soft delete middleware
JobSchema.pre<Query<any, jobDocument>>(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});
