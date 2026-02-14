import { Container } from 'inversify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CreateUserData,
  UserRecord,
} from '../../domain/entities/user.entity';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import type { ICreateJwtService } from '../auth/create-jwt.service';
import { TOKENS } from '../di/tokens';
import {
  EmailAlreadyExistsError,
  InvalidPasswordError,
} from './register-user.errors';
import { RegisterUserUseCase } from './register-user.service';

describe('RegisterUserUseCase（ユーザー登録）', () => {
  const fixedNow = new Date('2025-01-01T00:00:00.000Z');

  const makeRecord = (override?: Partial<UserRecord>): UserRecord => ({
    id: 1,
    email: 'test@example.com',
    passwordHash: 'salt:hash',
    name: 'テストユーザー',
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...override,
  });

  const setup = (overrides?: Partial<IUserRepository>) => {
    const createJwtService: ICreateJwtService = {
      create: vi.fn(async () => 'test.jwt.token'),
    };

    const repo: IUserRepository = {
      findByEmail: vi.fn(async (_email: string) => null),
      create: vi.fn(async (data: CreateUserData) =>
        makeRecord({
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash.value,
        }),
      ),
      ...overrides,
    };

    const container = new Container();
    container
      .bind<IUserRepository>(TOKENS.UserRepository)
      .toConstantValue(repo);
    container
      .bind<ICreateJwtService>(TOKENS.CreateJwtService)
      .toConstantValue(createJwtService);
    container.bind<RegisterUserUseCase>(RegisterUserUseCase).toSelf();

    const useCase = container.get(RegisterUserUseCase);

    return { useCase, repo, createJwtService };
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('正常系', () => {
    it('ユーザーを登録してトークンを返す', async () => {
      const { useCase, repo, createJwtService } = setup();

      const result = await useCase.execute({
        email: 'NewUser@example.com',
        name: ' 新規ユーザー ',
        password: 'VeryStrong#123',
      });

      expect(repo.findByEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(repo.create).toHaveBeenCalled();
      expect(createJwtService.create).toHaveBeenCalled();
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.name).toBe('新規ユーザー');
      expect(result.token).toBe('test.jwt.token');
    });
  });

  describe('異常系', () => {
    it('メールアドレスが重複する場合は例外になる', async () => {
      const { useCase } = setup({
        findByEmail: vi.fn(async () => makeRecord()),
      });

      await expect(
        useCase.execute({
          email: 'test@example.com',
          name: 'テスト',
          password: 'VeryStrong#123',
        }),
      ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
    });

    it('パスワード要件を満たさない場合は例外になる', async () => {
      const { useCase } = setup();

      await expect(
        useCase.execute({
          email: 'test@example.com',
          name: 'テスト',
          password: 'short',
        }),
      ).rejects.toBeInstanceOf(InvalidPasswordError);
    });
  });
});
