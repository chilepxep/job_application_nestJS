import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({
    example: '64a1b2c3d4e5f6a7b8c9d0e1',
    description: 'Id từ upload file',
  })
  logoId?: string;
}
