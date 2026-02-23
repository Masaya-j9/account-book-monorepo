import {
  and,
  eq,
  isNull,
  type NodePgDatabase,
  users,
} from '@account-book-app/db';
import { inject, injectable } from 'inversify';

import { User, type UserRecord } from '../../domain/entities/user.entity';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { PasswordHash } from '../../domain/values/password-hash';
import { TOKENS } from '../../services/di/tokens';

@injectable()
export class UserRepository implements IUserRepository {
  @inject(TOKENS.Db)
  private db!: NodePgDatabase;

  async findByEmail(email: string): Promise<User | null> {
    const [record] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return record ? this.toEntity(record) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const [record] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return record !== undefined;
  }

  async create(user: User): Promise<User> {
    const [record] = await this.db
      .insert(users)
      .values({
        email: user.email,
        passwordHash: user.passwordHash.value,
        name: user.name,
      })
      .returning();

    return this.toEntity(record);
  }

  private toEntity(record: UserRecord): User {
    return User.reconstruct(
      record.id,
      record.email,
      PasswordHash.reconstruct(record.passwordHash),
      record.name,
      record.createdAt,
      record.updatedAt,
    );
  }
}
