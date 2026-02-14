import { Container } from 'inversify';
import { describe, expect, it, vi } from 'vitest';

import { TOKENS } from '../di/tokens';
import {
  CreateJwtService,
  type ICreateJwtTokenProvider,
} from './create-jwt.service';

describe('CreateJwtService（JWT作成サービス）', () => {
  const setup = (providerOverride?: Partial<ICreateJwtTokenProvider>) => {
    const provider: ICreateJwtTokenProvider = {
      create: vi.fn(async () => 'test.jwt.token'),
      ...providerOverride,
    };

    const container = new Container();

    container
      .bind<ICreateJwtTokenProvider>(TOKENS.CreateJwtTokenProvider)
      .toConstantValue(provider);
    container.bind<CreateJwtService>(CreateJwtService).toSelf();

    const service = container.get(CreateJwtService);

    return { service, provider };
  };

  describe('正常系', () => {
    it('トークンプロバイダに委譲してアクセストークンを返す', async () => {
      const { service, provider } = setup();

      const result = await service.create({
        userId: 123,
        email: 'user@example.com',
      });

      expect(provider.create).toHaveBeenCalledWith({
        userId: 123,
        email: 'user@example.com',
      });
      expect(result).toBe('test.jwt.token');
    });
  });

  describe('異常系', () => {
    it('トークンプロバイダで失敗した場合は例外をそのまま送出する', async () => {
      const expectedError = new Error('token generation failed');
      const { service } = setup({
        create: vi.fn(async () => {
          throw expectedError;
        }),
      });

      await expect(
        service.create({
          userId: 1,
          email: 'user@example.com',
        }),
      ).rejects.toBe(expectedError);
    });
  });
});
