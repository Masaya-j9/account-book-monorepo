import type { UsersLogoutOutput } from '@account-book-app/shared';
import { inject, injectable } from 'inversify';

import type { ITokenBlacklistRepository } from '../../domain/repositories/token-blacklist.repository.interface';
import { verifyAccessToken } from '../../infrastructre/auth/jwt';
import { TOKENS } from '../di/tokens';
import { UnexpectedLogoutUserError } from './logout-user.errors';

@injectable()
export class LogoutUserUseCase {
  @inject(TOKENS.TokenBlacklistRepository)
  private tokenBlacklistRepository!: ITokenBlacklistRepository;

  async execute(params: { token: string }): Promise<UsersLogoutOutput> {
    try {
      const payload = await verifyAccessToken(params.token);
      const tokenIdentifier = `${payload.sub}:${payload.iat}`;

      await this.tokenBlacklistRepository.add({
        tokenIdentifier,
        userId: Number(payload.sub),
        expiresAt: new Date(payload.exp * 1000),
      });

      return { success: true };
    } catch (cause) {
      throw new UnexpectedLogoutUserError({
        message: 'ログアウトに失敗しました',
        cause: cause instanceof Error ? cause : new Error(String(cause)),
      });
    }
  }
}
