import type { UsersLogoutOutput } from '@account-book-app/shared';
import { inject, injectable } from 'inversify';

import type { ITokenBlacklistRepository } from '../../domain/repositories/token-blacklist.repository.interface';
import type { IVerifyJwtTokenProvider } from '../auth/verify-jwt.service';
import { VerifyJwtAuthError } from '../auth/verify-jwt.service';
import { TOKENS } from '../di/tokens';
import {
  LogoutUserAuthError,
  UnexpectedLogoutUserError,
} from './logout-user.errors';

@injectable()
export class LogoutUserUseCase {
  @inject(TOKENS.TokenBlacklistRepository)
  private tokenBlacklistRepository!: ITokenBlacklistRepository;

  @inject(TOKENS.VerifyJwtTokenProvider)
  private verifyJwtTokenProvider!: IVerifyJwtTokenProvider;

  async execute(params: { token: string }): Promise<UsersLogoutOutput> {
    try {
      const payload = await this.verifyJwtTokenProvider.verify(params.token);
      const tokenIdentifier = `${payload.sub}:${payload.iat}`;

      await this.tokenBlacklistRepository.add({
        tokenIdentifier,
        userId: Number(payload.sub),
        expiresAt: new Date(payload.exp * 1000),
      });

      return { success: true };
    } catch (cause) {
      if (cause instanceof VerifyJwtAuthError) {
        throw new LogoutUserAuthError({
          message: cause.message,
          cause,
        });
      }
      throw new UnexpectedLogoutUserError({
        message: 'ログアウトに失敗しました',
        cause: cause instanceof Error ? cause : new Error(String(cause)),
      });
    }
  }
}
