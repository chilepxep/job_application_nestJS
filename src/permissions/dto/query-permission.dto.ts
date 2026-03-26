import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { HttpMethod } from './create-permission.dto';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryPermissionDto {
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

  @ApiPropertyOptional({ example: 'USERS', description: 'Lọc theo module' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({
    enum: HttpMethod,
    description: 'Lọc theo HTTP method',
  })
  @IsOptional()
  @IsEnum(HttpMethod)
  method?: HttpMethod;

  @ApiPropertyOptional({ example: false, description: 'Lọc permission đã xoá' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isDeleted?: boolean;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort: SortOrder = SortOrder.DESC;
}
