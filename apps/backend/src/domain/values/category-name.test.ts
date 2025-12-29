import { Either } from 'effect';
import { pipe } from 'effect/Function';
import { describe, expect, it } from 'vitest';

import { CategoryName, CategoryNameValidationError } from './category-name';

describe('CategoryName（カテゴリ名）', () => {
  describe('正常系', () => {
    it('前後の空白をトリムして作成できる', () => {
      const result = CategoryName.create('  食費  ');
      expect(
        pipe(
          result,
          Either.match({
            onLeft: () => false,
            onRight: (name) => name.value === '食費',
          }),
        ),
      ).toBe(true);
    });

    it('equals/toString: 値として比較できる', () => {
      const a = CategoryName.create('交通費');
      const b = CategoryName.create('交通費');
      const c = CategoryName.create('日用品');

      const canCompare =
        Either.isRight(a) && Either.isRight(b) && Either.isRight(c);
      expect(canCompare).toBe(true);

      expect(
        canCompare &&
          a.right.equals(b.right) &&
          !a.right.equals(c.right) &&
          a.right.toString() === '交通費',
      ).toBe(true);
    });
  });

  describe('異常系', () => {
    it('空文字/空白のみの場合は例外になる', () => {
      const empty = CategoryName.create('');
      const spaces = CategoryName.create('   ');

      expect(Either.isLeft(empty)).toBe(true);
      expect(Either.isLeft(spaces)).toBe(true);
      expect(
        pipe(
          empty,
          Either.match({
            onLeft: (e) => e instanceof CategoryNameValidationError,
            onRight: () => false,
          }),
        ),
      ).toBe(true);
      expect(
        pipe(
          spaces,
          Either.match({
            onLeft: (e) => e instanceof CategoryNameValidationError,
            onRight: () => false,
          }),
        ),
      ).toBe(true);
    });

    it('51文字以上の場合は例外になる', () => {
      const long = 'a'.repeat(51);
      const result = CategoryName.create(long);
      expect(Either.isLeft(result)).toBe(true);
      expect(
        pipe(
          result,
          Either.match({
            onLeft: (e) => e instanceof CategoryNameValidationError,
            onRight: () => false,
          }),
        ),
      ).toBe(true);
    });
  });
});
