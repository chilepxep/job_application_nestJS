import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

export class AddressDto {
  @ApiPropertyOptional({ example: '123 Nguyễn Huệ' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: 'Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  province?: string;
}

export class CreateCompanyDto {
  @ApiProperty({
    example: 'Google Vietnam',
    description: 'Tên công ty',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên công ty không được để trống' })
  name: string;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/logo.png',
    description: 'URL logo công ty',
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({
    example: 'https://google.com',
    description: 'Website công ty',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website không hợp lệ' })
  website?: string;

  @ApiPropertyOptional({
    example: 'Google là công ty công nghệ hàng đầu thế giới',
    description: 'Mô tả công ty',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Công nghệ thông tin',
    description: 'Ngành nghề',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ công ty',
    type: AddressDto,
  })
  @IsOptional()
  // @ValidateNested — validate object lồng nhau
  // cần kết hợp với @Type để class-transformer biết cần transform thành class nào
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  // Chỉ Admin mới được set isActive: true khi tạo
  // HR tạo → mặc định false, không cần truyền field này
  @ApiPropertyOptional({
    example: false,
    description: 'Trạng thái — chỉ Admin mới set được',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
