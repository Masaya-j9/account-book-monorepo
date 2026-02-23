// Value Object: UserName
// ユーザー名のバリデーションルールをカプセル化

import { Either } from 'effect';
import { pipe } from 'effect/Function';

export const USER_NAME_MAX_LENGTH = 100;

export class UserNameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNameValidationError';
  }
}

export class UserName {
  private constructor(private readonly _value: string) {}

  static create(
    name: string,
  ): Either.Either<UserName, UserNameValidationError> {
    return pipe(
      Either.right(name.trim()),
      Either.filterOrLeft(
        (trimmed) => trimmed.length > 0,
        () => new UserNameValidationError('ユーザー名は必須です'),
      ),
      Either.filterOrLeft(
        (trimmed) => trimmed.length <= USER_NAME_MAX_LENGTH,
        () =>
          new UserNameValidationError(
            `ユーザー名は${USER_NAME_MAX_LENGTH}文字以内である必要があります`,
          ),
      ),
      Either.map((trimmed) => new UserName(trimmed)),
    );
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserName): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
