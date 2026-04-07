import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  _id: string;
  email: string;
  role: {
    _id: string;
    name: string;
  };
}

//được gọi sau khi check jwtAuthGuard() @Public()
//file này giúp lấy token từ header -> verify token -> giải mã payload
//-> validate payload -> nạp vào req.user

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      //lấy token từ header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      //tự động reject token hết hạn
      ignoreExpiration: false,
      // Secret để verify chữ ký của token
      secretOrKey: configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
    });
  }

  //validate() được gọi SAU KHI passport-jwt verify token thành công
  //payload → data đã giải mã từ token
  //return value → gắn vào req.user
  async validate(payload: JwtPayload) {
    // Query DB để lấy thông tin mới nhất của user
    // Tránh trường hợp user bị khoá nhưng token vẫn còn hạn
    const user = await this.usersService.findByEmail(payload.email);

    if (!user) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khoá');
    }

    // Object này sẽ được gắn vào req.user
    // Các Guard và Controller dùng req.user
    return {
      _id: user._id,
      email: user.email,
      role: {
        _id: (user.role as any)._id,
        name: (user.role as any).name,
        // permissions dùng cho PermissionGuard
        permissions: (user.role as any).permissions,
      },
    };
  }
}
