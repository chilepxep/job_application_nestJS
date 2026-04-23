import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Query } from 'mongoose';
import { Job } from '../../jobs/schemas/job.schema';
import { User } from '../../users/schemas/user.schemas';
import {
  AuditUser,
  AuditUserSchema,
} from '../../common/Schemas/audit-user.schema';

export type ApplicationDocument = HydratedDocument<Application> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum ApplicationStatus {
  PENDING = 'pending', //Vừa nộp, chờ HR xem
  REVIEWING = 'reviewing', //HR đang xem xét
  INTERVIEW = 'interview', //Được mời phỏng vấn
  ACCEPTED = 'accepted', //Được nhận
  REJECTED = 'rejected', //Bị từ chối
  WITHDRAWN = 'withdrawn', //Candidate rút hồ sơ
}

@Schema({ timestamps: true })
export class Application {
  //Quan hệ
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Job.name,
    required: true,
  })
  job: mongoose.Types.ObjectId | Job;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  candidate: mongoose.Types.ObjectId | User;

  //Hồ sơ ứng tuyển
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
  })
  cvFileId: mongoose.Types.ObjectId;

  //thư giới thiệu
  @Prop({ trim: true })
  coverLetter: string;

  @Prop({
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  // ── Audit fields ──────────────────────────
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

export const ApplicationSchema = SchemaFactory.createForClass(Application);

//Một candidate chỉ nộp được 1 lần vào 1 job
ApplicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

ApplicationSchema.index({ candidate: 1 });
ApplicationSchema.index({ job: 1 });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ isDeleted: 1 });

//Soft delete middleware
ApplicationSchema.pre<Query<any, ApplicationDocument>>(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});
