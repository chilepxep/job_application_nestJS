// src/decorator/customize.ts
import { SetMetadata } from '@nestjs/common';
import { RESPONSE_MESSAGE } from '../core/transform.interceptor';

export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE, message);
