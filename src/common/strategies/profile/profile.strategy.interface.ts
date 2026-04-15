import { UserDocument } from '../../../users/schemas/user.schemas';

//interface quy định chung
export interface IProfileStrategy {
  initProfile(): Record<string, any>;
  buildUpdate(
    dto: Record<string, any>,
    currentUser: UserDocument,
  ): Promise<Record<string, any>>;
}
