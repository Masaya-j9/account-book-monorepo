// Presentation Layer: Transaction Router
// 取引関連のtRPCエンドポイント

import type { NodePgDatabase } from '@account-book-app/db';
import {
  transactionsCreateInputSchema,
  transactionsCreateOutputSchema,
  transactionsDeleteInputSchema,
  transactionsDeleteOutputSchema,
  transactionsListInputSchema,
  transactionsListOutputSchema,
  transactionsUpdateInputSchema,
  transactionsUpdateOutputSchema,
} from '@account-book-app/shared';
import { TRPCError } from '@trpc/server';
import { createRequestContainer } from '../../infrastructre/di/container';
import { TOKENS } from '../../services/di/tokens';
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
import { UnexpectedDeleteTransactionError } from '../../services/transactions/delete-transaction.errors';
import type { DeleteTransactionUseCase } from '../../services/transactions/delete-transaction.service';
import { InvalidPaginationError } from '../../services/transactions/list-transactions.errors';
import type { ListTransactionsUseCase } from '../../services/transactions/list-transactions.service';
import {
  CategoriesNotFoundError,
  InvalidCategoryIdsError,
  NotOwnerError,
  TransactionNotFoundError,
} from '../../services/transactions/update-transaction.errors';
import type { UpdateTransactionUseCase } from '../../services/transactions/update-transaction.service';
import { Effect, pipe } from '../../shared/result';
import { protectedProcedure, router } from '../trpc/trpc';
import { runTrpcEffect } from './errors/trpc-effect';

const resolveCreateTransactionUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<CreateTransactionUseCase>(
    TOKENS.CreateTransactionUseCase,
  );
};

const resolveListTransactionsUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<ListTransactionsUseCase>(TOKENS.ListTransactionsUseCase);
};

const resolveUpdateTransactionUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<UpdateTransactionUseCase>(
    TOKENS.UpdateTransactionUseCase,
  );
};

const resolveDeleteTransactionUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<DeleteTransactionUseCase>(
    TOKENS.DeleteTransactionUseCase,
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

const toListTransactionsTrpcError = <T>(cause: T) => {
  const error = cause instanceof Error ? cause : new Error(String(cause));

  if (process.env.NODE_ENV !== 'production') {
    console.error('[transactions.list] error:', error);
  }

  if (error instanceof InvalidPaginationError) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
    });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: '取引一覧の取得に失敗しました',
  });
};

const toUpdateTransactionTrpcError = <T>(cause: T) => {
  const error = cause instanceof Error ? cause : new Error(String(cause));

  if (process.env.NODE_ENV !== 'production') {
    console.error('[transactions.update] error:', error);
  }

  if (
    error instanceof InvalidTransactionTypeError ||
    error instanceof TransactionTitleRequiredError ||
    error instanceof TransactionTitleTooLongError ||
    error instanceof InvalidAmountError ||
    error instanceof InvalidDateFormatError ||
    error instanceof FutureTransactionDateError ||
    error instanceof TransactionMemoTooLongError ||
    error instanceof CategoryTypeMismatchError ||
    error instanceof InvalidCategoryIdsError
  ) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
    });
  }

  if (error instanceof TransactionNotFoundError) {
    return new TRPCError({
      code: 'NOT_FOUND',
      message: error.message,
    });
  }

  if (error instanceof CategoriesNotFoundError) {
    return new TRPCError({
      code: 'NOT_FOUND',
      message: error.message,
    });
  }

  if (error instanceof NotOwnerError) {
    return new TRPCError({
      code: 'FORBIDDEN',
      message: error.message,
    });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: '取引の更新に失敗しました',
  });
};

const toDeleteTransactionTrpcError = <T>(cause: T) => {
  const error = cause instanceof Error ? cause : new Error(String(cause));

  if (process.env.NODE_ENV !== 'production') {
    console.error('[transactions.delete] error:', error);
  }

  if (error instanceof TransactionNotFoundError) {
    return new TRPCError({
      code: 'NOT_FOUND',
      message: error.message,
    });
  }

  if (error instanceof NotOwnerError) {
    return new TRPCError({
      code: 'FORBIDDEN',
      message: error.message,
    });
  }

  if (error instanceof UnexpectedDeleteTransactionError) {
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: '取引の削除に失敗しました',
  });
};

export const transactionRouter = router({
  create: protectedProcedure
    .input(transactionsCreateInputSchema)
    .output(transactionsCreateOutputSchema)
    .mutation(({ input, ctx }) =>
      runTrpcEffect(
        pipe(
          Effect.tryPromise({
            try: () =>
              resolveCreateTransactionUseCase(ctx.db).execute({
                userId: ctx.userId,
                type: input.type,
                title: input.title,
                amount: input.amount,
                date: input.date,
                categoryId: input.categoryId,
                memo: input.memo,
              }),
            catch: (cause) => toCreateTransactionTrpcError(cause),
          }),
          Effect.map((transaction) => ({ transaction })),
        ),
      ),
    ),

  list: protectedProcedure
    .input(transactionsListInputSchema)
    .output(transactionsListOutputSchema)
    .query(({ input, ctx }) =>
      runTrpcEffect(
        Effect.tryPromise({
          try: () =>
            resolveListTransactionsUseCase(ctx.db).execute({
              userId: ctx.userId,
              startDate: input.startDate,
              endDate: input.endDate,
              type: input.type,
              categoryIds: input.categoryIds,
              order: input.order,
              page: input.page,
              limit: input.limit,
            }),
          catch: (cause) => toListTransactionsTrpcError(cause),
        }),
      ),
    ),

  update: protectedProcedure
    .input(transactionsUpdateInputSchema)
    .output(transactionsUpdateOutputSchema)
    .mutation(({ input, ctx }) =>
      runTrpcEffect(
        Effect.tryPromise({
          try: () =>
            resolveUpdateTransactionUseCase(ctx.db).execute({
              userId: ctx.userId,
              id: input.id,
              type: input.type,
              title: input.title,
              amount: input.amount,
              date: input.date,
              categoryIds: input.categoryIds,
              memo: input.memo,
            }),
          catch: (cause) => toUpdateTransactionTrpcError(cause),
        }),
      ),
    ),

  delete: protectedProcedure
    .input(transactionsDeleteInputSchema)
    .output(transactionsDeleteOutputSchema)
    .mutation(({ input, ctx }) =>
      runTrpcEffect(
        Effect.tryPromise({
          try: () =>
            resolveDeleteTransactionUseCase(ctx.db).execute({
              userId: ctx.userId,
              id: input.id,
            }),
          catch: (cause) => toDeleteTransactionTrpcError(cause),
        }),
      ),
    ),
});
