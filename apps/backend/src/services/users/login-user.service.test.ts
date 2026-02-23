import { Container } from 'inversify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '../../domain/entities/user.entity';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { PasswordHash } from '../../domain/values/password-hash';
import type { ICreateJwtService } from '../auth/create-jwt.service';
import { TOKENS } from '../di/tokens';
import { InvalidCredentialsError } from './login-user.errors';
import { LoginUserUseCase } from './login-user.service';

describe('LoginUserUseCase（ログイン）', () => {
  const fixedNow = new Date('2025-01-01T00:00:00.000Z');
  const passwordHash = PasswordHash.reconstruct('salt:hash');

  const makeUser = (override?: { id?: number; email?: string }) =>
    User.reconstruct(
      override?.id ?? 1,
      override?.email ?? 'test@example.com',
      passwordHash,
      'テストユーザー',
      fixedNow,
      fixedNow,
    );

  const setup = (overrides?: Partial<IUserRepository>) => {
    const createJwtService: ICreateJwtService = {
      create: vi.fn(async () => 'test.jwt.token'),
    };

    const repo: IUserRepository = {
      findByEmail: vi.fn(async () => makeUser()),
      create: vi.fn(),
      ...overrides,
    };

    const container = new Container();
    container
      .bind<IUserRepository>(TOKENS.UserRepository)
      .toConstantValue(repo);
    container
      .bind<ICreateJwtService>(TOKENS.CreateJwtService)
      .toConstantValue(createJwtService);
    container.bind<LoginUserUseCase>(LoginUserUseCase).toSelf();

    const useCase = container.get(LoginUserUseCase);

    return { useCase, repo, createJwtService };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('正常系', () => {
    it('正しい認証情報でログインするとトークンを返す', async () => {
      vi.spyOn(PasswordHash.prototype, 'matches').mockResolvedValue(true);

      const { useCase, repo, createJwtService } = setup();

      const result = await useCase.execute({
        email: 'Test@Example.Com',
        name: 'テストユーザー',
        password: 'VeryStrong#123',
      });

      expect(repo.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(createJwtService.create).toHaveBeenCalled();
      expect(result.token).toBe('test.jwt.token');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('異常系', () => {
    it('メールアドレスが存在しない場合は InvalidCredentialsError', async () => {
      const { useCase } = setup({
        findByEmail: vi.fn(async () => null),
      });

      await expect(
        useCase.execute({
          email: 'notfound@example.com',
          name: 'テストユーザー',
          password: 'VeryStrong#123',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('ユーザー名が誤っている場合は InvalidCredentialsError', async () => {
      vi.spyOn(PasswordHash.prototype, 'matches').mockResolvedValue(true);

      const { useCase } = setup();

      await expect(
        useCase.execute({
          email: 'test@example.com',
          name: '違うユーザー名',
          password: 'VeryStrong#123',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('パスワードが誤っている場合は InvalidCredentialsError', async () => {
      vi.spyOn(PasswordHash.prototype, 'matches').mockResolvedValue(false);

      const { useCase } = setup();

      await expect(
        useCase.execute({
          email: 'test@example.com',
          name: 'テストユーザー',
          password: 'WrongPassword#999',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('削除済みユーザーは findByEmail が null を返すため InvalidCredentialsError', async () => {
      // リポジトリ層で deletedAt IS NULL が適用されるため、
      // 削除済みユーザーに対しては findByEmail が null を返す
      const { useCase } = setup({
        findByEmail: vi.fn(async () => null),
      });

      await expect(
        useCase.execute({
          email: 'deleted@example.com',
          name: 'テストユーザー',
          password: 'VeryStrong#123',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });
  });
});
