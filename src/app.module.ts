import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import Joi from 'joi';
import { TransformInterceptor } from './core/transform.interceptor';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { loggerConfig } from './config/logger.config';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SeedingModule } from './seeding/seeding.module';
import { SeedingService } from './seeding/seeding.service';
import { JobsModule } from './jobs/jobs.module';
import { ApplicationModule } from './application/application.module';
import { UploadModule } from './upload/upload.module';
import { FilesModule } from './files/files.module';
import uploadConfig from './config/upload.config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    //validation env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      load: [databaseConfig, jwtConfig, uploadConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        MONGO_URL: Joi.string().required(),

        IMAGE_STORAGE: Joi.string().valid('LOCAL', 'CLOUDINARY').required(),
        FILE_STORAGE: Joi.string().valid('LOCAL', 'SUPABASE').required(),

        CLOUDINARY_CLOUD_NAME: Joi.string().when('IMAGE_STORAGE', {
          is: 'CLOUDINARY',
          then: Joi.required(),
        }),

        SUPABASE_URL: Joi.string().when('FILE_STORAGE', {
          is: 'SUPABASE',
          then: Joi.required(),
        }),
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

    //rate limit
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 5, // 5 request/giây — Chặn spam
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 50, // 50 request/phút — Giới hạn tổng thể
      },
    ]),

    //logger
    WinstonModule.forRoot(loggerConfig),

    ScheduleModule.forRoot(),

    PermissionsModule,

    RolesModule,

    CompaniesModule,

    UsersModule,

    AuthModule,

    SeedingModule,

    JobsModule,

    ApplicationModule,

    UploadModule,

    FilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TransformInterceptor,
    //áp dụng cho tất cả rotue rate limit
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
