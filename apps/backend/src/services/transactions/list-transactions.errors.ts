import { DomainError } from '../../domain/values/domain-error';

type UnexpectedListTransactionsErrorParams = {
  message: string;
  cause?: Error;
};

export class InvalidPaginationError extends DomainError {
  constructor(message: string) {
    super(message, 'InvalidPaginationError');
  }
}

export class UnexpectedListTransactionsError extends DomainError {
  public readonly cause?: Error;

  constructor(params: UnexpectedListTransactionsErrorParams) {
    super(params.message, 'UnexpectedListTransactionsError');
    if (params.cause) {
      this.cause = params.cause;
    }
  }
}

export type ListTransactionsError =
  | InvalidPaginationError
  | UnexpectedListTransactionsError;
