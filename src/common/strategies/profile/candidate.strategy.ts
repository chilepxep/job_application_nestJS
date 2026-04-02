import { BadRequestException, Injectable } from '@nestjs/common';
import { IProfileStrategy } from './profile.strategy.interface';
import { UserDocument } from 'src/users/schemas/user.schemas';

@Injectable()
export class CandidateStrategy implements IProfileStrategy {
  initProfile(): Record<string, any> {
    return {
      candidateProfile: {
        cvUrl: [],
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

  async buildUpdate(
    dto: Record<string, any>,
    currentUser: UserDocument,
  ): Promise<Record<string, any>> {
    // Kiểm tra giới hạn CV theo plan
    if (dto.cvUrl) {
      const maxCv: Record<string, number> = {
        free: 2,
        basic: 5,
        premium: 10,
      };
      const plan = currentUser.candidateProfile?.subscription?.plan ?? 'free';
      const limit = maxCv[plan] ?? 2;

      if (dto.cvUrl.length > limit) {
        throw new BadRequestException(
          `Gói ${plan} chỉ được upload tối đa ${limit} CV`,
        );
      }
    }

    // Build dot notation
    const result: Record<string, any> = {};
    Object.keys(dto).forEach((key) => {
      result[`candidateProfile.${key}`] = dto[key];
    });
    return result;
  }
}
