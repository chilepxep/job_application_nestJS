import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import {
  Application,
  ApplicationDocument,
  ApplicationStatus,
} from './schemas/application.schema';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { JobsService } from '../jobs/jobs.service';
import { IUser } from '../common/interfaces/user.interface';
import { JobStatus } from '../jobs/schemas/job.schema';
import { QueryApplicationDto } from './dto/query-application.dto';
import { SortOrder } from '../permissions/dto/query-permission.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FilesService } from '../files/files.service';
import { FileStatus } from '../files/schemas/file.schema';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    private jobService: JobsService,
    private filesService: FilesService,
  ) {}

  //helper
  private validateObjectId(id: string, field = 'ID') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${field} không hợp lệ`);
    }
  }

  private extractId(value: any): string {
    if (!value) return '';
    if (value._id) return value._id.toString();
    return value.toString();
  }

  // async create(createApplicationDto: CreateApplicationDto, user: IUser) {
  //   const { job, cvFileId, coverLetter } = createApplicationDto;

  //   this.validateObjectId(job, 'Job ID');
  //   this.validateObjectId(cvFileId, 'CV File ID');

  //   const jobDoc = await this.jobService.findOne(job);
  //   if (jobDoc.status !== JobStatus.OPEN) {
  //     throw new BadRequestException('Job này hiện không tiếp nhận hồ sơ');
  //   }

  //   // check duplicate apply
  //   const existed = await this.applicationModel.findOne({
  //     job: new mongoose.Types.ObjectId(job),
  //     candidate: user._id,
  //   });
  //   if (existed) {
  //     throw new ConflictException('Bạn đã nộp hồ sơ vào job này rồi');
  //   }

  //   //validate file
  //   const file = await this.filesService.findById(cvFileId);

  //   if (file.ownerId.toString() !== user._id.toString()) {
  //     throw new ForbiddenException('Không có quyền sử dụng CV này');
  //   }

  //   if (file.status !== FileStatus.ACTIVE) {
  //     throw new BadRequestException('CV chưa sẵn sàng để sử dụng');
  //   }

  //   //tạo application
  //   const application = await this.applicationModel.create({
  //     job: new mongoose.Types.ObjectId(job),
  //     candidate: user._id,

  //     cvFileId: file._id,
  //     cvSnapshotUrl: file.url,

  //     coverLetter,

  //     createdBy: {
  //       _id: user._id,
  //       email: user.email,
  //     },
  //   });

  //   return {
  //     _id: application._id,
  //     job: application.job,
  //     status: application.status,
  //     createdAt: application.createdAt,
  //   };
  // }

  //Candidate xem hồ sơ của mình

  async create(dto: CreateApplicationDto, user: IUser) {
    const { job, cvFileId, coverLetter } = dto;

    this.validateObjectId(job);
    this.validateObjectId(cvFileId);

    const jobDoc = await this.jobService.findOne(job);
    if (jobDoc.status !== JobStatus.OPEN) {
      throw new BadRequestException('Job không nhận hồ sơ');
    }

    const file = await this.filesService.findById(cvFileId);

    // 🔥 check ownership
    if (file.ownerId.toString() !== user._id.toString()) {
      throw new ForbiddenException('Không phải CV của bạn');
    }

    // 🔥 check status
    if (file.status !== FileStatus.ACTIVE) {
      throw new BadRequestException('CV không sẵn sàng để apply');
    }

    // check duplicate apply
    const existed = await this.applicationModel.findOne({
      job,
      candidate: user._id,
      status: { $ne: ApplicationStatus.WITHDRAWN },
    });

    if (existed) {
      throw new ConflictException('Bạn đã apply job này');
    }

    const application = await this.applicationModel.create({
      job: new mongoose.Types.ObjectId(job),
      candidate: user._id,
      cvFileId,
      coverLetter,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    // 🔥 mark file IN_USE
    await this.filesService.markAsInUse(cvFileId);

    return application;
  }

  async findMyApplications(query: QueryApplicationDto, user: IUser) {
    const { page = 1, limit = 10, status, sort } = query;
    const skip = (page - 1) * limit;

    const filter: any = { candidate: user._id };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.applicationModel
        .find(filter)
        .populate({
          path: 'job',
          select: 'title company location salary jobType status',
          populate: { path: 'company', select: 'name logo' },
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        .select('-__v'),
      this.applicationModel.countDocuments({
        ...filter,
        isDeleted: { $ne: true },
      }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  //HR xem hồ sơ ứng tuyển vào job của mình
  async findByJob(jobId: string, query: QueryApplicationDto, user: IUser) {
    this.validateObjectId(jobId, 'Job ID');

    //kiểm tra job có phải của HR không
    const jobDoc = await this.jobService.findOne(jobId);
    const roleName = user.role.name;

    if (
      roleName !== 'ADMIN' &&
      this.extractId(jobDoc.createdByUser) !== user._id.toString()
    ) {
      throw new ForbiddenException('Bạn không có quyền xem hồ sơ của Job này');
    }

    const { page = 1, limit = 10, status, sort } = query;
    const skip = (page - 1) * limit;

    const filter: any = {
      job: new mongoose.Types.ObjectId(jobId),
    };

    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      this.applicationModel
        .find(filter)
        .populate({
          path: 'candidate',
          select:
            'email profile.fullName profile.phone profile.avartar candidateProfile.skills candidateProfile.experience',
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        .select('-__v'),
      this.applicationModel.countDocuments({
        ...filter,
        isDeleted: { $ne: true },
      }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  //admin xem tất cả
  async findAllAdmin(query: QueryApplicationDto) {
    const { page = 1, limit = 10, job, status, isDeleted, sort } = query;
    const skip = (page - 1) * limit;

    // Xem đã xoá → bypass pre hook
    if (isDeleted === true) {
      const matchFilter: any = { isDeleted: true };
      if (status) matchFilter.status = status;
      if (job) matchFilter.job = new mongoose.Types.ObjectId(job);

      const [data, total] = await Promise.all([
        this.applicationModel.aggregate([
          { $match: matchFilter },
          {
            $lookup: {
              from: 'jobs',
              localField: 'job',
              foreignField: '_id',
              as: 'job',
              pipeline: [{ $project: { title: 1 } }],
            },
          },
          { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
          { $sort: { createdAt: sort === SortOrder.ASC ? 1 : -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: { __v: 0 } },
        ]),
        this.applicationModel.aggregate([
          { $match: matchFilter },
          { $count: 'total' },
        ]),
      ]);

      return {
        meta: {
          page,
          limit,
          total: total[0]?.total ?? 0,
          totalPages: Math.ceil((total[0]?.total ?? 0) / limit),
        },
        data,
      };
    }

    const filter: any = {};
    if (status) filter.status = status;
    if (job) {
      this.validateObjectId(job, 'Job ID');
      filter.job = new mongoose.Types.ObjectId(job);
    }

    const [data, total] = await Promise.all([
      this.applicationModel
        .find(filter)
        .populate({ path: 'job', select: 'title location salary' })
        .populate({ path: 'candidate', select: 'email profile.fullName' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        .select('-__v'),
      this.applicationModel.countDocuments({
        ...filter,
        isDeleted: { $ne: true },
      }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  async findOne(id: string): Promise<ApplicationDocument> {
    this.validateObjectId(id);

    const application = await this.applicationModel
      .findById(id)
      .populate({ path: 'job', select: 'title location salary status' })
      .populate({ path: 'candidate', select: 'email profile.fullName' })
      .select('-__v')
      .exec();

    if (!application) {
      throw new NotFoundException('Không tìm thấy hồ sơ');
    }

    return application;
  }

  async updateStatus(id: string, dto: UpdateStatusDto, user: IUser) {
    this.validateObjectId(id);

    const application = await this.findOne(id);
    const roleName = user.role.name;

    //Kiểm tra HR có phải chủ job không
    const jobId = this.extractId(application.job);
    const jobDoc = await this.jobService.findOne(jobId);

    if (
      roleName !== 'ADMIN' &&
      this.extractId(jobDoc.createdByUser) !== user._id.toString()
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật trạng thái hồ sơ này',
      );
    }

    //Không cho phép cập nhật hồ sơ đã rút
    if (application.status === ApplicationStatus.WITHDRAWN) {
      throw new BadRequestException('Không thể cập nhật hồ sơ đã bị rút');
    }

    //HR không được set status = withdrawn
    //Chỉ Candidate mới được rút hồ sơ
    if (dto.status === ApplicationStatus.WITHDRAWN) {
      throw new ForbiddenException('Chỉ Candidate mới được rút hồ sơ');
    }

    const updated = await this.applicationModel
      .findByIdAndUpdate(
        id,
        {
          status: dto.status,
          updatedBy: { _id: user._id, email: user.email },
        },
        { returnDocument: 'after' },
      )
      .select('-__v');

    return updated;
  }

  //candidate rút hồ sơ
  async withdraw(applicationId: string, user: IUser) {
    const app = await this.applicationModel.findById(applicationId);

    if (!app) {
      throw new NotFoundException('Không tìm thấy application');
    }

    // chỉ owner mới được withdraw
    if (app.candidate.toString() !== user._id.toString()) {
      throw new ForbiddenException('Bạn không có quyền rút hồ sơ');
    }

    if (app.status === ApplicationStatus.WITHDRAWN) {
      throw new BadRequestException('Bạn đã rút hồ sơ này rồi');
    }

    // update status
    app.status = ApplicationStatus.WITHDRAWN;
    await app.save();

    // kiểm tra CV còn được dùng ở app khác không
    const stillUsed = await this.applicationModel.exists({
      cvFileId: app.cvFileId,
      status: { $ne: ApplicationStatus.WITHDRAWN },
    });

    //nếu không còn dùng  ACTIVE lại
    if (!stillUsed) {
      await this.filesService.markAsActive(app.cvFileId.toString(), null);
    }

    return { message: 'Withdraw thành công' };
  }

  async remove(id: string, user: IUser) {
    this.validateObjectId(id);
    await this.findOne(id);

    await this.applicationModel.updateOne(
      { _id: id },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: { _id: user._id, email: user.email },
      },
    );

    return { message: 'Xoá hồ sơ thành công' };
  }
}
