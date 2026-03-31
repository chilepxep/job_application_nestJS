import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SortOrder } from 'src/permissions/dto/query-permission.dto';

export class QueryRoleDto {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Số item mỗi trang' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit: number = 10;

  @ApiPropertyOptional({ example: true, description: 'Lọc theo trạng thái' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Lọc role đã xoá' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isDeleted?: boolean;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort: SortOrder = SortOrder.DESC;
}
