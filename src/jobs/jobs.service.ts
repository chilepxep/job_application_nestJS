import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job, jobDocument, JobStatus } from './schemas/job.schema';
import mongoose, { Model } from 'mongoose';
import { IUser } from '../common/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { QueryJobDto } from './dto/query-job.dto';
import { SortOrder } from '../permissions/dto/query-permission.dto';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name)
    private jobModel: Model<jobDocument>,
    private usersService: UsersService,
    private companiesService: CompaniesService,
  ) {}

  private validateObjectId(id: string, field = 'ID') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${field} không hợp lệ`);
    }
  }

  async create(createJobDto: CreateJobDto, user: IUser) {
    const roleName = user.role.name;
    let companyId: string;

    if (roleName === 'HR') {
      //HR lấy company từ hrProfile
      //không lấy companyId từ Dto
      const hrUser = await this.usersService.findOne(user._id.toString());
      const company = hrUser.hrProfile?.company;

      if (!company) {
        throw new BadRequestException(
          'Bạn chưa tham gia công ty. Vui lòng cập nhật công ty trong tài khoản',
        );
      }

      companyId = company.toString();
      //kiểm tra công ty được phê duyệt chưa
      const companyDoc = await this.companiesService.findOne(companyId);
      if (!companyDoc) {
        throw new BadRequestException('Công ty của bạn chưa được admin duyệt');
      }
      //kiểm tra giới hạn job theo subscription
      const jobCount = await this.jobModel.countDocuments({
        company: companyId,
        //các job chưa bị xoá
        isDeleted: { $ne: true },
      });

      if (jobCount >= companyDoc.subscription.jobPostLimit) {
        throw new BadRequestException(`
          Công ty đã đạt giới hạn ${companyDoc.subscription.jobPostLimit} job. Vui lòng nâng cấp gói.
          `);
      }
    } else if (roleName === 'ADMIN') {
      //admin cần truyền companyId vào Dto
      if (!createJobDto.company) {
        throw new BadRequestException(`
          Admin phải truyền CompanyId khi tạo Job`);
      }
      if (!mongoose.Types.ObjectId.isValid(createJobDto.company)) {
        throw new BadRequestException('companyId không hợp lệ');
      }
      companyId = createJobDto.company;
      //kiểm tra công ty có tồn tại không
      const companyDoc = await this.companiesService.findOne(companyId);
      if (!companyDoc.isActive) {
        throw new BadRequestException('Công ty chưa được phê duyệt');
      }
      const jobCount = await this.jobModel.countDocuments({
        company: companyId,
        isDeleted: { $ne: true },
      });

      if (jobCount >= companyDoc.subscription?.jobPostLimit) {
        throw new BadRequestException(
          `Công ty đã đạt giới hạn ${companyDoc.subscription.jobPostLimit} job.`,
        );
      }
    } else {
      throw new BadRequestException('Bạn không có quyền tạo job');
    }
    const job = await this.jobModel.create({
      ...createJobDto,
      company: new mongoose.Types.ObjectId(companyId),
      createdByUser: user._id,
      // HR tạo → pending chờ duyệt
      // Admin tạo → open luôn
      status: roleName === 'ADMIN' ? JobStatus.OPEN : JobStatus.PENDING,
      createdBy: { _id: user._id, email: user.email },
    });

    return {
      _id: job._id,
      title: job.title,
      status: job.status,
      createdAt: job.createdAt,
    };
  }

  //candidate xem job đang mở
  async findAllPublic(query: QueryJobDto) {
    const {
      page = 1,
      limit = 10,
      title,
      company,
      location,
      jobType,
      skill,
      sort,
    } = query;
    const skip = (page - 1) * limit;

    //chỉ lấy job đang OPEN
    const filter: any = { status: JobStatus.OPEN, isDeleted: { $ne: true } };
    if (title) filter.$text = { $search: title };
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (jobType) filter.jobType = jobType;
    if (skill) {
      const skills = Array.isArray(skill) ? skill : [skill];
      filter.skills = { $in: skills };
    }
    if (company) {
      this.validateObjectId(company, 'Company ID');
      filter.company = new mongoose.Types.ObjectId(company);
    }

    const [data, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .populate({ path: 'company', select: 'name logo industry' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        .select('-__v -createdBy -updatedBy -deletedBy')
        .lean(),
      ,
      this.jobModel.countDocuments({ ...filter, isDeleted: { $ne: true } }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  //Admin xem tất cả các job
  async findAllAdmin(query: QueryJobDto) {
    const {
      page = 1,
      limit = 10,
      title,
      company,
      location,
      jobType,
      status,
      isDeleted,
      sort,
    } = query;
    const skip = (page - 1) * limit;

    //xem job đã xoá
    if (isDeleted === true) {
      const matchFilter: any = { isDeleted: true };
      if (title) matchFilter.title = { $regex: title, $options: 'i' };
      if (status) matchFilter.status = status;
      const [data, total] = await Promise.all([
        this.jobModel.aggregate([
          { $match: matchFilter },
          {
            $lookup: {
              from: 'companies',
              localField: 'company',
              foreignField: '_id',
              as: 'company',
              pipeline: [{ $project: { name: 1, logo: 1 } }],
            },
          },
          { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
          { $sort: { createdAt: sort === SortOrder.ASC ? 1 : -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: { __v: 0 } },
        ]),
        this.jobModel.aggregate([{ $match: matchFilter }, { $count: 'total' }]),
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
    if (title) filter.title = { $regex: title, $options: 'i' };
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (jobType) filter.jobType = jobType;
    if (status) filter.status = status;
    if (company) {
      this.validateObjectId(company, 'Company ID');
      filter.company = new mongoose.Types.ObjectId(company);
    }

    const [data, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .populate({ path: 'company', select: 'name logo industry' })
        .populate({ path: 'createdByUser', select: 'email profile.fullName' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        .select('-__v'),
      this.jobModel.countDocuments({ ...filter, isDeleted: { $ne: true } }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  //Hr chỉ xem job của công ty mình
  async findMyJobs(query: QueryJobDto, user: IUser) {
    const { page = 1, limit = 10, title, status, sort } = query;
    const skip = (page - 1) * limit;

    const filter: any = { createdByUser: user._id };
    if (title) filter.title = { $regex: title, $options: 'i' };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .populate({ path: 'company', select: 'name logo' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        .select('-__v'),
      this.jobModel.countDocuments({ ...filter, isDeleted: { $ne: true } }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  //xem job của công ty mình
  async findMyCompanyJobs(query: QueryJobDto, user: IUser) {
    const { page = 1, limit = 10, title, status, sort } = query;
    const skip = (page - 1) * limit;

    const hrUser = await this.usersService.findOne(user._id.toString());
    const company = hrUser.hrProfile?.company;

    if (!company) {
      throw new BadRequestException(
        'Bạn chưa được gán công ty trong hrProfile',
      );
    }

    const filter: any = {
      company: new mongoose.Types.ObjectId(company.toString()),
      isDeleted: { $ne: true },
    };

    if (title) filter.title = { $regex: title, $options: 'i' };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .populate({ path: 'company', select: 'name logo' })
        .populate({ path: 'createdByUser', select: 'email profile.fullName' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: sort === SortOrder.ASC ? 1 : -1 })
        .select('-__v')
        .lean(), // 🚀 tối ưu

      this.jobModel.countDocuments(filter),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data,
    };
  }

  async findOne(id: string): Promise<jobDocument> {
    this.validateObjectId(id);

    const job = await this.jobModel
      .findById(id)
      .populate({
        path: 'company',
        select: 'name logo website industry address',
      })
      .populate({ path: 'createdByUser', select: 'email profile.fullName' })
      .select('-__v')
      .exec();

    if (!job) {
      throw new NotFoundException('Không tìm thấy job');
    }

    return job;
  }

  //UPDATE — HR sửa job của mình, Admin sửa bất kỳ

  async update(id: string, dto: UpdateJobDto, user: IUser) {
    this.validateObjectId(id);

    const job = await this.findOne(id);
    const roleName = user.role.name;

    //HR chỉ được sửa job của mình
    if (
      roleName !== 'ADMIN' &&
      job.createdByUser?.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Bạn không có quyền sửa job này');
    }

    // HR không được tự set status = open
    // Chỉ Admin mới được duyệt job
    if (roleName !== 'ADMIN' && dto.status === JobStatus.OPEN) {
      throw new ForbiddenException('Chỉ Admin mới được duyệt job');
    }

    const updated = await this.jobModel
      .findByIdAndUpdate(
        id,
        {
          ...dto,
          updatedBy: { _id: user._id, email: user.email },
        },
        { returnDocument: 'after' },
      )
      .populate({ path: 'company', select: 'name logo industry' })
      .select('-__v');

    if (!updated) {
      throw new NotFoundException('Không tìm thấy job');
    }

    return updated;
  }

  //HR đóng/mở job của mình
  async toggleStatus(id: string, user: IUser) {
    this.validateObjectId(id);

    const job = await this.findOne(id);
    const roleName = user.role.name;

    // HR chỉ được toggle job của mình
    if (
      roleName !== 'ADMIN' &&
      job.createdByUser?.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền thay đổi trạng thái job này',
      );
    }

    // Chỉ toggle giữa open và closed
    // pending và expired không toggle được
    if (job.status === JobStatus.PENDING) {
      throw new BadRequestException(
        'Job đang chờ duyệt, không thể thay đổi trạng thái',
      );
    }

    if (job.status === JobStatus.EXPIRED) {
      throw new BadRequestException(
        'Job đã hết hạn, không thể thay đổi trạng thái',
      );
    }

    const newStatus =
      job.status === JobStatus.OPEN ? JobStatus.CLOSED : JobStatus.OPEN;

    const updated = await this.jobModel
      .findByIdAndUpdate(
        id,
        {
          status: newStatus,
          updatedBy: { _id: user._id, email: user.email },
        },
        { returnDocument: 'after' },
      )
      .select('-__v');

    return {
      _id: updated._id,
      title: updated.title,
      status: updated.status,
      message:
        newStatus === JobStatus.OPEN
          ? 'Mở tuyển dụng thành công'
          : 'Đóng tuyển dụng thành công',
    };
  }

  //Admin duyệt job
  async approve(id: string, user: IUser) {
    this.validateObjectId(id);

    const job = await this.findOne(id);

    if (job.status !== JobStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ duyệt được job đang ở trạng thái pending',
      );
    }

    const updated = await this.jobModel
      .findByIdAndUpdate(
        id,
        {
          status: JobStatus.OPEN,
          updatedBy: { _id: user._id, email: user.email },
        },
        { returnDocument: 'after' },
      )
      .select('-__v');

    return updated;
  }

  //xoá job
  async remove(id: string, user: IUser) {
    this.validateObjectId(id);
    await this.findOne(id);

    await this.jobModel.updateOne(
      { _id: id },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: { _id: user._id, email: user.email },
      },
    );

    return { message: 'Xoá job thành công' };
  }
}
