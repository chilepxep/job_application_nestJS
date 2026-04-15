import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class RegisterHrDto {
  @ApiProperty({ example: 'hr@company.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Password không được để trống' })
  @MinLength(6, { message: 'Password tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Tran Thi HR' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName: string;

  // Thông tin công ty — tạo mới khi đăng ký
  @ApiProperty({ example: 'Google Vietnam' })
  @IsString()
  @IsNotEmpty({ message: 'Tên công ty không được để trống' })
  companyName: string;

  @ApiPropertyOptional({ example: 'Công nghệ thông tin' })
  @IsOptional()
  @IsString()
  companyIndustry?: string;

  @ApiPropertyOptional({ example: 'https://google.com' })
  @IsOptional()
  @IsUrl({}, { message: 'Website không hợp lệ' })
  companyWebsite?: string;

  @ApiPropertyOptional({ example: 'HR Manager' })
  @IsOptional()
  @IsString()
  position?: string;
}
