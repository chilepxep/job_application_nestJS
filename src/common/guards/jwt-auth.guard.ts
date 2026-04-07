// AuthGuard('jwt') → kết nối với JwtStrategy có tên 'jwt'
// Khi canActivate() được gọi → tự động chạy JwtStrategy.validate()

import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../decorator/customize';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Reflector → đọc metadata từ decorator
  // VD: đọc IS_PUBLIC_KEY từ @Public()
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    // Reflector.getAllAndOverride() → đọc metadata
    // Ưu tiên: method decorator trước, class decorator sau
    // VD:
    // @Public() trên method → isPublic = true
    // @Public() trên class  → isPublic = true
    // Không có @Public()    → isPublic = undefined → falsy
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // decorator trên method
      context.getClass(), // decorator trên class
    ]);

    // Route có @Public() → bỏ qua verify token
    // Cho vào luôn không cần token
    if (isPublic) return true;

    // Không có @Public() → gọi AuthGuard('jwt')
    // → tự động chạy JwtStrategy để verify token
    return super.canActivate(context);
  }

  // handleRequest() được gọi sau khi JwtStrategy.validate() xong
  // err   → lỗi từ passport
  // user  → kết quả từ JwtStrategy.validate()
  handleRequest(err: any, user: any) {
    // Có lỗi hoặc không có user → throw 401
    if (err || !user) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    // Trả về user → NestJS tự gắn vào req.user
    return user;
  }
}
