import { Module } from '@nestjs/common';
import { CandidateStrategy } from './candidate.strategy';
import { HrStrategy } from './hr.strategy';
import { AdminStrategy } from './admin.strategy';
import { ProfileStrategyRegistry } from './profile-strategy.registry';
import { CompaniesModule } from '../../../companies/companies.module';

@Module({
  imports: [CompaniesModule],
  providers: [
    CandidateStrategy,
    HrStrategy,
    AdminStrategy,
    ProfileStrategyRegistry,
  ],
  exports: [ProfileStrategyRegistry],
})
export class ProfileStrategyModule {}
