import { describe, expect, it } from 'vitest';

import type { UserId } from './indentity';
import { createId, Identity } from './indentity';

describe('Identity/createId（識別子）', () => {
  describe('正常系', () => {
    it('createId: 正の整数のIDを生成できる', () => {
      const id = createId<UserId>(1, 'UserId');
      expect(id).toBe(1);
    });

    it('equals: value と typeName が一致したときのみ同一とみなす', () => {
      const a = Identity.of<UserId>(1, 'UserId');
      const b = Identity.of<UserId>(1, 'UserId');
      const c = Identity.of<UserId>(2, 'UserId');

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);

      // 型引数は同じでも typeName が違えば別物
      const d = Identity.of<UserId>(1, 'AnotherUserId');
      expect(a.equals(d)).toBe(false);
    });

    it('map: 内部値を変換できる', () => {
      const id = Identity.of<UserId>(1, 'UserId')
        .map((v) => v + 1)
        .validate()
        .build();
      expect(id).toBe(2);
    });
  });

  describe('異常系', () => {
    it('createId: 整数でない/0以下の場合は例外になる', () => {
      expect(() => createId<UserId>(1.1, 'UserId')).toThrow(
        'must be an integer',
      );
      expect(() => createId<UserId>(0, 'UserId')).toThrow('must be positive');
      expect(() => createId<UserId>(-1, 'UserId')).toThrow('must be positive');
    });
  });
});
