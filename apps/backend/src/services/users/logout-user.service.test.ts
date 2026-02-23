import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ITokenBlacklistRepository } from '../../domain/repositories/token-blacklist.repository.interface';
import { UnexpectedLogoutUserError } from './logout-user.errors';
import { LogoutUserUseCase } from './logout-user.service';

// verifyAccessToken をモック
vi.mock('../../infrastructre/auth/jwt', () => ({
  verifyAccessToken: vi.fn(),
}));

import { verifyAccessToken } from '../../infrastructre/auth/jwt';

const verifyAccessTokenMock = vi.mocked(verifyAccessToken);

const makeRepo = (): ITokenBlacklistRepository => ({
  add: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(false),
});

// InversifyJS の @inject を使わずに直接プロパティにリポジトリを注入してテスト
const makeUseCase = (repo: ITokenBlacklistRepository) => {
  const useCase = new LogoutUserUseCase();
  // private フィールドへのアクセス（テスト用途）
  Object.assign(useCase, { tokenBlacklistRepository: repo });
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
      verifyAccessTokenMock.mockResolvedValueOnce(payload);

      const repo = makeRepo();
      const useCase = makeUseCase(repo);

      const result = await useCase.execute({ token: 'valid.jwt.token' });

      expect(verifyAccessTokenMock).toHaveBeenCalledWith('valid.jwt.token');
      expect(repo.add).toHaveBeenCalledWith({
        tokenIdentifier: '42:1740000000',
        userId: 42,
        expiresAt: new Date(1740086400 * 1000),
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('異常系', () => {
    it('JWT 検証に失敗すると UnexpectedLogoutUserError をスローする', async () => {
      verifyAccessTokenMock.mockRejectedValueOnce(
        new Error('invalid signature'),
      );

      const repo = makeRepo();
      const useCase = makeUseCase(repo);

      await expect(useCase.execute({ token: 'invalid.token' })).rejects.toThrow(
        UnexpectedLogoutUserError,
      );
    });

    it('リポジトリへの追加に失敗すると UnexpectedLogoutUserError をスローする', async () => {
      const payload = {
        sub: '42',
        email: 'user@example.com',
        iat: 1740000000,
        exp: 1740086400,
      };
      verifyAccessTokenMock.mockResolvedValueOnce(payload);

      const repo = makeRepo();
      vi.mocked(repo.add).mockRejectedValueOnce(new Error('DB 接続エラー'));
      const useCase = makeUseCase(repo);

      await expect(
        useCase.execute({ token: 'valid.jwt.token' }),
      ).rejects.toThrow(UnexpectedLogoutUserError);
    });
  });
});
