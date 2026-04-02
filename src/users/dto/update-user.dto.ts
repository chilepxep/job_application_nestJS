import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import {
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  UpdateCandidateProfileDto,
  UpdateHrProfileDto,
  UpdateProfileDto,
} from './update-me.dto';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @ApiPropertyOptional({ type: UpdateProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileDto)
  profile?: UpdateProfileDto;

  // Admin có thể đổi role user
  @ApiPropertyOptional({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  @IsOptional()
  @IsMongoId({ message: 'Role ID không hợp lệ' })
  role?: string;

  // Admin khoá/mở tài khoản
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Admin update candidateProfile
  @ApiPropertyOptional({ type: UpdateCandidateProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCandidateProfileDto)
  candidateProfile?: UpdateCandidateProfileDto;

  // Admin update hrProfile
  @ApiPropertyOptional({ type: UpdateHrProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateHrProfileDto)
  hrProfile?: UpdateHrProfileDto;
}
