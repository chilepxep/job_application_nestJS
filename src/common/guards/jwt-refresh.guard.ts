// src/modules/auth/guards/jwt-refresh.guard.ts

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// AuthGuard('jwt-refresh')
// → Kết nối với JwtRefreshStrategy có tên 'jwt-refresh'
// → Tự động gọi JwtRefreshStrategy.validate() khi request đến
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
