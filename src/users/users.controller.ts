import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { QueryUserDto } from './dto/query-user.dto';
import { AddCvDto, ReplaceCvDto, UpdateMeDto } from './dto/update-me.dto';
import { Types } from 'mongoose';
import { IUser } from '../common/interfaces/user.interface';
import { ResponseMessage } from '../decorator/customize';
import { CurrentUser } from '../decorator/current-user.decorator';
import { ApiPermission } from '../decorator/api-permission.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //admin tạo user
  @Post()
  @ResponseMessage('Tạo user thành công')
  @ApiPermission('Tạo user', 'USERS', ['ADMIN'])
  @ApiOperation({ summary: 'Tạo user mới [Admin]' })
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: IUser) {
    return this.usersService.create(createUserDto, user);
  }

  //xem toàn bộ user
  @Get()
  @ResponseMessage('Lấy danh sách users thành công')
  @ApiPermission('Xem danh sách users', 'USERS', ['ADMIN'])
  @ApiOperation({ summary: 'Lấy danh sách users [Admin]' })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  //user xem profile chính mình
  @Get('me')
  @ResponseMessage('Lấy thông tin cá nhân thành công')
  @ApiPermission('Xem profile bản thân', 'USERS', ['ADMIN', 'HR', 'CANDIDATE'])
  @ApiOperation({ summary: 'Lấy profile bản thân' })
  findMe(@CurrentUser() user: IUser) {
    return this.usersService.findMe(user._id.toString());
  }

  //admin xem chi tiết bất kì user
  @Get(':id')
  @ResponseMessage('Lấy chi tiết user thành công')
  @ApiPermission('Xem chi tiết user bất kì', 'USERS', [
    'ADMIN',
    'HR',
    'CANDIDATE',
  ])
  @ApiOperation({ summary: 'Lấy chi tiết user [Admin]' })
  @ApiParam({ name: 'id', description: 'User ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  //user update profile chính mình
  @Patch('me')
  @ResponseMessage('Cập nhật thông tin cá nhân thành công')
  @ApiPermission('Xem profile bản thân', 'USERS', ['ADMIN', 'HR', 'CANDIDATE'])
  @ApiOperation({ summary: 'Cập nhật profile bản thân [All roles]' })
  updateMe(@Body() dto: UpdateMeDto, @CurrentUser() user: IUser) {
    return this.usersService.updateMe(user._id.toString(), dto, user);
  }

  //admin khoá mở tài khoản
  @Patch('toggle/:id')
  @ResponseMessage('Thay đổi trạng thái tài khoản thành công')
  @ApiPermission('Khoá/mở tài khoản', 'USERS', ['ADMIN'])
  @ApiOperation({ summary: 'Khoá/mở tài khoản [Admin]' })
  @ApiParam({ name: 'id', description: 'User ID' })
  toggleActive(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.usersService.toggleActive(id, user);
  }

  //user thêm cv
  @Post('me/cvs')
  @ResponseMessage('Thêm CV thành công')
  @ApiPermission('Thêm CV', 'USERS', ['CANDIDATE', 'ADMIN'])
  @ApiOperation({ summary: 'Thêm CV [Candidate]' })
  addCv(@Body() dto: AddCvDto, @CurrentUser() user: IUser) {
    return this.usersService.addCv(user._id.toString(), dto, user);
  }

  //user xoá cv
  @Delete('me/cvs/:fileId')
  @ResponseMessage('Xóa CV thành công')
  @ApiPermission('Xóa CV', 'USERS', ['CANDIDATE', 'ADMIN'])
  @ApiOperation({ summary: 'Xóa 1 CV [Candidate]' })
  @ApiParam({ name: 'fileId', description: 'File ID của CV cần xóa' })
  removeCv(@Param('fileId') fileId: string, @CurrentUser() user: IUser) {
    return this.usersService.removeCv(user._id.toString(), fileId, user);
  }

  //user thay thế cv
  @Put('me/cvs/:fileId')
  @ResponseMessage('Thay thế CV thành công')
  @ApiPermission('Thay thế CV', 'USERS', ['CANDIDATE', 'ADMIN'])
  @ApiOperation({ summary: 'Thay thế 1 CV [Candidate]' })
  @ApiParam({ name: 'fileId', description: 'File ID của CV cần thay thế' })
  replaceCv(
    @Param('fileId') fileId: string,
    @Body() dto: ReplaceCvDto,
    @CurrentUser() user: IUser,
  ) {
    return this.usersService.replaceCv(user._id.toString(), fileId, dto, user);
  }

  //admin update bất kì
  @Patch(':id')
  @ResponseMessage('Cập nhật user thành công')
  @ApiPermission('Cập nhật user', 'USERS', ['ADMIN'])
  @ApiOperation({ summary: 'Cập nhật user [Admin]' })
  @ApiParam({ name: 'id', description: 'User ID' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: IUser,
  ) {
    return this.usersService.update(id, dto, user);
  }

  //admin xoá user
  @Delete(':id')
  @ResponseMessage('Xoá user thành công')
  @ApiPermission('Xoá user', 'USERS', ['ADMIN'])
  @ApiOperation({ summary: 'Xoá user [Admin]' })
  @ApiParam({ name: 'id', description: 'User ID' })
  remove(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.usersService.remove(id, user);
  }
}
