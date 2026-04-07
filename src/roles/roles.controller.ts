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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { Types } from 'mongoose';
import { QueryRoleDto } from './dto/query-role.dto';
import { UpdatePermissionsArryDto } from './dto/update-permissions.dto';
import { CurrentUser } from '../decorator/current-user.decorator';
import { ResponseMessage } from '../decorator/customize';
import { IUser } from '../common/interfaces/user.interface';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ResponseMessage('Tạo role thành công')
  @ApiOperation({ summary: 'Tạo role mới' })
  create(@Body() createRoleDto: CreateRoleDto, @CurrentUser() user: IUser) {
    return this.rolesService.create(createRoleDto, user);
  }

  @Get()
  @ResponseMessage('Lấy danh sách roles thành công')
  @ApiOperation({ summary: 'Lấy danh sách roles' })
  findAll(@Query() query: QueryRoleDto) {
    return this.rolesService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Lấy chi tiết role thành công')
  @ApiOperation({ summary: 'Lấy chi tiết role' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật role thành công')
  @ApiOperation({ summary: 'Cập nhật role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: IUser,
  ) {
    return this.rolesService.update(id, dto, user);
  }

  @Delete(':id')
  @ResponseMessage('Xoá role thành công')
  @ApiOperation({ summary: 'Xoá role' })
  remove(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.rolesService.remove(id, user);
  }

  //thêm per vào mảng permissions của role
  @Patch(':id/permissions/add')
  @ResponseMessage('Thêm permissions vào role thành công')
  @ApiOperation({ summary: 'Thêm permissions vào role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  addPermissions(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsArryDto,
    @CurrentUser() user: IUser,
  ) {
    return this.rolesService.addPermissions(id, dto.permissions, user);
  }

  //xoá permissions khỏi mảng permissions của role
  @Patch(':id/permissions/remove')
  @ResponseMessage('Xoá permissions khỏi role thành công')
  @ApiOperation({ summary: 'Xoá permissions khỏi role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  removePermissions(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsArryDto,
    @CurrentUser() user: IUser,
  ) {
    return this.rolesService.removePermissions(id, dto.permissions, user);
  }
}
