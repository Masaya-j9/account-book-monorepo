import { describe, expect, it } from 'vitest';

import { PasswordHash } from './password-hash';

describe('PasswordHash（パスワードハッシュ）', () => {
  describe('正常系', () => {
    it('平文パスワードからハッシュを生成できる', async () => {
      const hash = await PasswordHash.create('VeryStrong#123');
      const [salt, digest] = hash.value.split(':');

      expect(salt.length).toBeGreaterThan(0);
      expect(digest.length).toBeGreaterThan(0);
      expect(hash.value.includes(':')).toBe(true);
    });

    it('同じ平文でも異なるハッシュが生成される', async () => {
      const first = await PasswordHash.create('VeryStrong#123');
      const second = await PasswordHash.create('VeryStrong#123');

      expect(first.value).not.toBe(second.value);
    });

    it('正しい平文パスワードは照合成功する', async () => {
      const hash = await PasswordHash.create('VeryStrong#123');
      const matched = await hash.matches('VeryStrong#123');

      expect(matched).toBe(true);
    });
  });

  describe('異常系', () => {
    it('誤った平文パスワードは照合失敗する', async () => {
      const hash = await PasswordHash.create('VeryStrong#123');
      const matched = await hash.matches('Wrong#123');

      expect(matched).toBe(false);
    });

    it('不正なハッシュ形式は照合失敗する', async () => {
      const hash = PasswordHash.reconstruct('invalid-format');
      const matched = await hash.matches('VeryStrong#123');

      expect(matched).toBe(false);
    });
  });
});
