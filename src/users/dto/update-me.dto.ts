import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { Gender } from './create-user.dto';
import { Type } from 'class-transformer';

//Profile chung - tất cả đều được update
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/avatar.png' })
  @IsOptional()
  @IsUrl({}, { message: 'Avatar URL không hợp lệ' })
  avatar?: string;

  @ApiPropertyOptional({ example: '1999-01-01' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}

//Candidate update
export class UpdateCandidateProfileDto {
  @ApiPropertyOptional({
    example: ['https://storage.example.com/cv1.pdf'],
    description: 'Danh sách URL CV đã upload',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'CV URL không hợp lệ' })
  cvUrl?: string[];

  @ApiPropertyOptional({ example: ['NestJS', 'MongoDB'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experience?: number;

  @ApiPropertyOptional({ example: 'Backend Developer' })
  @IsOptional()
  @IsString()
  currentPosition?: string;

  @ApiPropertyOptional({ example: 15000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  desiredSalary?: number;

  @ApiPropertyOptional({ example: 'Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  desiredLocation?: string;
}

// HR update
export class UpdateHrProfileDto {
  @ApiPropertyOptional({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'HR Manager' })
  @IsOptional()
  @IsString()
  position?: string;
}

export class UpdateMeDto {
  // Profile chung
  @ApiPropertyOptional({ type: UpdateProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileDto)
  profile?: UpdateProfileDto;

  // Candidate profile
  @ApiPropertyOptional({ type: UpdateCandidateProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCandidateProfileDto)
  candidateProfile?: UpdateCandidateProfileDto;

  // HR profile
  @ApiPropertyOptional({ type: UpdateHrProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateHrProfileDto)
  hrProfile?: UpdateHrProfileDto;
}
