import type { CreateUserData, UserRecord } from '../entities/user.entity';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;

  create(data: CreateUserData): Promise<UserRecord>;
}
