import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { extend } from 'joi';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { Request } from 'express';
import bcrypt from 'bcrypt';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      // Lấy RefreshToken từ cookie thay vì header
      // ExtractJwt.fromExtractors() → nhận array các hàm extract
      // Dùng array để có thể fallback nếu cần
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Lấy refresh_token từ cookie
          // cookieParser middleware đã parse cookie thành object
          // request.cookies = { refresh_token: 'eyJhbGci...' }
          return request?.cookies?.refresh_token ?? null;
        },
      ]),

      ignoreExpiration: false,

      // Dùng JWT_REFRESH_SECRET riêng
      // Khác với JWT_SECRET của AccessToken
      // → Nếu một secret bị lộ → không ảnh hưởng secret kia
      secretOrKey: configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),

      // passReqToCallback: true
      // → Truyền request vào validate()
      // → Cần để lấy refresh_token từ cookie trong validate()
      // → So sánh với hashed token trong DB
      passReqToCallback: true,
    });
  }
  async validate(request: Request, payload: { _id: string }) {
    // Bước 1 — Lấy refresh token từ cookie
    const refreshToken = request?.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không tồn tại');
    }
    // Bước 2 — Query DB lấy user kèm refreshToken
    // findOneWithRefreshToken dùng select('+refreshToken')
    // vì refreshToken có select: false trong schema
    const user = await this.usersService.findOneWithRefreshToken(payload._id);

    // Bước 3 — Kiểm tra user tồn tại và có refreshToken
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }
    if (!user.refreshToken) {
      // refreshToken = null → user đã logout
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
    // Bước 4 — So sánh token từ cookie với hashed token trong DB
    // bcrypt.compare(plainText, hashedText)
    // → refreshToken từ cookie (plain)
    // → user.refreshToken từ DB (hashed)
    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isMatch) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    // Bước 5 — Trả về user info → gắn vào req.user
    // AuthController.refresh() dùng req.user để tạo AccessToken mới
    return {
      _id: user._id,
      email: user.email,
      role: {
        _id: (user.role as any)._id,
        name: (user.role as any).name,
      },
    };
  }
}
