import { DomainError } from '../../domain/values/domain-error';

export class TransactionNotFoundError extends DomainError {
  constructor(id: number) {
    super(`取引が見つかりません: ${id}`, 'TransactionNotFoundError');
  }
}

export class NotOwnerError extends DomainError {
  constructor() {
    super('取引の所有者ではありません', 'NotOwnerError');
  }
}

export class CategoriesNotFoundError extends DomainError {
  constructor(categoryIds: number[]) {
    super(
      `カテゴリが見つかりません: ${categoryIds.join(',')}`,
      'CategoriesNotFoundError',
    );
  }
}

export class InvalidCategoryIdsError extends DomainError {
  constructor() {
    super(
      'categoryIds は1件以上指定する必要があります',
      'InvalidCategoryIdsError',
    );
  }
}

type UnexpectedUpdateTransactionErrorParams = {
  message: string;
  cause?: Error;
};

export class UnexpectedUpdateTransactionError extends DomainError {
  public readonly cause?: Error;

  constructor(params: UnexpectedUpdateTransactionErrorParams) {
    super(params.message, 'UnexpectedUpdateTransactionError');
    if (params.cause) {
      this.cause = params.cause;
    }
  }
}

export type UpdateTransactionError =
  | TransactionNotFoundError
  | NotOwnerError
  | InvalidCategoryIdsError
  | CategoriesNotFoundError
  | UnexpectedUpdateTransactionError;
