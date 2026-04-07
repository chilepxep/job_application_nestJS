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
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { QueryPermissionDto } from './dto/query-permission.dto';
import { Types } from 'mongoose';

import { UpdatePermissionDto } from './dto/update-permission.dto';
import { IUser } from '../common/interfaces/user.interface';
import { ResponseMessage } from '../decorator/customize';
import { CurrentUser } from '../decorator/current-user.decorator';

const mockUser: IUser = {
  _id: new Types.ObjectId('69c4eb29eca9f1a140f46149'),
  email: 'admin@test.com',
  role: { _id: new Types.ObjectId(), name: 'ADMIN' },
};

@Controller('permissions')
@ApiTags('Permissions')
@ApiBearerAuth('access-token')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo permission mới' })
  @ResponseMessage('tạo mới permission thành công')
  create(@Body() dto: CreatePermissionDto, @CurrentUser() user: IUser) {
    return this.permissionsService.create(dto, mockUser);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách permissions' })
  @ResponseMessage('lấy danh sách permission thành công')
  findAll(@Query() query: QueryPermissionDto) {
    return this.permissionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết permission' })
  @ResponseMessage('xem chi tiết permission thành công')
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật permission' })
  @ResponseMessage('cập nhật permission thành công')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser() user: IUser,
  ) {
    return this.permissionsService.update(id, dto, mockUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá permission' })
  @ResponseMessage('xoá permission thành công')
  remove(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.permissionsService.remove(id, mockUser);
  }
}
