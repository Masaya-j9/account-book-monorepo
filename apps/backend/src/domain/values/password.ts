import { Either } from 'effect';
import { pipe } from 'effect/Function';

export const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_SYMBOL_REGEX = /[^A-Za-z0-9]/;

export class PasswordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordValidationError';
  }
}

export class Password {
  private constructor(private readonly _value: string) {}

  static create(
    rawPassword: string,
  ): Either.Either<Password, PasswordValidationError> {
    return pipe(
      Either.right(rawPassword.trim()),
      Either.filterOrLeft(
        (value) => value.length >= PASSWORD_MIN_LENGTH,
        () =>
          new PasswordValidationError(
            `パスワードは${PASSWORD_MIN_LENGTH}文字以上である必要があります`,
          ),
      ),
      Either.filterOrLeft(
        (value) => PASSWORD_SYMBOL_REGEX.test(value),
        () =>
          new PasswordValidationError(
            'パスワードには記号を1文字以上含めてください',
          ),
      ),
      Either.map((value) => new Password(value)),
    );
  }

  get value(): string {
    return this._value;
  }

  equals(other: Password): boolean {
    return this._value === other._value;
  }
}
