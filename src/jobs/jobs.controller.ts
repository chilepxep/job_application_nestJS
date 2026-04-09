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
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { Public, ResponseMessage } from '../decorator/customize';
import { CurrentUser } from '../decorator/current-user.decorator';
import { IUser } from '../common/interfaces/user.interface';
import { QueryJobDto } from './dto/query-job.dto';
import { ApiPermission } from '../decorator/api-permission.decorator';

@ApiTags('Jobs')
@ApiBearerAuth('access-token')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // HR hoặc Admin tạo job
  @Post()
  @ResponseMessage('Tạo job thành công')
  @ApiPermission('Tạo job', 'JOBS', ['ADMIN', 'HR'])
  @ApiOperation({ summary: 'Tạo job mới [HR/Admin]' })
  create(@Body() dto: CreateJobDto, @CurrentUser() user: IUser) {
    return this.jobsService.create(dto, user);
  }

  //chỉ thấy job đang open
  @Get()
  @Public()
  @ResponseMessage('Lấy danh sách job thành công')
  @ApiOperation({ summary: 'Lấy danh sách job [Public]' })
  findAllPublic(@Query() query: QueryJobDto) {
    return this.jobsService.findAllPublic(query);
  }

  //Admin xem tất cả job
  @Get('admin')
  @ResponseMessage('Lấy danh sách job thành công')
  @ApiPermission('Xem tất cả job', 'JOBS', ['ADMIN'])
  @ApiOperation({ summary: 'Lấy tất cả job [Admin]' })
  findAllAdmin(@Query() query: QueryJobDto) {
    return this.jobsService.findAllAdmin(query);
  }

  //hr xem job của mình
  @Get('my-jobs')
  @ResponseMessage('Lấy danh sách job của bạn thành công')
  @ApiPermission('Xem job của tôi', 'JOBS', ['ADMIN', 'HR'])
  @ApiOperation({ summary: 'Lấy job của HR [HR]' })
  findMyJobs(@Query() query: QueryJobDto, @CurrentUser() user: IUser) {
    return this.jobsService.findMyJobs(query, user);
  }

  @Get('my-company-jobs')
  @ResponseMessage('Lấy danh sách job công ty của bạn thành công')
  @ApiPermission('Xem job công ty của tôi', 'JOBS', ['ADMIN', 'HR'])
  @ApiOperation({ summary: 'Lấy job của HR [HR]' })
  findMyCompanyJobs(@Query() query: QueryJobDto, @CurrentUser() user: IUser) {
    return this.jobsService.findMyJobs(query, user);
  }

  //admin duyệt job
  @Patch('approve/:id')
  @ResponseMessage('Duyệt job thành công')
  @ApiPermission('Duyệt job', 'JOBS', ['ADMIN'])
  @ApiOperation({ summary: 'Duyệt job [Admin]' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  approve(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.jobsService.approve(id, user);
  }

  //hr đóng mở job
  @Patch('toggle/:id')
  @ResponseMessage('Thay đổi trạng thái job thành công')
  @ApiPermission('Đóng/mở job', 'JOBS', ['ADMIN', 'HR'])
  @ApiOperation({ summary: 'Đóng/mở job [HR/Admin]' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  toggleStatus(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.jobsService.toggleStatus(id, user);
  }

  //xem chi tiết job
  @Get(':id')
  @Public()
  @ResponseMessage('Lấy chi tiết job thành công')
  @ApiOperation({ summary: 'Lấy chi tiết job [Public]' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  //hr sửa job mình / admin bất kỳ
  @Patch(':id')
  @ResponseMessage('Cập nhật job thành công')
  @ApiPermission('Cập nhật job', 'JOBS', ['ADMIN', 'HR'])
  @ApiOperation({ summary: 'Cập nhật job [HR/Admin]' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
    @CurrentUser() user: IUser,
  ) {
    return this.jobsService.update(id, dto, user);
  }

  //xoá job
  @Delete(':id')
  @ResponseMessage('Xoá job thành công')
  @ApiOperation({ summary: 'Xoá job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiPermission('Xoá job', 'JOBS', ['ADMIN'])
  remove(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.jobsService.remove(id, user);
  }
}
