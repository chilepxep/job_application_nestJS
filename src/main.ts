import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import compression from 'compression';
import { TransformInterceptor } from './core/transform.interceptor';
import { HttpExceptionFilter } from './core/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import path from 'path';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Dùng Winston thay logger mặc định của NestJS
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  //bảo vệ headers
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production'
          ? undefined // dùng default CSP strict khi production
          : false, // tắt CSP khi dev để Swagger hoạt động
    }),
  );

  //nén response
  app.use(compression({ threshold: 1024 })); //chỉ nén khi lớn hơn 1MB

  //đọc cookie từ req
  app.use(cookieParser());

  //version api
  app.setGlobalPrefix('api');

  // versioning
  app.enableVersioning({
    type: VersioningType.URI, // Versioning qua URI: /api/v1/users
    defaultVersion: '1', // Mặc định dùng v1
  });

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV');

  //bật khi môi trường khác production
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Job Application API')
      .setDescription('API document cho Job Application')
      .setVersion('1.0')
      .addBearerAuth(
        // Cho phép test API cần JWT
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
        },
        'access-token', // Tên scheme dùng  ở decorator
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // Giữ token sau khi refresh trang
      },
    });
  }

  // Validate request body tự động
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động xóa field không có trong DTO
      forbidNonWhitelisted: true, // Báo lỗi nếu có field lạ
      transform: true, // Tự động convert type
    }),
  );

  // Cho phép FE gọi API
  app.enableCors({
    origin: true, // Cho phép tất cả origin khi dev
    credentials: true, // Cho phép gửi cookie
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Đọc PORT từ config

  const port = configService.get<number>('PORT') ?? 3000;

  // Đăng ký TransformInterceptor chuẩn hoá dữ liệu trả về
  app.useGlobalInterceptors(app.get(TransformInterceptor));

  //guards
  const reflector = app.get(Reflector);

  // Đăng ký global guards
  // Thứ tự quan trọng:
  // 1. JwtAuthGuard  → verify token trước
  // 2. PermissionGuard → check quyền sau
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new PermissionGuard(reflector),
  );

  // filter
  app.useGlobalFilters(
    new HttpExceptionFilter(app.get(WINSTON_MODULE_NEST_PROVIDER)),
  );

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.enableShutdownHooks();
  await app.listen(port);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
}
bootstrap();
