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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseMessage } from 'src/decorator/customize';
import { CurrentUser } from 'src/decorator/current-user.decorator';
import { IUser } from 'src/common/interfaces/user.interface';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { Types } from 'mongoose';

const mockUser: IUser = {
  _id: new Types.ObjectId('69cdeb47e80f62ad8b4c36f7'),
  email: 'admin@gmail.com',
  role: {
    _id: new Types.ObjectId('69cb2fdda2530adba1728c3c'),
    name: 'ADMIN',
  },
};

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //admin tạo user
  @Post()
  @ResponseMessage('Tạo user thành công')
  @ApiOperation({ summary: 'Tạo user mới [Admin]' })
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: IUser) {
    return this.usersService.create(createUserDto, mockUser);
  }

  //xem toàn bộ user
  @Get()
  @ResponseMessage('Lấy danh sách users thành công')
  @ApiOperation({ summary: 'Lấy danh sách users [Admin]' })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  //user xem profile chính mình
  @Get('me')
  @ResponseMessage('Lấy thông tin cá nhân thành công')
  @ApiOperation({ summary: 'Lấy profile bản thân' })
  findMe(@CurrentUser() user: IUser) {
    return this.usersService.findMe(mockUser._id.toString());
  }

  //admin xem chi tiết bất kì user
  @Get(':id')
  @ResponseMessage('Lấy chi tiết user thành công')
  @ApiOperation({ summary: 'Lấy chi tiết user [Admin]' })
  @ApiParam({ name: 'id', description: 'User ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  //user update profile chính mình
  @Patch('me')
  @ResponseMessage('Cập nhật thông tin cá nhân thành công')
  @ApiOperation({ summary: 'Cập nhật profile bản thân [All roles]' })
  updateMe(@Body() dto: UpdateMeDto, @CurrentUser() user: IUser) {
    return this.usersService.updateMe(mockUser._id.toString(), dto, mockUser);
  }

  //admin khoá mở tài khoản
  @Patch('toggle/:id')
  @ResponseMessage('Thay đổi trạng thái tài khoản thành công')
  @ApiOperation({ summary: 'Khoá/mở tài khoản [Admin]' })
  @ApiParam({ name: 'id', description: 'User ID' })
  toggleActive(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.usersService.toggleActive(id, mockUser);
  }

  //admin update bất kì
  @Patch(':id')
  @ResponseMessage('Cập nhật user thành công')
  @ApiOperation({ summary: 'Cập nhật user [Admin]' })
  @ApiParam({ name: 'id', description: 'User ID' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: IUser,
  ) {
    return this.usersService.update(id, dto, mockUser);
  }

  //admin xoá user
  @Delete(':id')
  @ResponseMessage('Xoá user thành công')
  @ApiOperation({ summary: 'Xoá user [Admin]' })
  @ApiParam({ name: 'id', description: 'User ID' })
  remove(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.usersService.remove(id, mockUser);
  }
}
