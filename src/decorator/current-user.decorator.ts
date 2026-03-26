import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUser } from 'src/common/interfaces/user.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
