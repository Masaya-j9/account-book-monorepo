import { Either } from 'effect';
import { pipe } from 'effect/Function';
import { describe, expect, it } from 'vitest';

import {
  PASSWORD_MIN_LENGTH,
  Password,
  PasswordValidationError,
} from './password';

describe('Password（パスワード）', () => {
  describe('正常系', () => {
    it('12文字以上かつ記号を含む場合は作成できる', () => {
      const result = Password.create('StrongPass#123');
      expect(Either.isRight(result)).toBe(true);
    });

    it('前後の空白をトリムして作成できる', () => {
      const result = Password.create('   StrongPass#123   ');

      expect(
        pipe(
          result,
          Either.match({
            onLeft: () => false,
            onRight: (password) => password.value === 'StrongPass#123',
          }),
        ),
      ).toBe(true);
    });
  });

  describe('異常系', () => {
    it('最小文字数未満の場合は例外になる', () => {
      const tooShort = 'a'.repeat(PASSWORD_MIN_LENGTH - 2);
      const result = Password.create(`${tooShort}!`);

      expect(Either.isLeft(result)).toBe(true);
      expect(
        pipe(
          result,
          Either.match({
            onLeft: (error) => error instanceof PasswordValidationError,
            onRight: () => false,
          }),
        ),
      ).toBe(true);
    });

    it('記号を含まない場合は例外になる', () => {
      const result = Password.create('StrongPassword1234');

      expect(Either.isLeft(result)).toBe(true);
      expect(
        pipe(
          result,
          Either.match({
            onLeft: (error) => error instanceof PasswordValidationError,
            onRight: () => false,
          }),
        ),
      ).toBe(true);
    });
  });
});
