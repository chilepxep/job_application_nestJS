import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';

import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { Role, RoleDocument } from '../roles/schemas/role.schemas';
import {
  PERMISSION_MODULE_KEY,
  PERMISSION_NAME_KEY,
  PERMISSION_ROLES_KEY,
} from '../decorator/api-permission.decorator';

interface RouteInfo {
  name: string;
  apiPath: string;
  method: string;
  module: string;
  defaultRoles: string[];
}

@Injectable()
export class PermissionSyncService implements OnModuleInit {
  private readonly logger = new Logger(PermissionSyncService.name);

  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,

    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,

    private discoveryService: DiscoveryService,
    private metadataScanner: MetadataScanner,
    private reflector: Reflector,
  ) {}

  async onModuleInit() {
    this.logger.log('🔄 Bắt đầu sync permissions...');
    await this.syncPermissions();
    this.logger.log('✅ Sync permissions hoàn tất');
  }

  async syncPermissions() {
    const routes = this.getAllRoutes();
    if (routes.length === 0) return;

    // Map: roleName → permissionIds[]
    // Dùng để gán permissions vào roles sau khi sync
    const rolePermissionsMap = new Map<string, string[]>();

    let created = 0;
    let skipped = 0;

    for (const route of routes) {
      let permission: PermissionDocument;

      const existed = await this.permissionModel.findOne({
        apiPath: route.apiPath,
        method: route.method,
      });

      if (existed) {
        // Cập nhật name/module nếu thay đổi
        if (existed.name !== route.name || existed.module !== route.module) {
          await this.permissionModel.updateOne(
            { _id: existed._id },
            { name: route.name, module: route.module },
          );
          this.logger.log(`📝 Cập nhật: ${route.method} ${route.apiPath}`);
        }
        permission = existed;
        skipped++;
      } else {
        // Tạo permission mới
        permission = await this.permissionModel.create({
          name: route.name,
          apiPath: route.apiPath,
          method: route.method,
          module: route.module,
        });
        created++;
        this.logger.log(`➕ Tạo mới: ${route.method} ${route.apiPath}`);
      }

      // Gom permissions theo role
      for (const roleName of route.defaultRoles) {
        if (!rolePermissionsMap.has(roleName)) {
          rolePermissionsMap.set(roleName, []);
        }
        rolePermissionsMap.get(roleName).push(permission._id.toString());
      }
    }

    // Gán permissions vào từng role
    await this.syncRolePermissions(rolePermissionsMap);

    this.logger.log(`📊 Kết quả: ${created} tạo mới, ${skipped} bỏ qua`);
  }

  // ───────────────────────────────────────────
  // Gán permissions vào roles
  // Dùng $addToSet → không tạo duplicate
  // ───────────────────────────────────────────
  private async syncRolePermissions(rolePermissionsMap: Map<string, string[]>) {
    for (const [roleName, permissionIds] of rolePermissionsMap) {
      const role = await this.roleModel.findOne({
        name: roleName.toUpperCase(),
      });

      if (!role) {
        this.logger.warn(`⚠️ Role ${roleName} chưa tồn tại trong DB — bỏ qua`);
        continue;
      }

      // $addToSet → thêm permissions mới
      // Không thêm trùng nếu đã có
      await this.roleModel.updateOne(
        { _id: role._id },
        {
          $addToSet: {
            permissions: {
              $each: permissionIds.map(
                (id) => new (require('mongoose').Types.ObjectId)(id),
              ),
            },
          },
        },
      );

      this.logger.log(
        `👤 Cập nhật role ${roleName}: +${permissionIds.length} permissions`,
      );
    }
  }

  // ───────────────────────────────────────────
  // Scan tất cả routes
  // ───────────────────────────────────────────
  private getAllRoutes(): RouteInfo[] {
    const routes: RouteInfo[] = [];
    const controllers = this.discoveryService.getControllers();

    for (const controller of controllers) {
      const instance = controller.instance;
      if (!instance) continue;

      const controllerPath = this.reflector.get<string>(
        PATH_METADATA,
        instance.constructor,
      );

      const methodNames = this.metadataScanner.getAllMethodNames(
        Object.getPrototypeOf(instance),
      );

      for (const methodName of methodNames) {
        const methodRef = instance[methodName];
        if (!methodRef) continue;

        const httpMethod = this.reflector.get<RequestMethod>(
          METHOD_METADATA,
          methodRef,
        );

        const routePath = this.reflector.get<string>(PATH_METADATA, methodRef);

        const permissionName = this.reflector.get<string>(
          PERMISSION_NAME_KEY,
          methodRef,
        );

        const permissionModule = this.reflector.get<string>(
          PERMISSION_MODULE_KEY,
          methodRef,
        );

        const defaultRoles = this.reflector.get<string[]>(
          PERMISSION_ROLES_KEY,
          methodRef,
        ) ?? ['ADMIN'];

        if (!permissionName || httpMethod === undefined) continue;

        const methodStr = RequestMethod[httpMethod];
        const fullPath = this.buildPath(controllerPath, routePath);

        routes.push({
          name: permissionName,
          apiPath: fullPath,
          method: methodStr,
          module: permissionModule ?? 'UNKNOWN',
          defaultRoles,
        });
      }
    }

    return routes;
  }

  private buildPath(controllerPath: string, routePath: string): string {
    const globalPrefix = 'api';
    const version = 'v1';

    const prefix = controllerPath
      ? `/${controllerPath.replace(/^\//, '')}`
      : '';
    const path = routePath ? `/${routePath.replace(/^\//, '')}` : '';

    const fullPath = `${prefix}${path}`.replace(/\/$/, '') || '/';

    // Thêm /api/v1 prefix
    return `/${globalPrefix}/${version}${fullPath}`;
  }
}
