import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';

import { QueryCompanyDto } from './dto/query-company.dto';
import { Types } from 'mongoose';
import { IUser } from '../common/interfaces/user.interface';
import { ResponseMessage } from '../decorator/customize';
import { CurrentUser } from '../decorator/current-user.decorator';

const mockUser: IUser = {
  _id: new Types.ObjectId('69c4eb29eca9f1a140f46149'),
  email: 'admin@test.com',
  role: { _id: new Types.ObjectId(), name: 'ADMIN' },
};

@ApiTags('Companies')
@ApiBearerAuth('access-token')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  //HR hoặc ADMIM mới tạo công ty
  @Post()
  @ResponseMessage('Tạo công ty thành công')
  @ApiOperation({ summary: 'Tạo công ty mới [HR/Admin]' })
  create(@Body() dto: CreateCompanyDto, @CurrentUser() user: IUser) {
    return this.companiesService.create(dto, mockUser);
  }

  @Get()
  //@Public()
  @ResponseMessage('Lấy danh sách công ty thành công')
  @ApiOperation({ summary: 'Lấy danh sách công ty [Public]' })
  findAllPublic(@Query() query: QueryCompanyDto) {
    return this.companiesService.findAllPublic(query);
  }

  @Get('admin')
  @ResponseMessage('Lấy danh sách công ty thành công')
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách công ty [Admin]' })
  findAllAdmin(@Query() query: QueryCompanyDto) {
    return this.companiesService.findAllAdmin(query);
  }

  //Admin duyệt công ty
  @Patch('approve/:id')
  @ResponseMessage('Duyệt công ty thành công')
  @ApiOperation({ summary: 'Duyệt công ty [Admin]' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  approve(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.companiesService.approve(id, mockUser);
  }

  //xem chi tiết công ty
  @Get(':id')
  // @Public()
  @ResponseMessage('Lấy chi tiết công ty thành công')
  @ApiOperation({ summary: 'Lấy chi tiết công ty [Public]' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  //HR update công ty của mình
  //Admin update bất kì
  @Patch(':id')
  @ResponseMessage('Cập nhật công ty thành công')
  @ApiOperation({ summary: 'Cập nhật công ty [HR/Admin]' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: IUser,
  ) {
    return this.companiesService.update(id, dto, mockUser);
  }

  @Delete(':id')
  @ResponseMessage('Xoá công ty thành công')
  @ApiOperation({ summary: 'Xoá công ty [HR/Admin]' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  remove(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.companiesService.remove(id, mockUser);
  }
}
