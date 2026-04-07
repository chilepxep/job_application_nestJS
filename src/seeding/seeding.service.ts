import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import {
  Permission,
  PermissionDocument,
} from '../permissions/schemas/permission.schema';
import { User, UserDocument } from '../users/schemas/user.schemas';
import { INIT_PERMISSIONS } from './data_permission.seeding';
import {
  CompaniesDocument,
  Company,
} from '../companies/schemas/company.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schemas';

@Injectable()
export class SeedingService {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Company.name)
    private companyModel: Model<CompaniesDocument>,
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,
  ) {}

  async run() {
    this.logger.log('>>>>>>>Start seeding...');

    await this.seedPermissions();
    await this.seedRoles();
    await this.seedCompany();
    await this.seedAdmin();

    this.logger.log('>>>>>>>Done seeding!');
  }

  private async seedPermissions() {
    const existed = await this.permissionModel.exists({});
    if (existed) {
      this.logger.log('Permissions already exist → skip');
      return;
    }

    await this.permissionModel.insertMany(INIT_PERMISSIONS);

    this.logger.log('Seeded Permissions');
  }

  private async seedRoles() {
    const existed = await this.roleModel.exists({});
    if (existed) {
      this.logger.log('Roles already exist → skip');
      return;
    }

    const permissions = await this.permissionModel.find().select('_id');

    await this.roleModel.insertMany([
      {
        name: 'ADMIN',
        description: 'Quản trị hệ thống toàn quyền quyết định',
        permissions: permissions,
      },
      {
        name: 'HR',
        description: 'Người tuyển dụng hệ thống',
        isActive: true,
        permissions: [],
      },
      {
        name: 'CANDIDATE',
        description: 'Người dùng/Ứng viên sử dụng hệ thống',
        isActive: true,
        permissions: [],
      },
    ]);

    this.logger.log('Seeded Roles');
  }

  private async seedCompany() {
    const existed = await this.companyModel.exists({});
    if (existed) {
      this.logger.log('Company already exist → skip');
      return;
    }

    await this.companyModel.insertMany([
      {
        name: 'Google',
        logo: 'https://storage.example.com/logo.png',
        website: 'https://google.com',
        description: 'Là công ty hàng đầu thế giới',
        industry: 'Công nghệ thông tin',
        address: {
          street: 'Hoà Hảo',
          city: 'Hồ Chí Minh',
          province: 'Hồ Chí Minh',
        },
        isActive: true,
        createdByUser: new Types.ObjectId(),
        subscription: {
          plan: 'free',
          jobPostLimit: 3,
          pushTopCount: 0,
          aiRecommend: false,
          expiredAt: null,
          isActive: true,
        },
        createdBy: {
          _id: new Types.ObjectId(),
          email: 'system@seed.com',
        },
      },
    ]);

    this.logger.log('Seeded company');
  }

  private async seedAdmin() {
    const existed = await this.userModel.exists({
      email: 'binhle@gmail.com',
    });

    if (existed) {
      this.logger.log('Admin already exists → skip');
      return;
    }

    const roleAdmin = await this.roleModel.findOne({ name: 'ADMIN' });
    const roleHR = await this.roleModel.findOne({ name: 'HR' });
    const roleCandidate = await this.roleModel.findOne({ name: 'CANDIDATE' });
    const seedcompany = await this.companyModel.findOne({ name: 'Google' });

    if (!roleAdmin || !roleHR || !roleCandidate) {
      throw new Error('Roles chưa được seed');
    }

    if (!seedcompany) {
      throw new Error('Company chưa được seed');
    }

    const hashedPassword = await bcrypt.hash('123456', 10);

    await this.userModel.insertMany([
      {
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: roleAdmin!._id,
        profile: {
          fullName: 'admin',
          phone: '0000000000',
          gender: 'male',
        },
        isActive: true,
        createdBy: {
          _id: new Types.ObjectId(),
          email: 'system@seed.com',
        },
      },
      {
        email: 'binhle@gmail.com',
        password: hashedPassword,
        role: roleAdmin!._id,
        profile: {
          fullName: 'binhle',
          phone: '0000000000',
          gender: 'male',
        },
        isActive: true,
        createdBy: {
          _id: new Types.ObjectId(),
          email: 'system@seed.com',
        },
      },
      {
        email: 'hr@gmail.com',
        password: hashedPassword,
        role: roleHR!._id,
        profile: {
          fullName: 'hr',
          phone: '0000000000',
          gender: 'female',
        },
        hrProfile: {
          company: seedcompany._id,
          position: 'Quản lý tuyển dụng A',
        },

        isActive: true,
        createdBy: {
          _id: new Types.ObjectId(),
          email: 'system@seed.com',
        },
      },
      {
        email: 'candidate@gmail.com',
        password: hashedPassword,
        role: roleCandidate!._id,
        profile: {
          fullName: 'candidate',
          phone: '0000000000',
          gender: 'female',
        },
        candidateProfile: {
          cvUrl: [
            'https://storage.example.com/cv1.pdf',
            'https://storage.example.com/cv2.pdf',
          ],
          skills: ['NestJS', 'NodeJs', 'MongoDB'],
          experience: 2,
          currentPosition: '',
          desiredSalary: 18000000,
          desiredLocation: '',
          subscription: {
            plan: 'free',
            cvPushCount: 0,
            canViewCompetitors: false,
            isHighlighted: false,
            canTrackView: false,
            expiredAt: null,
            isActive: false,
          },
        },
        isActive: true,
        createdBy: {
          _id: new Types.ObjectId(),
          email: 'system@seed.com',
        },
      },
    ]);

    this.logger.log('Seeded Admin user');
  }
}
