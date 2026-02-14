import type { NodePgDatabase } from '@account-book-app/db';
import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TOKENS } from '../../services/di/tokens';
import {
  EmailAlreadyExistsError,
  InvalidPasswordError,
} from '../../services/users/register-user.errors';

const { createRequestContainerMock, executeMock, getMock } = vi.hoisted(() => {
  const execute = vi.fn();
  const get = vi.fn(() => ({ execute }));
  const createRequestContainer = vi.fn(() => ({ get }));
  return {
    createRequestContainerMock: createRequestContainer,
    executeMock: execute,
    getMock: get,
  };
});

vi.mock('../../infrastructre/di/container', () => ({
  createRequestContainer: createRequestContainerMock,
}));

import { userRouter } from './user.router';

describe('userRouter（ユーザールーター）', () => {
  const db = {} as NodePgDatabase;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('正常系', () => {
    it('未認証でもユーザー登録できる', async () => {
      executeMock.mockResolvedValueOnce({
        token: 'jwt-token',
        user: {
          id: 1,
          email: 'new@example.com',
          name: '新規ユーザー',
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
          updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        },
      });

      const caller = userRouter.createCaller({ db });

      const result = await caller.register({
        email: 'new@example.com',
        name: '新規ユーザー',
        password: 'VeryStrong#123',
      });

      expect(createRequestContainerMock).toHaveBeenCalledWith(db);
      expect(getMock).toHaveBeenCalledWith(TOKENS.RegisterUserUseCase);
      expect(executeMock).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: '新規ユーザー',
        password: 'VeryStrong#123',
      });
      expect(result.token).toBe('jwt-token');
      expect(result.user.email).toBe('new@example.com');
    });
  });

  describe('異常系', () => {
    it('メールアドレス重複は CONFLICT になる', async () => {
      executeMock.mockRejectedValueOnce(
        new EmailAlreadyExistsError('new@example.com'),
      );

      const caller = userRouter.createCaller({ db });

      await expect(
        caller.register({
          email: 'new@example.com',
          name: '新規ユーザー',
          password: 'VeryStrong#123',
        }),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('パスワード不正は BAD_REQUEST になる', async () => {
      executeMock.mockRejectedValueOnce(
        new InvalidPasswordError('パスワードが不正です'),
      );

      const caller = userRouter.createCaller({ db });

      await expect(
        caller.register({
          email: 'new@example.com',
          name: '新規ユーザー',
          password: 'VeryStrong#123',
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('想定外の例外は INTERNAL_SERVER_ERROR になる', async () => {
      executeMock.mockRejectedValueOnce(new Error('boom'));

      const caller = userRouter.createCaller({ db });
      const error = await caller
        .register({
          email: 'new@example.com',
          name: '新規ユーザー',
          password: 'VeryStrong#123',
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(TRPCError);
      expect(error).toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'ユーザー登録に失敗しました',
      });
    });
  });
});
