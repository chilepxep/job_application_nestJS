import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';
import { JobStatus } from '../schemas/job.schema';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus, { message: 'Trạng thái không hợp lệ' })
  status?: JobStatus;
}
