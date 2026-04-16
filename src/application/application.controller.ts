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
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseMessage } from '../decorator/customize';
import { ApiPermission } from '../decorator/api-permission.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import { IUser } from '../common/interfaces/user.interface';
import { QueryApplicationDto } from './dto/query-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('Applications')
@ApiBearerAuth('access-token')
@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @ResponseMessage('Nộp hồ sơ thành công')
  @ApiOperation({ summary: 'Nộp hồ sơ ứng tuyển [Candidate]' })
  @ApiPermission('Nộp hồ sơ', 'APPLICATIONS', ['CANDIDATE'])
  create(@Body() dto: CreateApplicationDto, @CurrentUser() user: IUser) {
    return this.applicationService.create(dto, user);
  }

  @Get('my-applications')
  @ResponseMessage('Lấy danh sách hồ sơ thành công')
  @ApiOperation({ summary: 'Xem hồ sơ của tôi [Candidate]' })
  @ApiPermission('Xem hồ sơ của tôi', 'APPLICATIONS', ['CANDIDATE'])
  findMyApplications(
    @Query() query: QueryApplicationDto,
    @CurrentUser() user: IUser,
  ) {
    return this.applicationService.findMyApplications(query, user);
  }

  @Get('admin')
  @ResponseMessage('Lấy danh sách hồ sơ thành công')
  @ApiOperation({ summary: 'Xem tất cả hồ sơ [Admin]' })
  @ApiPermission('Xem tất cả hồ sơ', 'APPLICATIONS', ['ADMIN'])
  findAllAdmin(@Query() query: QueryApplicationDto) {
    return this.applicationService.findAllAdmin(query);
  }

  @Get('job/:jobId')
  @ResponseMessage('Lấy danh sách hồ sơ thành công')
  @ApiOperation({ summary: 'Xem hồ sơ theo job [HR/Admin]' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiPermission('Xem hồ sơ theo job', 'APPLICATIONS', ['ADMIN', 'HR'])
  findByJob(
    @Param('jobId') jobId: string,
    @Query() query: QueryApplicationDto,
    @CurrentUser() user: IUser,
  ) {
    return this.applicationService.findByJob(jobId, query, user);
  }

  @Patch('withdraw/:id')
  @ResponseMessage('Rút hồ sơ thành công')
  @ApiOperation({ summary: 'Rút hồ sơ [Candidate]' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiPermission('Rút hồ sơ', 'APPLICATIONS', ['CANDIDATE'])
  withdraw(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.applicationService.withdraw(id, user);
  }

  @Patch('status/:id')
  @ResponseMessage('Cập nhật trạng thái thành công')
  @ApiOperation({ summary: 'Cập nhật trạng thái hồ sơ [HR/Admin]' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiPermission('Cập nhật trạng thái hồ sơ', 'APPLICATIONS', ['ADMIN', 'HR'])
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: IUser,
  ) {
    return this.applicationService.updateStatus(id, dto, user);
  }

  @Get(':id')
  @ResponseMessage('Lấy chi tiết hồ sơ thành công')
  @ApiOperation({ summary: 'Xem chi tiết hồ sơ' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiPermission('Xem chi tiết hồ sơ', 'APPLICATIONS', [
    'ADMIN',
    'HR',
    'CANDIDATE',
  ])
  findOne(@Param('id') id: string) {
    return this.applicationService.findOne(id);
  }

  @Delete(':id')
  @ResponseMessage('Xoá hồ sơ thành công')
  @ApiOperation({ summary: 'Xoá hồ sơ [Admin]' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiPermission('Xoá hồ sơ', 'APPLICATIONS', ['ADMIN'])
  remove(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.applicationService.remove(id, user);
  }
}
