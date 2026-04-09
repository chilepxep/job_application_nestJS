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

@Module({
  imports: [
    //validation env
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

    PermissionsModule,

    RolesModule,

    CompaniesModule,

    UsersModule,

    AuthModule,

    SeedingModule,

    JobsModule,
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
