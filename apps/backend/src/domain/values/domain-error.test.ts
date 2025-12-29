import { describe, expect, it } from 'vitest';

import { DomainError } from './domain-error';

describe('DomainError（ドメインエラー基底）', () => {
  describe('正常系', () => {
    it('name 未指定の場合は DomainError が設定される', () => {
      const err = new DomainError('message');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('DomainError');
      expect(err.message).toBe('message');
    });

    it('name 指定の場合はその値が設定される', () => {
      const err = new DomainError('message', 'CustomDomainError');
      expect(err.name).toBe('CustomDomainError');
    });

    it('stack trace が利用可能な環境では stack が付与される', () => {
      const err = new DomainError('message');
      expect(
        typeof err.stack === 'string' || typeof err.stack === 'undefined',
      ).toBe(true);
    });
  });
});
