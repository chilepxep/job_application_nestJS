import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema({ _id: false }) // ← _id: false ở đây chỉ tắt auto-generate _id của sub-doc
export class AuditUser {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  _id: mongoose.Types.ObjectId; // ← vẫn khai báo _id là field thủ công

  @Prop({ required: true })
  email: string;
}

export const AuditUserSchema = SchemaFactory.createForClass(AuditUser);
