import type { NodePgDatabase } from '@account-book-app/db';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyAccessTokenMock } = vi.hoisted(() => ({
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../infrastructre/auth/jwt', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

import { createContext } from './context';

describe('createContext（tRPCコンテキスト）', () => {
  const db = {} as NodePgDatabase;

  const createOptions = (
    authorization?: string,
  ): FetchCreateContextFnOptions => {
    const headers = new Headers();

    if (authorization) {
      headers.set('authorization', authorization);
    }

    return {
      req: new Request('http://localhost/trpc', { headers }),
      resHeaders: new Headers(),
    } as FetchCreateContextFnOptions;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('正常系', () => {
    it('Bearerトークンを正しく抽出して検証へ渡す', async () => {
      verifyAccessTokenMock.mockResolvedValueOnce({
        sub: '10',
        email: 'user@example.com',
        iat: 1,
        exp: 2,
      });

      const contextFactory = createContext(db);
      await contextFactory(createOptions('Bearer extracted.token.value'));

      expect(verifyAccessTokenMock).toHaveBeenCalledWith(
        'extracted.token.value',
      );
    });

    it('Bearerトークンが有効な場合はuserIdを設定する', async () => {
      verifyAccessTokenMock.mockResolvedValueOnce({
        sub: '123',
        email: 'user@example.com',
        iat: 1,
        exp: 2,
      });

      const contextFactory = createContext(db);
      const result = await contextFactory(createOptions('Bearer valid.token'));

      expect(verifyAccessTokenMock).toHaveBeenCalledWith('valid.token');
      expect(result).toEqual({
        db,
        userId: 123,
      });
    });
  });

  describe('異常系', () => {
    it('Authorizationヘッダーがない場合はuserIdを設定しない', async () => {
      const contextFactory = createContext(db);
      const result = await contextFactory(createOptions());

      expect(verifyAccessTokenMock).not.toHaveBeenCalled();
      expect(result).toEqual({
        db,
        userId: undefined,
      });
    });

    it('Bearer形式でない場合はuserIdを設定しない', async () => {
      const contextFactory = createContext(db);
      const result = await contextFactory(createOptions('Basic abc.def'));

      expect(verifyAccessTokenMock).not.toHaveBeenCalled();
      expect(result).toEqual({
        db,
        userId: undefined,
      });
    });

    it('トークン検証に失敗した場合はuserIdを設定しない', async () => {
      verifyAccessTokenMock.mockRejectedValueOnce(new Error('invalid token'));

      const contextFactory = createContext(db);
      const result = await contextFactory(
        createOptions('Bearer invalid.token'),
      );

      expect(verifyAccessTokenMock).toHaveBeenCalledWith('invalid.token');
      expect(result).toEqual({
        db,
        userId: undefined,
      });
    });

    it('subが正の整数でない場合はuserIdを設定しない', async () => {
      verifyAccessTokenMock.mockResolvedValueOnce({
        sub: 'abc',
        email: 'user@example.com',
        iat: 1,
        exp: 2,
      });

      const contextFactory = createContext(db);
      const result = await contextFactory(createOptions('Bearer valid.token'));

      expect(verifyAccessTokenMock).toHaveBeenCalledWith('valid.token');
      expect(result).toEqual({
        db,
        userId: undefined,
      });
    });

    it.each(['-1', '1.5', 'NaN', '0'])(
      'subが%sの場合はuserIdを設定しない',
      async (sub) => {
        verifyAccessTokenMock.mockResolvedValueOnce({
          sub,
          email: 'user@example.com',
          iat: 1,
          exp: 2,
        });

        const contextFactory = createContext(db);
        const result = await contextFactory(
          createOptions('Bearer valid.token'),
        );

        expect(verifyAccessTokenMock).toHaveBeenCalledWith('valid.token');
        expect(result).toEqual({
          db,
          userId: undefined,
        });
      },
    );
  });
});
