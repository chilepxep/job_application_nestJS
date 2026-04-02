import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schemas';
import { RolesModule } from 'src/roles/roles.module';
import { CompaniesModule } from 'src/companies/companies.module';
import { ProfileStrategyModule } from 'src/common/strategies/profile/profile-strategy.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RolesModule,
    CompaniesModule,
    ProfileStrategyModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
