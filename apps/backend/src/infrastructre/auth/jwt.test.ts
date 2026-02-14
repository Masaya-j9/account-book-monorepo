import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CreateJwtProvider, createAccessToken, verifyAccessToken } from './jwt';

describe('jwt（JWTユーティリティ）', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalJwtExpiresInSeconds = process.env.JWT_EXPIRES_IN_SECONDS;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_EXPIRES_IN_SECONDS = String(60 * 60 * 24 * 7);
  });

  afterEach(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }

    if (originalJwtExpiresInSeconds === undefined) {
      delete process.env.JWT_EXPIRES_IN_SECONDS;
      return;
    }

    process.env.JWT_EXPIRES_IN_SECONDS = originalJwtExpiresInSeconds;
  });

  describe('正常系', () => {
    it('アクセストークンを生成して検証できる', async () => {
      const token = await createAccessToken({
        userId: 123,
        email: 'user@example.com',
      });

      const payload = await verifyAccessToken(token);

      expect(payload.sub).toBe('123');
      expect(payload.email).toBe('user@example.com');
      expect(payload.exp - payload.iat).toBe(60 * 60 * 24 * 7);
    });
  });

  describe('異常系', () => {
    it('JWT_SECRET が未設定の場合は作成で例外になる', async () => {
      delete process.env.JWT_SECRET;

      await expect(
        createAccessToken({
          userId: 1,
          email: 'user@example.com',
        }),
      ).rejects.toThrow('JWT_SECRET が設定されていません');
    });

    it('JWT_EXPIRES_IN_SECONDS が未設定の場合は作成で例外になる', async () => {
      delete process.env.JWT_EXPIRES_IN_SECONDS;

      await expect(
        createAccessToken({
          userId: 1,
          email: 'user@example.com',
        }),
      ).rejects.toThrow('JWT_EXPIRES_IN_SECONDS が設定されていません');
    });

    it('JWT_EXPIRES_IN_SECONDS が0以下の場合は作成で例外になる', async () => {
      process.env.JWT_EXPIRES_IN_SECONDS = '0';

      await expect(
        createAccessToken({
          userId: 1,
          email: 'user@example.com',
        }),
      ).rejects.toThrow('JWT_EXPIRES_IN_SECONDS は正の整数で設定してください');
    });

    it('JWT_EXPIRES_IN_SECONDS が数値でない場合は作成で例外になる', async () => {
      process.env.JWT_EXPIRES_IN_SECONDS = 'not-number';

      await expect(
        createAccessToken({
          userId: 1,
          email: 'user@example.com',
        }),
      ).rejects.toThrow('JWT_EXPIRES_IN_SECONDS は正の整数で設定してください');
    });

    it('JWT_SECRET が未設定の場合は検証で例外になる', async () => {
      const token = await createAccessToken({
        userId: 1,
        email: 'user@example.com',
      });
      delete process.env.JWT_SECRET;

      await expect(verifyAccessToken(token)).rejects.toThrow(
        'JWT_SECRET が設定されていません',
      );
    });

    it('不正なトークンは検証で例外になる', async () => {
      await expect(
        verifyAccessToken('invalid.token.value'),
      ).rejects.toBeTruthy();
    });
  });

  describe('CreateJwtProvider', () => {
    describe('正常系', () => {
      it('ユーザー情報からアクセストークンを作成できる', async () => {
        const provider = new CreateJwtProvider();

        const token = await provider.create({
          userId: 456,
          email: 'provider@example.com',
        });

        const payload = await verifyAccessToken(token);

        expect(payload.sub).toBe('456');
        expect(payload.email).toBe('provider@example.com');
      });
    });
  });
});
