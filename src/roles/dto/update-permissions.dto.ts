import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsNotEmpty } from 'class-validator';

export class UpdatePermissionsArryDto {
  @ApiProperty({
    example: ['64a1b2c3d4e5f6a7b8c9d0e1', '64a1b2c3d4e5f6a7b8c9d0e2'],
    description: 'Danh sách Permission ID cần thêm hoặc xoá',
    type: [String],
  })
  @IsArray({ message: 'Permissions phải là mảng' })
  @IsMongoId({ each: true, message: 'Permission ID không hợp lệ' })
  @IsNotEmpty({ message: 'Permissions không được để trống' })
  permissions: string[];
}
