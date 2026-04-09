import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Permission, PermissionSchema } from './schemas/permission.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schemas';
import { DiscoveryModule } from '@nestjs/core';
import { PermissionSyncService } from './permission-sync.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Permission.name, schema: PermissionSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    DiscoveryModule,
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionSyncService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
