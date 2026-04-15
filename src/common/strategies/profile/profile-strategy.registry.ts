import { Injectable } from '@nestjs/common';
import { IProfileStrategy } from './profile.strategy.interface';
import { CandidateStrategy } from './candidate.strategy';
import { HrStrategy } from './hr.strategy';
import { AdminStrategy } from './admin.strategy';

@Injectable()
export class ProfileStrategyRegistry {
  private readonly strategies: Map<string, IProfileStrategy>;

  constructor(
    private readonly candidateStrategy: CandidateStrategy,
    private readonly hrStrategy: HrStrategy,
    private readonly adminStrategy: AdminStrategy,
  ) {
    this.strategies = new Map<string, IProfileStrategy>([
      ['CANDIDATE', this.candidateStrategy],
      ['HR', this.hrStrategy],
      ['ADMIN', this.adminStrategy],
    ]);
  }

  getStrategy(roleName: string): IProfileStrategy {
    return this.strategies.get(roleName.toUpperCase()) ?? this.adminStrategy;
  }
}
