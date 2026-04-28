import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Delete,
  Param,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { Public, ResponseMessage } from '../decorator/customize';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import { use } from 'passport';
import { IUser } from '../common/interfaces/user.interface';
import { CurrentUser } from '../decorator/current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPermission } from '../decorator/api-permission.decorator';

@ApiTags('Upload')
@ApiBearerAuth('access-token')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image-upload')
  @ResponseMessage('Upload hình ảnh thành công')
  @ApiOperation({ summary: 'Upload ảnh logo công ty [HR/Admin]' })
  @ApiPermission('Upload ảnh logo', 'UPLOAD', ['ADMIN', 'HR'])
  @UseInterceptors(FileInterceptor('file'))
  async UploadImage(
    @UploadedFile(
      new FileValidationPipe({
        maxSizeMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: IUser,
  ) {
    return this.uploadService.uploadImage(file, {
      folder: 'logo',
      userId: user._id.toString(),
    });
  }

  @Post('upload-cv')
  @ResponseMessage('Upload CV thành công')
  @ApiOperation({ summary: 'Upload CV ứng viên' })
  @ApiPermission('Upload CV', 'UPLOAD', ['ADMIN', 'CANDIDATE'])
  @UseInterceptors(FileInterceptor('file'))
  async testUploadCV(
    @UploadedFile(
      new FileValidationPipe({
        maxSizeMB: 5,
        allowedMimeTypes: ['application/pdf'],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: IUser,
  ) {
    return this.uploadService.uploadFile(file, {
      folder: 'cv',
      userId: user._id.toString(),
    });
  }

  @Public()
  @Delete(':fileId')
  async deleteFile(@Param('fileId') fileId: string) {
    return this.uploadService.deleteFileById(fileId);
  }
}
