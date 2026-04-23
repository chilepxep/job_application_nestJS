import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type FileDocument = HydratedDocument<File>;

export enum FileStatus {
  TEMP = 'TEMP',
  ACTIVE = 'ACTIVE',
  IN_USE = 'IN_USE',
  DELETING = 'DELETING',
}

export enum FileType {
  LOGO = 'logo',
  CV = 'cv',
}

export enum StorageProvider {
  LOCAL = 'LOCAL',
  CLOUDINARY = 'CLOUDINARY',
  SUPABASE = 'SUPABASE',
}

@Schema({ timestamps: true })
export class File {
  @Prop({ required: true })
  url: string;

  //dùng để delete file trên cloud/local
  @Prop({ required: true })
  storageKey: string;

  @Prop({
    enum: FileStatus,
    default: FileStatus.TEMP,
  })
  status: FileStatus;

  @Prop({
    enum: FileType,
    required: true,
  })
  type: FileType;

  //biết file thuộc storage nào
  @Prop({
    enum: StorageProvider,
    required: true,
  })
  provider: StorageProvider;

  //user upload
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  ownerId: mongoose.Types.ObjectId;

  @Prop()
  resourceType: string;

  //sau này gán cho Company/User
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  })
  relatedId: mongoose.Types.ObjectId | null;
}

export const FileSchema = SchemaFactory.createForClass(File);
