import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Profile {
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

export const ProfileSchema = SchemaFactory.createForClass(Profile);
