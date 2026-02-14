import { eq, type NodePgDatabase, users } from '@account-book-app/db';
import { inject, injectable } from 'inversify';

import type {
  CreateUserData,
  UserRecord,
} from '../../domain/entities/user.entity';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { TOKENS } from '../../services/di/tokens';

@injectable()
export class UserRepository implements IUserRepository {
  @inject(TOKENS.Db)
  private db!: NodePgDatabase;

  async findByEmail(email: string): Promise<UserRecord | null> {
    const [record] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return record ?? null;
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    const [record] = await this.db
      .insert(users)
      .values({
        email: data.email,
        passwordHash: data.passwordHash.value,
        name: data.name,
      })
      .returning();

    return record;
  }
}
