import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ITokenBlacklistRepository } from '../../domain/repositories/token-blacklist.repository.interface';
import type {
  IVerifyJwtTokenProvider,
  VerifiedTokenPayload,
} from '../auth/verify-jwt.service';
import { VerifyJwtAuthError } from '../auth/verify-jwt.service';
import {
  LogoutUserAuthError,
  UnexpectedLogoutUserError,
} from './logout-user.errors';
import { LogoutUserUseCase } from './logout-user.service';

const makeVerifyProvider = (): IVerifyJwtTokenProvider => ({
  verify: vi.fn(),
});

const makeRepo = (): ITokenBlacklistRepository => ({
  add: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(false),
});

// InversifyJS の @inject を使わずに直接プロパティに注入してテスト
const makeUseCase = (
  repo: ITokenBlacklistRepository,
  verifyProvider: IVerifyJwtTokenProvider,
) => {
  const useCase = new LogoutUserUseCase();
  Object.assign(useCase, {
    tokenBlacklistRepository: repo,
    verifyJwtTokenProvider: verifyProvider,
  });
  return useCase;
};

describe('LogoutUserUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('正常系', () => {
    it('有効なトークンでログアウトするとブラックリストに登録され { success: true } が返る', async () => {
      const payload = {
        sub: '42',
        email: 'user@example.com',
        iat: 1740000000,
        exp: 1740086400,
      };
      const verifyProvider = makeVerifyProvider();
      vi.mocked(verifyProvider.verify).mockResolvedValueOnce(
        payload as VerifiedTokenPayload,
      );

      const repo = makeRepo();
      const useCase = makeUseCase(repo, verifyProvider);

      const result = await useCase.execute({ token: 'valid.jwt.token' });

      expect(verifyProvider.verify).toHaveBeenCalledWith('valid.jwt.token');
      expect(repo.add).toHaveBeenCalledWith({
        tokenIdentifier: '42:1740000000',
        userId: 42,
        expiresAt: new Date(1740086400 * 1000),
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('異常系', () => {
    it('VerifyJwtAuthError がスローされると LogoutUserAuthError をスローする', async () => {
      const verifyProvider = makeVerifyProvider();
      vi.mocked(verifyProvider.verify).mockRejectedValueOnce(
        new VerifyJwtAuthError('JWTの有効期限が切れています'),
      );

      const repo = makeRepo();
      const useCase = makeUseCase(repo, verifyProvider);

      await expect(useCase.execute({ token: 'expired.token' })).rejects.toThrow(
        LogoutUserAuthError,
      );
    });

    it('VerifyJwtAuthError 以外のエラーは UnexpectedLogoutUserError をスローする', async () => {
      const verifyProvider = makeVerifyProvider();
      vi.mocked(verifyProvider.verify).mockRejectedValueOnce(
        new Error('JWT_SECRET が設定されていません'),
      );

      const repo = makeRepo();
      const useCase = makeUseCase(repo, verifyProvider);

      await expect(useCase.execute({ token: 'any.token' })).rejects.toThrow(
        UnexpectedLogoutUserError,
      );
    });

    it('リポジトリへの追加に失敗すると UnexpectedLogoutUserError をスローする', async () => {
      const payload: VerifiedTokenPayload = {
        sub: '42',
        email: 'user@example.com',
        iat: 1740000000,
        exp: 1740086400,
      };
      const verifyProvider = makeVerifyProvider();
      vi.mocked(verifyProvider.verify).mockResolvedValueOnce(payload);

      const repo = makeRepo();
      vi.mocked(repo.add).mockRejectedValueOnce(new Error('DB 接続エラー'));
      const useCase = makeUseCase(repo, verifyProvider);

      await expect(
        useCase.execute({ token: 'valid.jwt.token' }),
      ).rejects.toThrow(UnexpectedLogoutUserError);
    });
  });
});
