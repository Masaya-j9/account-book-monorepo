// Presentation Layer: Transaction Router
// 取引関連のtRPCエンドポイント

import type { NodePgDatabase } from '@account-book-app/db';
import {
  transactionsCreateInputSchema,
  transactionsCreateOutputSchema,
} from '@account-book-app/shared';
import { TRPCError } from '@trpc/server';

import { createRequestContainer } from '../../infrastructre/di/container';
import { TOKENS } from '../../infrastructre/di/tokens';
import {
  CategoryNotFoundError,
  CategoryTypeMismatchError,
  FutureTransactionDateError,
  InvalidAmountError,
  InvalidDateFormatError,
  InvalidTransactionTypeError,
  TransactionMemoTooLongError,
  TransactionTitleRequiredError,
  TransactionTitleTooLongError,
} from '../../services/transactions/create-transaction.errors';
import type { CreateTransactionUseCase } from '../../services/transactions/create-transaction.service';
import { protectedProcedure, router } from '../trpc/trpc';

const resolveCreateTransactionUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<CreateTransactionUseCase>(
    TOKENS.CreateTransactionUseCase,
  );
};

const toCreateTransactionTrpcError = <T>(cause: T) => {
  const error = cause instanceof Error ? cause : new Error(String(cause));

  if (process.env.NODE_ENV !== 'production') {
    console.error('[transactions.create] error:', error);
  }

  if (
    error instanceof InvalidTransactionTypeError ||
    error instanceof TransactionTitleRequiredError ||
    error instanceof TransactionTitleTooLongError ||
    error instanceof InvalidAmountError ||
    error instanceof InvalidDateFormatError ||
    error instanceof FutureTransactionDateError ||
    error instanceof TransactionMemoTooLongError ||
    error instanceof CategoryTypeMismatchError
  ) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
    });
  }

  if (error instanceof CategoryNotFoundError) {
    return new TRPCError({
      code: 'NOT_FOUND',
      message: error.message,
    });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: '取引の作成に失敗しました',
  });
};

export const transactionRouter = router({
  create: protectedProcedure
    .input(transactionsCreateInputSchema)
    .output(transactionsCreateOutputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const createTransactionUseCase = resolveCreateTransactionUseCase(
          ctx.db,
        );
        const transaction = await createTransactionUseCase.execute({
          userId: ctx.userId,
          type: input.type,
          title: input.title,
          amount: input.amount,
          date: input.date,
          categoryId: input.categoryId,
          memo: input.memo,
        });

        return {
          transaction,
        };
      } catch (error) {
        throw toCreateTransactionTrpcError(error);
      }
    }),
});
