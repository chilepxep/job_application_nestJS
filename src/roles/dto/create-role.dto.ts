import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'HR',
    description: 'Tên role (tự động uppercase)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name role không được để trống' })
  name: string;

  @ApiPropertyOptional({
    example: 'Nhà tuyển dụng',
    description: 'Mô tả role',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: true,
    description: 'Trạng thái kích hoạt',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive: boolean;

  @ApiProperty({
    example: ['64a1b2c3d4e5f6a7b8c9d0e1', '64a1b2c3d4e5f6a7b8c9d0e2'],
    description: 'Danh sách Permission ID',
    type: [String],
  })
  @IsArray({ message: 'Permissions phải là mảng' })
  @IsMongoId({ each: true, message: 'Permission ID không hợp lệ' })
  @IsNotEmpty({ message: 'Permissions không được để trống' })
  permissions: string[];
}
