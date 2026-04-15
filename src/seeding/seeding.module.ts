import { Module } from '@nestjs/common';
import { SeedingService } from './seeding.service';
import { SeedingController } from './seeding.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schemas';
import {
  Permission,
  PermissionSchema,
} from '../permissions/schemas/permission.schema';
import { CompaniesSchema, Company } from '../companies/schemas/company.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schemas';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from '../config/database.config';
import jwtConfig from '../config/jwt.config';
import Joi from 'joi';

@Module({
  controllers: [SeedingController],
  providers: [SeedingService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        MONGO_URL: Joi.string().required(),
      }),
    }),
    //connect mongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.url'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: Company.name, schema: CompaniesSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
})
export class SeedingModule {}
