import { BadRequestException, Injectable } from '@nestjs/common';
import { IProfileStrategy } from './profile.strategy.interface';
import { UserDocument } from '../../../users/schemas/user.schemas';

@Injectable()
export class CandidateStrategy implements IProfileStrategy {
  initProfile(): Record<string, any> {
    return {
      candidateProfile: {
        cvFileIds: [],
        skills: [],
        experience: 0,
        currentPosition: '',
        desiredSalary: 0,
        desiredLocation: '',
        subscription: {
          plan: 'free',
          cvPushCount: 0,
          canViewCompetitors: false,
          isHighlighted: false,
          canTrackView: false,
          expiredAt: null,
          isActive: false,
        },
      },
      hrProfile: null,
    };
  }

  async buildUpdate(dto: Record<string, any>): Promise<Record<string, any>> {
    // Build dot notation
    const result: Record<string, any> = {};
    Object.keys(dto).forEach((key) => {
      result[`candidateProfile.${key}`] = dto[key];
    });
    return result;
  }
}
