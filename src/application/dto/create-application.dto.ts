import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  @IsMongoId({ message: 'Job ID không hợp lệ' })
  @IsNotEmpty({ message: 'Job ID không được để trống' })
  job: string;

  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  @IsMongoId({ message: 'CV ID không hợp lệ' })
  @IsNotEmpty({ message: 'CV không được để trống' })
  cvFileId: string;

  @ApiPropertyOptional({ example: 'Tôi rất muốn ứng tuyển vào vị trí này...' })
  @IsOptional()
  @IsString()
  coverLetter?: string;
}
