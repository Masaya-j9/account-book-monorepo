import { Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  USER_NAME_MAX_LENGTH,
  UserName,
  UserNameValidationError,
} from './user-name';

describe('UserName（ユーザー名）', () => {
  describe('正常系', () => {
    it('前後の空白をトリムして作成できる', () => {
      const result = UserName.create('  テストユーザー  ');
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right.value).toBe('テストユーザー');
      }
    });

    it('最大文字数ちょうどで作成できる', () => {
      const name = 'a'.repeat(USER_NAME_MAX_LENGTH);
      const result = UserName.create(name);
      expect(Either.isRight(result)).toBe(true);
    });

    it('equals: 同じ値のインスタンスは等価である', () => {
      const a = UserName.create('テストユーザー');
      const b = UserName.create('テストユーザー');
      if (Either.isRight(a) && Either.isRight(b)) {
        expect(a.right.equals(b.right)).toBe(true);
      }
    });

    it('toString: value と同じ文字列を返す', () => {
      const result = UserName.create('テストユーザー');
      if (Either.isRight(result)) {
        expect(result.right.toString()).toBe('テストユーザー');
      }
    });
  });

  describe('異常系', () => {
    it('空文字は例外になる', () => {
      const result = UserName.create('');
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(UserNameValidationError);
        expect(result.left.message).toBe('ユーザー名は必須です');
      }
    });

    it('空白のみは例外になる', () => {
      const result = UserName.create('   ');
      expect(Either.isLeft(result)).toBe(true);
    });

    it(`${USER_NAME_MAX_LENGTH + 1}文字以上は例外になる`, () => {
      const name = 'a'.repeat(USER_NAME_MAX_LENGTH + 1);
      const result = UserName.create(name);
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(UserNameValidationError);
      }
    });
  });
});
