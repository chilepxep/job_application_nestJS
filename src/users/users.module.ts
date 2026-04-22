import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schemas';
import { RolesModule } from '../roles/roles.module';
import { CompaniesModule } from '../companies/companies.module';
import { ProfileStrategyModule } from '../common/strategies/profile/profile-strategy.module';
import { SubscriptionService } from './subscription.service';
import { FilesModule } from '../files/files.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RolesModule,
    CompaniesModule,
    ProfileStrategyModule,
    FilesModule,
    UploadModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, SubscriptionService],
  exports: [UsersService],
})
export class UsersModule {}
