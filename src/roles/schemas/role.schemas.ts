import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Query } from 'mongoose';
import { Permission } from '../../permissions/schemas/permission.schema';
import {
  AuditUser,
  AuditUserSchema,
} from '../../common/Schemas/audit-user.schema';

export type RoleDocument = HydratedDocument<Role> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true, trim: true, unique: true, uppercase: true })
  name: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: Permission.name }],
    default: [],
  })
  permissions: mongoose.Types.ObjectId[] | Permission[];

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

export const RoleSchema = SchemaFactory.createForClass(Role);

// Soft delete middleware
RoleSchema.pre<Query<any, RoleDocument>>(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});
