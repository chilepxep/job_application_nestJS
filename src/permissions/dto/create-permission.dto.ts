import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export class CreatePermissionDto {
  @ApiProperty({
    example: 'Xem danh sách user',
    description: 'Tên permission',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name không được để trống' })
  name: string;

  @ApiProperty({
    example: '/api/v1/users',
    description: 'Đường dẫn API',
  })
  @IsString()
  @IsNotEmpty({ message: 'ApiPath không được để trống' })
  apiPath: string;

  @ApiProperty({
    example: 'GET',
    enum: HttpMethod,
    description: 'HTTP method',
  })
  @IsEnum(HttpMethod, {
    message: 'Method phải là GET | POST | PUT | PATCH | DELETE',
  })
  @IsNotEmpty({ message: 'Method không được để trống' })
  method: HttpMethod;

  @ApiProperty({
    example: 'USERS',
    description: 'Tên module (tự động uppercase)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Module không được để trống' })
  module: string;
}
