import { SetMetadata } from '@nestjs/common';

export const PERMISSION_NAME_KEY = 'permissionName';
export const PERMISSION_MODULE_KEY = 'permissionModule';
export const PERMISSION_ROLES_KEY = 'permissionRoles';

//Decorator đánh dấu tên permission + module cho mỗi route
//Dùng để auto sync permissions khi app khởi động
export const ApiPermission = (
  name: string,
  module: string,
  defaultRoles: string[] = ['ADMIN'],
) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    SetMetadata(PERMISSION_NAME_KEY, name)(target, key, descriptor);
    SetMetadata(PERMISSION_MODULE_KEY, module)(target, key, descriptor);
    SetMetadata(PERMISSION_ROLES_KEY, defaultRoles)(target, key, descriptor);
    return descriptor;
  };
};
