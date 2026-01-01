import { DomainError } from '../../domain/values/domain-error';

export class InvalidTransactionTypeError extends DomainError {
  constructor(type: string) {
    super(`不正な取引タイプです: ${type}`, 'InvalidTransactionTypeError');
  }
}

export class InvalidAmountError extends DomainError {
  constructor(amount: number) {
    super(`不正な金額です: ${amount}`, 'InvalidAmountError');
  }
}

export class InvalidDateFormatError extends DomainError {
  constructor(date: string) {
    super(`不正な日付形式です: ${date}`, 'InvalidDateFormatError');
  }
}

export class FutureTransactionDateError extends DomainError {
  constructor(date: string) {
    super(
      `未来日の取引は登録できません: ${date}`,
      'FutureTransactionDateError',
    );
  }
}

export class TransactionTitleRequiredError extends DomainError {
  constructor() {
    super('タイトルは必須です', 'TransactionTitleRequiredError');
  }
}

export class TransactionTitleTooLongError extends DomainError {
  constructor() {
    super(
      'タイトルは100文字以内である必要があります',
      'TransactionTitleTooLongError',
    );
  }
}

export class TransactionMemoTooLongError extends DomainError {
  constructor() {
    super(
      'メモは500文字以内である必要があります',
      'TransactionMemoTooLongError',
    );
  }
}

export class CategoryNotFoundError extends DomainError {
  constructor(categoryId: number) {
    super(`カテゴリが見つかりません: ${categoryId}`, 'CategoryNotFoundError');
  }
}

export class CategoryTypeMismatchError extends DomainError {
  constructor(transactionType: string, categoryType: string) {
    super(
      `取引タイプ(${transactionType})とカテゴリタイプ(${categoryType})が一致しません`,
      'CategoryTypeMismatchError',
    );
  }
}

type UnexpectedCreateTransactionErrorParams = {
  message: string;
  cause?: Error;
};

export class UnexpectedCreateTransactionError extends DomainError {
  public readonly cause?: Error;

  constructor(params: UnexpectedCreateTransactionErrorParams) {
    super(params.message, 'UnexpectedCreateTransactionError');
    if (params.cause) {
      this.cause = params.cause;
    }
  }
}

export type CreateTransactionError =
  | InvalidTransactionTypeError
  | InvalidAmountError
  | InvalidDateFormatError
  | FutureTransactionDateError
  | TransactionTitleRequiredError
  | TransactionTitleTooLongError
  | TransactionMemoTooLongError
  | CategoryNotFoundError
  | CategoryTypeMismatchError
  | UnexpectedCreateTransactionError;
