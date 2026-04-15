import { Injectable } from '@nestjs/common';
import { IProfileStrategy } from './profile.strategy.interface';

@Injectable()
export class AdminStrategy implements IProfileStrategy {
  initProfile(): Record<string, any> {
    return {
      candidateProfile: null,
      hrProfile: null,
    };
  }

  async buildUpdate(): Promise<Record<string, any>> {
    return {};
  }
}
