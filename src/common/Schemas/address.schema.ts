import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Address {
  @Prop({ trim: true })
  street: string; // số nhà, tên đường

  @Prop({ trim: true })
  city: string; // thành phố

  @Prop({ trim: true })
  province: string; // tỉnh/thành
}

export const AddressSchema = SchemaFactory.createForClass(Address);
