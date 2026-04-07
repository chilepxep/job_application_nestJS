import { BadRequestException, Injectable } from '@nestjs/common';
import { IProfileStrategy } from './profile.strategy.interface';
import { CompaniesService } from '../../../companies/companies.service';
import { UserDocument } from '../../../users/schemas/user.schemas';

@Injectable()
export class HrStrategy implements IProfileStrategy {
  constructor(private readonly companiesService: CompaniesService) {}

  initProfile(): Record<string, any> {
    return {
      hrProfile: {
        company: null,
        position: '',
      },
      candidateProfile: null,
    };
  }

  async buildUpdate(
    dto: Record<string, any>,
    currentUser: UserDocument,
  ): Promise<Record<string, any>> {
    if (dto.company) {
      const company = await this.companiesService.findOne(dto.company);
      if (!company.isActive) {
        throw new BadRequestException('Công ty chưa được Admin duyệt');
      }
    }

    const result: Record<string, any> = {};
    Object.keys(dto).forEach((key) => {
      result[`hrProfile.${key}`] = dto[key];
    });
    return result;
  }
}
