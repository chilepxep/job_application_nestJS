import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { Public, ResponseMessage } from '../decorator/customize';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../decorator/current-user.decorator';
import { IUser } from '../common/interfaces/user.interface';
import { RegisterDto } from './dto/register.dto.';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RegisterHrDto } from './dto/register-hr.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ───────────────────────────────────────────
  // POST /api/v1/auth/register
  // Candidate tự đăng ký
  // @Public() → bypass JwtAuthGuard + PermissionGuard
  // Không cần token
  // ───────────────────────────────────────────
  @Post('register')
  @Public()
  @ResponseMessage('Đăng ký thành công')
  @ApiOperation({ summary: 'Candidate đăng ký tài khoản' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ───────────────────────────────────────────
  // POST /api/v1/auth/register/hr
  // HR đăng ký — chờ Admin duyệt
  // Static route phải đứng trước :id
  // ───────────────────────────────────────────
  @Post('register/hr')
  @Public()
  @ResponseMessage('Đăng ký HR thành công, vui lòng chờ Admin duyệt')
  @ApiOperation({ summary: 'HR đăng ký tài khoản' })
  registerHr(@Body() dto: RegisterHrDto) {
    return this.authService.registerHr(dto);
  }

  // ───────────────────────────────────────────
  // POST /api/v1/auth/login
  //
  // @HttpCode(HttpStatus.OK)
  // → Mặc định POST trả về 201
  // → Đổi thành 200 cho login
  //
  // @Res({ passthrough: true })
  // → Inject Express Response object
  // → passthrough: true → vẫn để NestJS xử lý response
  //   Nếu không có passthrough → phải tự gọi res.json()
  // → Dùng để set cookie refresh_token
  // ───────────────────────────────────────────
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đăng nhập thành công')
  @ApiOperation({ summary: 'Đăng nhập' })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  // ───────────────────────────────────────────
  // POST /api/v1/auth/refresh
  //
  // @Public() → bypass JwtAuthGuard
  // @UseGuards(JwtRefreshGuard) → dùng JwtRefreshGuard thay thế
  //
  // Tại sao cần cả 2?
  // → @Public() tắt JwtAuthGuard (không check AccessToken)
  // → @UseGuards(JwtRefreshGuard) bật JwtRefreshGuard (check RefreshToken từ cookie)
  // ───────────────────────────────────────────
  @Post('refresh')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Làm mới access token thành công')
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  refresh(
    @CurrentUser() user: IUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    // user được lấy từ req.user
    // đã được JwtRefreshStrategy.validate() gắn vào
    return this.authService.refreshToken(user, res);
  }

  // ───────────────────────────────────────────
  // POST /api/v1/auth/logout
  //
  // Cần JWT AccessToken hợp lệ
  // → Không @Public() → JwtAuthGuard tự động check
  // ───────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đăng xuất thành công')
  @ApiOperation({ summary: 'Đăng xuất' })
  @ApiBearerAuth('access-token')
  logout(
    @CurrentUser() user: IUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(user._id.toString(), res);
  }

  // ───────────────────────────────────────────
  // GET /api/v1/auth/me
  // Lấy thông tin user từ AccessToken
  // Không query DB — lấy thẳng từ req.user
  // → Nhanh hơn vì không có round trip DB
  // ───────────────────────────────────────────
  @Get('me')
  @ResponseMessage('Lấy thông tin thành công')
  @ApiOperation({ summary: 'Lấy thông tin user từ token' })
  @ApiBearerAuth('access-token')
  getMe(@CurrentUser() user: IUser) {
    // req.user đã được JwtStrategy.validate() gắn vào
    // Trả về thẳng không cần query DB
    return user;
  }
}
