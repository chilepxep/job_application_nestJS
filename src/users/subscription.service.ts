import { Injectable } from '@nestjs/common';
import { CANDIDATE_PLANS } from '../config/subscription.config';

@Injectable()
export class SubscriptionService {
  getCvLimit(plan: string): number {
    return CANDIDATE_PLANS[plan]?.cvLimit ?? 2;
  }
}
