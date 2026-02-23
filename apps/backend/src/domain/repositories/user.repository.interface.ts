import type { User } from '../entities/user.entity';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;

  existsByEmail(email: string): Promise<boolean>;

  create(user: User): Promise<User>;
}
