import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Query } from 'mongoose';
import {
  AuditUser,
  AuditUserSchema,
} from 'src/common/Schemas/audit-user.schema';

export type PermissionDocument = HydratedDocument<Permission> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

@Schema({ timestamps: true })
export class Permission {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  apiPath: string;

  @Prop({
    required: true,
    uppercase: true,
    enum: HttpMethod,
  })
  method: HttpMethod;

  @Prop({ required: true, trim: true, uppercase: true })
  module: string;

  @Prop({ type: AuditUserSchema, default: null })
  createdBy: AuditUser;

  @Prop({ type: AuditUserSchema, default: null })
  updatedBy: AuditUser;

  @Prop({ type: AuditUserSchema, default: null })
  deletedBy: AuditUser;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt: Date;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

// Unique index kết hợp apiPath + method
PermissionSchema.index({ apiPath: 1, method: 1 }, { unique: true });

// Soft delete middleware: tự động filter isDeleted khi query
PermissionSchema.pre<Query<any, PermissionDocument>>(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});
