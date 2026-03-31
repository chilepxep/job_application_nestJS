import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

//permissions được quản lý qua endpoint riêng
export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'HR', description: 'Tên role' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z_]+$/, {
    message: 'Name chỉ được chứa chữ cái và dấu gạch dưới (_)',
  })
  name?: string;

  @ApiPropertyOptional({ example: 'Nhà tuyển dụng', description: 'Mô tả role' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái kích hoạt' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
