import { DomainError } from '../../domain/values/domain-error';
import type {
  NotOwnerError,
  TransactionNotFoundError,
} from './update-transaction.errors';

export {
  NotOwnerError,
  TransactionNotFoundError,
} from './update-transaction.errors';

type UnexpectedDeleteTransactionErrorParams = {
  message: string;
  cause?: Error;
};

export class UnexpectedDeleteTransactionError extends DomainError {
  public readonly cause?: Error;

  constructor(params: UnexpectedDeleteTransactionErrorParams) {
    super(params.message, 'UnexpectedDeleteTransactionError');
    if (params.cause) {
      this.cause = params.cause;
    }
  }
}

export type DeleteTransactionError =
  | TransactionNotFoundError
  | NotOwnerError
  | UnexpectedDeleteTransactionError;
