import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    // PassportModule — đăng ký passport vào NestJS
    // defaultStrategy: 'jwt' → mặc định dùng JwtStrategy
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule.register({}) — không config gì ở đây
    // Vì mỗi strategy tự config secret + expiresIn riêng
    // Trong generateAccessToken() và generateRefreshToken()
    JwtModule.register({}),

    // Import các module cần thiết
    UsersModule, // ← UsersService: findByEmail, updateRefreshToken...
    RolesModule, // ← RolesService: findByName (lấy role CANDIDATE/HR)
    CompaniesModule, // ← CompaniesService: tạo company khi HR đăng ký
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // ← verify AccessToken
    JwtRefreshStrategy, // ← verify RefreshToken
  ],
  // Export AuthService nếu module khác cần dùng
  exports: [AuthService],
})
export class AuthModule {}
