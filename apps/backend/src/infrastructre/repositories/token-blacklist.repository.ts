import { eq, type NodePgDatabase, tokenBlacklists } from '@account-book-app/db';
import { inject, injectable } from 'inversify';

import type { ITokenBlacklistRepository } from '../../domain/repositories/token-blacklist.repository.interface';
import { TOKENS } from '../../services/di/tokens';

@injectable()
export class TokenBlacklistRepository implements ITokenBlacklistRepository {
  @inject(TOKENS.Db)
  private db!: NodePgDatabase;

  async add(params: {
    tokenIdentifier: string;
    userId: number;
    expiresAt: Date;
  }): Promise<void> {
    await this.db.insert(tokenBlacklists).values({
      tokenIdentifier: params.tokenIdentifier,
      userId: params.userId,
      expiresAt: params.expiresAt,
    });
  }

  async exists(tokenIdentifier: string): Promise<boolean> {
    const [record] = await this.db
      .select({ id: tokenBlacklists.id })
      .from(tokenBlacklists)
      .where(eq(tokenBlacklists.tokenIdentifier, tokenIdentifier))
      .limit(1);

    return record !== undefined;
  }
}
