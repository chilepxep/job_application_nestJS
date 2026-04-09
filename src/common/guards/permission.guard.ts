// src/common/guards/permission.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../decorator/customize';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Bỏ qua nếu là public route
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const { method } = request;

    // Express tự parse route → trả về path pattern
    // VD: /api/v1/users/64a1b2c3 → /users/:id
    const routePath = request.route?.path;

    if (!routePath) return false;

    const permissions = user?.role?.permissions ?? [];

    // So sánh
    const hasPermission = permissions.some(
      (p: any) => p.method === method && p.apiPath === routePath,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    return true;
  }
}
