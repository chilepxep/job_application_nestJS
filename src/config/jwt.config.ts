// src/config/jwt.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET,
  accessTokenExpire: process.env.JWT_ACCESS_TOKEN_EXPIRE,
  refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
  refreshTokenExpire: process.env.JWT_REFRESH_TOKEN_EXPIRE,
}));
