import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { JobType } from '../schemas/job.schema';

export class CreateJobDto {
  @ApiProperty({ example: 'Backend Developer' })
  @IsString()
  @IsNotEmpty({ message: 'Tên vị trí không được để trống' })
  title: string;

  @ApiProperty({ example: 'Mô tả công việc chi tiết...' })
  @IsString()
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  description: string;

  @ApiProperty({ example: 'Yêu cầu ứng viên...' })
  @IsString()
  @IsNotEmpty({ message: 'Yêu cầu không được để trống' })
  requirements: string;

  @ApiPropertyOptional({ example: 'Quyền lợi hấp dẫn...' })
  @IsOptional()
  @IsString()
  benefits?: string;

  @ApiProperty({ enum: JobType, example: JobType.FULL_TIME })
  @IsEnum(JobType, { message: 'Loại hình công việc không hợp lệ' })
  jobType: JobType;

  @ApiProperty({ example: 'Hồ Chí Minh' })
  @IsString()
  @IsNotEmpty({ message: 'Địa điểm không được để trống' })
  location: string;

  @ApiProperty({ example: '10-15 triệu' })
  @IsString()
  @IsNotEmpty({ message: 'Mức lương không được để trống' })
  salary: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experience?: number;

  @ApiPropertyOptional({ example: ['NestJS', 'MongoDB'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày hết hạn không hợp lệ' })
  expiredAt?: string;

  // HR tạo job → company lấy từ hrProfile
  // Admin tạo job → phải truyền companyId
  @ApiPropertyOptional({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  @IsOptional()
  @IsMongoId({ message: 'Company ID không hợp lệ' })
  company?: string;
}
