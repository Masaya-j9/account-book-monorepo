// Value Object: CategoryName
// カテゴリ名のバリデーションルールをカプセル化

import { Either } from 'effect';
import { pipe } from 'effect/Function';

export class CategoryNameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CategoryNameValidationError';
  }
}

export class CategoryName {
  private constructor(private readonly _value: string) {}

  static create(
    name: string,
  ): Either.Either<CategoryName, CategoryNameValidationError> {
    return pipe(
      Either.right(name.trim()),
      Either.filterOrLeft(
        (trimmed) => trimmed.length > 0,
        () => new CategoryNameValidationError('カテゴリ名は必須です'),
      ),
      Either.filterOrLeft(
        (trimmed) => trimmed.length <= 50,
        () =>
          new CategoryNameValidationError(
            'カテゴリ名は50文字以内である必要があります',
          ),
      ),
      Either.map((trimmed) => new CategoryName(trimmed)),
    );
  }

  get value(): string {
    return this._value;
  }

  equals(other: CategoryName): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
