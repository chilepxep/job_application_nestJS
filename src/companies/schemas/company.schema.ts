import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Address, AddressSchema } from 'src/common/Schemas/address.schema';
import {
  AuditUser,
  AuditUserSchema,
} from 'src/common/Schemas/audit-user.schema';

export type CompaniesDocument = HydratedDocument<Company> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Company {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  logo: string;

  @Prop({ trim: true })
  website: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ trim: true })
  industry: string;

  @Prop({ type: AddressSchema, default: {} })
  address: Address;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  })
  createdByUser: mongoose.Types.ObjectId;

  @Prop({
    type: {
      plan: {
        type: String,
        enum: ['free', 'eco', 'pro', 'max', 'max_plus'],
        default: 'free',
      },
      jobPostLimit: { type: Number, default: 3 },
      pushTopCount: { type: Number, default: 0 },
      aiRecommend: { type: Boolean, default: false },
      expiredAt: { type: Date, default: null },
      isActive: { type: Boolean, default: false },
    },
    _id: false,
    default: {},
  })
  subscription: {
    plan: string;
    jobPostLimit: number;
    pushTopCount: number;
    aiRecommend: boolean;
    expiredAt: Date;
    isActive: boolean;
  };

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

export const CompaniesSchema = SchemaFactory.createForClass(Company);
