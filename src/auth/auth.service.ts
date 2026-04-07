import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { CompaniesService } from '../companies/companies.service';
import ms, { StringValue } from 'ms';
import { Response } from 'express';
import { IUser } from '../common/interfaces/user.interface';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto.';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RegisterHrDto } from './dto/register-hr.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private rolesService: RolesService,
    private companiesService: CompaniesService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  //Helper tạo Access Token
  //mã hoá payload
  //payload đc giải mã trong JWTStrategy.validate()
  //Expires: 15p
  private generateAccessToken(payload: {
    _id: string;
    email: string;
    role: { _id: string; name: string };
  }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn:
        (this.configService.get<string>(
          'JWT_ACCESS_TOKEN_EXPIRE',
        ) as StringValue) ?? '15m',
    });
  }

  private generateRefreshToken(payload: { _id: string }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn:
        (this.configService.get<string>(
          'JWT_REFRESH_TOKEN_EXPIRE',
        ) as StringValue) ?? '7d',
    });
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const refreshExpire =
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRE') ?? '7d';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true, // JS không đọc được
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: ms(refreshExpire as StringValue),
    });
  }

  async register(dto: RegisterDto) {
    const { email, password, profile } = dto;

    // Kiểm tra email tồn tại
    const existed = await this.usersService.findByEmail(email);
    if (existed) {
      throw new ConflictException(`Email ${email} đã tồn tại`);
    }

    // Lấy role CANDIDATE từ DB
    // findByName trả về null nếu không tìm thấy
    const candidateRole = await this.rolesService.findByName('CANDIDATE');
    if (!candidateRole) {
      throw new BadRequestException(
        'Role CANDIDATE chưa được khởi tạo trong hệ thống',
      );
    }

    // Hash password trước khi lưu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user với role CANDIDATE
    const user = await this.usersService.createFromAuth({
      email,
      password: hashedPassword,
      role: candidateRole._id.toString(),
      profile: profile ?? {},
      isActive: true,
    });

    return {
      _id: user._id,
      email: user.email,
      role: 'CANDIDATE',
    };
  }

  // ───────────────────────────────────────────
  // REGISTER HR
  // ───────────────────────────────────────────
  async registerHr(dto: RegisterHrDto) {
    const {
      email,
      password,
      fullName,
      companyName,
      companyIndustry,
      companyWebsite,
      position,
    } = dto;

    // Kiểm tra email tồn tại
    const existed = await this.usersService.findByEmail(email);
    if (existed) {
      throw new ConflictException(`Email ${email} đã tồn tại`);
    }

    // Lấy role HR
    const hrRole = await this.rolesService.findByName('HR');
    if (!hrRole) {
      throw new BadRequestException(
        'Role HR chưa được khởi tạo trong hệ thống',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user HR — isActive: false chờ Admin duyệt
    const user = await this.usersService.createFromAuth({
      email,
      password: hashedPassword,
      role: hrRole._id.toString(),
      profile: { fullName },
      isActive: false, // ← chờ Admin duyệt
    });

    // Tạo Company mới — isActive: false chờ Admin duyệt
    // Dùng thông tin user vừa tạo làm systemUser
    const systemUser: IUser = {
      _id: user._id,
      email: user.email,
      role: { _id: hrRole._id, name: 'HR' },
    };

    const company = await this.companiesService.create(
      {
        name: companyName,
        industry: companyIndustry,
        website: companyWebsite,
      },
      systemUser,
    );

    // Gán company vào hrProfile
    await this.usersService.updateHrCompany(
      user._id.toString(),
      company._id.toString(),
      position,
    );

    return {
      _id: user._id,
      email: user.email,
      role: 'HR',
      isActive: false,
      message: 'Đăng ký thành công! Vui lòng chờ Admin duyệt tài khoản.',
    };
  }

  // ───────────────────────────────────────────
  // LOGIN
  //
  // Luồng:
  // 1. Tìm user theo email
  // 2. Kiểm tra isActive
  // 3. Verify password bằng bcrypt.compare()
  // 4. Tạo AccessToken + RefreshToken
  // 5. Hash RefreshToken → lưu DB
  // 6. Set RefreshToken vào cookie
  // 7. Trả về AccessToken + user info
  // ───────────────────────────────────────────

  async login(dto: LoginDto, res: Response) {
    const { email, password } = dto;

    // Bước 1 — Tìm user
    // findByEmail tự select('+password') để lấy password
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Không tiết lộ email có tồn tại không
      // → Tránh attacker dò email
      throw new UnauthorizedException('Email hoặc password không đúng');
    }

    // Bước 2 — Kiểm tra isActive
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản đã bị khoá hoặc chưa được Admin duyệt',
      );
    }

    // Bước 3 — Verify password
    // bcrypt.compare(plainText, hashedText)
    // → So sánh password FE gửi lên với hashed password trong DB
    // → Không thể reverse hash → an toàn
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc password không đúng');
    }

    // Bước 4 — Tạo tokens
    const payload = {
      _id: user._id.toString(),
      email: user.email,
      role: {
        _id: (user.role as any)._id.toString(),
        name: (user.role as any).name,
      },
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({
      _id: user._id.toString(),
    });

    // Bước 5 — Hash RefreshToken → lưu DB
    // Lý do hash: nếu DB bị leak
    // → attacker không dùng được refreshToken
    await this.usersService.updateRefreshToken(
      user._id.toString(),
      refreshToken,
    );

    // Bước 6 — Set RefreshToken vào httpOnly cookie
    this.setRefreshTokenCookie(res, refreshToken);

    // Bước 7 — Trả về AccessToken + user info
    // Không trả về RefreshToken trong body
    // → RefreshToken chỉ nằm trong cookie
    return {
      accessToken,
      user: {
        _id: user._id,
        email: user.email,
        role: {
          _id: (user.role as any)._id,
          name: (user.role as any).name,
        },
        profile: user.profile,
        isActive: user.isActive,
      },
    };
  }

  // ───────────────────────────────────────────
  // REFRESH TOKEN
  //
  // Dùng RefreshToken từ cookie
  // → Cấp AccessToken mới
  // → Rotate RefreshToken (tạo mới mỗi lần refresh)
  //
  // Rotate RefreshToken:
  // → Mỗi lần refresh → RefreshToken cũ bị xoá
  // → Nếu attacker có RefreshToken cũ → không dùng được
  // ───────────────────────────────────────────
  async refreshToken(user: IUser, res: Response) {
    const payload = {
      _id: user._id.toString(),
      email: user.email,
      role: {
        _id: user.role._id.toString(),
        name: user.role.name,
      },
    };

    // Tạo AccessToken mới
    const accessToken = this.generateAccessToken(payload);

    // Rotate RefreshToken — tạo mới mỗi lần refresh
    const newRefreshToken = this.generateRefreshToken({
      _id: user._id.toString(),
    });

    // Cập nhật RefreshToken mới vào DB
    await this.usersService.updateRefreshToken(
      user._id.toString(),
      newRefreshToken,
    );

    // Set RefreshToken mới vào cookie
    this.setRefreshTokenCookie(res, newRefreshToken);

    return { accessToken };
  }

  // ───────────────────────────────────────────
  // LOGOUT
  // → Xoá RefreshToken khỏi DB
  // → Clear cookie
  // ───────────────────────────────────────────
  async logout(userId: string, res: Response) {
    // Xoá RefreshToken trong DB
    // → null → updateRefreshToken tự xử lý
    await this.usersService.updateRefreshToken(userId, null);

    // Clear cookie trên browser
    res.clearCookie('refresh_token');

    return { message: 'Đăng xuất thành công' };
  }
}
