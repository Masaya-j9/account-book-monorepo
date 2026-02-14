import type { NodePgDatabase } from '@account-book-app/db';
import { OpenAPIHono } from '@hono/zod-openapi';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TOKENS } from '../../../services/di/tokens';
import {
  EmailAlreadyExistsError,
  InvalidPasswordError,
} from '../../../services/users/register-user.errors';

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

vi.mock('../../../infrastructre/di/container', () => ({
  createRequestContainer: createRequestContainerMock,
}));

import { registerUsersOpenApi } from './users.openapi';

describe('registerUsersOpenApi（ユーザーOpenAPI）', () => {
  const db = {} as NodePgDatabase;

  const createApp = () => {
    const app = new OpenAPIHono();
    registerUsersOpenApi(app, db);
    return app;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('正常系', () => {
    it('ユーザー登録に成功すると201を返す', async () => {
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

      const app = createApp();
      const response = await app.request('/users/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'new@example.com',
          name: '新規ユーザー',
          password: 'VeryStrong#123',
        }),
      });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(createRequestContainerMock).toHaveBeenCalledWith(db);
      expect(getMock).toHaveBeenCalledWith(TOKENS.RegisterUserUseCase);
      expect(executeMock).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: '新規ユーザー',
        password: 'VeryStrong#123',
      });
      expect(json).toMatchObject({
        token: 'jwt-token',
        user: {
          id: 1,
          email: 'new@example.com',
        },
      });
    });
  });

  describe('異常系', () => {
    it('パスワード不正は400を返す', async () => {
      executeMock.mockRejectedValueOnce(
        new InvalidPasswordError('パスワードが不正です'),
      );

      const app = createApp();
      const response = await app.request('/users/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'new@example.com',
          name: '新規ユーザー',
          password: 'VeryStrong#123',
        }),
      });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ message: 'パスワードが不正です' });
    });

    it('メールアドレス重複は409を返す', async () => {
      executeMock.mockRejectedValueOnce(
        new EmailAlreadyExistsError('new@example.com'),
      );

      const app = createApp();
      const response = await app.request('/users/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'new@example.com',
          name: '新規ユーザー',
          password: 'VeryStrong#123',
        }),
      });
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json).toEqual({
        message: 'new@example.com は既に登録されています',
      });
    });

    it('想定外の例外は500を返す', async () => {
      executeMock.mockRejectedValueOnce(new Error('boom'));

      const app = createApp();
      const response = await app.request('/users/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'new@example.com',
          name: '新規ユーザー',
          password: 'VeryStrong#123',
        }),
      });
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toEqual({ message: 'ユーザー登録に失敗しました' });
    });
  });
});
