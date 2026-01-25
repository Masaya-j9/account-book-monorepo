import * as Cause from 'effect/Cause';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import { inject, injectable } from 'inversify';

import type { TransactionRecord } from '../../domain/entities/transaction.entity';
import { Transaction } from '../../domain/entities/transaction.entity';
import { Money } from '../../domain/values/money';
import { TransactionDate } from '../../domain/values/transaction-date';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';
import { Effect, pipe } from '../../shared/result';
import { TOKENS } from '../di/tokens';
import {
  NotOwnerError,
  TransactionNotFoundError,
  UnexpectedDeleteTransactionError,
  type DeleteTransactionError,
} from './delete-transaction.errors';

export type DeleteTransactionInput = {
  userId: number;
  id: number;
};

export type DeleteTransactionOutput = {
  deleted: true;
};

@injectable()
export class DeleteTransactionUseCase {
  @inject(TOKENS.TransactionRepository)
  private transactionRepository!: ITransactionRepository;

  async execute(
    input: DeleteTransactionInput,
  ): Promise<DeleteTransactionOutput> {
    const program = this.buildProgram(input);
    const exit = await Effect.runPromiseExit(program);
    return this.unwrapExit(exit);
  }

  private buildProgram(
    input: DeleteTransactionInput,
  ): Effect.Effect<DeleteTransactionOutput, DeleteTransactionError> {
    return pipe(
      this.fetchCurrentTransaction(input),
      Effect.flatMap((value) => this.ensureOwner(value)),
      Effect.flatMap((value) => this.deleteTransaction(value)),
    );
  }

  private fetchCurrentTransaction(
    input: DeleteTransactionInput,
  ): Effect.Effect<
    DeleteTransactionInput & { current: TransactionRecord },
    DeleteTransactionError
  > {
    return pipe(
      Effect.tryPromise({
        try: () => this.transactionRepository.findById(input.id),
        catch: (cause) =>
          this.createUnexpectedError('取引情報の取得に失敗しました', cause),
      }),
      Effect.flatMap((record) =>
        record === null
          ? Effect.fail(new TransactionNotFoundError(input.id))
          : Effect.succeed({ ...input, current: record }),
      ),
    );
  }

  private ensureOwner(
    value: DeleteTransactionInput & { current: TransactionRecord },
  ): Effect.Effect<
    DeleteTransactionInput & { current: TransactionRecord },
    DeleteTransactionError
  > {
    return pipe(
      Effect.succeed(value),
      Effect.filterOrFail(
        ({ current, userId }) => current.userId === userId,
        () => new NotOwnerError(),
      ),
    );
  }

  private deleteTransaction(
    value: DeleteTransactionInput & { current: TransactionRecord },
  ): Effect.Effect<DeleteTransactionOutput, DeleteTransactionError> {
    return pipe(
      Effect.try({
        try: () => {
          const money = Money.ofWithCurrency(
            value.current.amount,
            value.current.currency,
          );
          const date = TransactionDate.fromString(value.current.date);
          const transaction = Transaction.reconstruct(
            value.current.id,
            value.current.userId,
            value.current.type,
            value.current.title,
            money,
            date,
            value.current.categoryId,
            value.current.memo,
            value.current.createdAt,
            value.current.updatedAt,
          );
          transaction.delete();
          return transaction;
        },
        catch: (cause) =>
          this.createUnexpectedError('取引の削除に失敗しました', cause),
      }),
      Effect.flatMap((transaction) =>
        Effect.tryPromise({
          try: () => this.transactionRepository.delete(transaction),
          catch: (cause) =>
            this.createUnexpectedError('取引の削除に失敗しました', cause),
        }),
      ),
      Effect.map(() => ({ deleted: true })),
    );
  }

  private createUnexpectedError(
    message: string,
    cause?: unknown,
  ): UnexpectedDeleteTransactionError {
    const normalizedCause =
      cause instanceof Error
        ? cause
        : typeof cause === 'string'
          ? new Error(cause)
          : new Error('unknown error');

    return new UnexpectedDeleteTransactionError({
      message,
      cause: normalizedCause,
    });
  }

  private unwrapExit(
    exit: Exit.Exit<DeleteTransactionOutput, DeleteTransactionError>,
  ): DeleteTransactionOutput {
    return Exit.match(exit, {
      onSuccess: (value) => value,
      onFailure: (cause) =>
        pipe(
          Cause.failureOption(cause),
          Option.match({
            onNone: () => {
              throw new UnexpectedDeleteTransactionError({
                message: '取引の削除に失敗しました',
                cause: new Error('Effectの実行が失敗しました'),
              });
            },
            onSome: (error) => {
              throw error;
            },
          }),
        ),
    });
  }
}
