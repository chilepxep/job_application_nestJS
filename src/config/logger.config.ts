// src/config/logger.config.ts
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

//Format log đẹp cho terminal
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.ms(),
  nestWinstonModuleUtilities.format.nestLike('App', {
    prettyPrint: true,
    colors: true,
  }),
);

//Format log cho file (không màu, dễ đọc)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Lưu cả stack trace
  winston.format.json(), //Lưu dạng JSON dễ parse
);

export const loggerConfig = {
  transports: [
    //Log ra terminal
    new winston.transports.Console({
      format: consoleFormat,
    }),

    //Lưu tất cả log vào file xoay vòng mỗi ngày
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true, // Nén file log cũ
      maxSize: '20m', // Tối đa 20MB/file
      maxFiles: '3d', // Giữ log 3 ngày tự xóa cũ hơn
      format: fileFormat,
    }),

    // Lưu riêng log lỗi để dễ theo dõi
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d', // Giữ log lỗi 3 ngày
      level: 'error', // Chỉ lưu lỗi
      format: fileFormat,
    }),
  ],
};
