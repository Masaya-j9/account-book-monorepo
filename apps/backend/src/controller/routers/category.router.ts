// Presentation Layer: Category Router
// カテゴリ関連のtRPCエンドポイント

import type { NodePgDatabase } from '@account-book-app/db';
import {
  categoriesCreateInputSchema,
  categoriesCreateOutputSchema,
} from '@account-book-app/shared';
import { TRPCError } from '@trpc/server';
import { createRequestContainer } from '../../infrastructre/di/container';
import { TOKENS } from '../../infrastructre/di/tokens';
import type { CreateCategoryUseCase } from '../../services/categories/create.category.service';
import {
  DuplicateCategoryError,
  InvalidCategoryNameError,
  InvalidTypeIdError,
  TransactionTypeNotFoundError,
} from '../../services/categories/create-category.errors';
import { protectedProcedure, router } from '../trpc/trpc';

const resolveCreateCategoryUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<CreateCategoryUseCase>(TOKENS.CreateCategoryUseCase);
};

const toCreateCategoryTrpcError = (error: unknown) => {
  if (error instanceof Error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[categories.create] error:', error);
    }

    if (error instanceof TransactionTypeNotFoundError) {
      return new TRPCError({
        code: 'BAD_REQUEST',
        message:
          '取引種別(INCOME/EXPENSE)がDBに未登録です。packages/db の seed を実行してください。',
      });
    }

    if (error instanceof DuplicateCategoryError) {
      return new TRPCError({
        code: 'CONFLICT',
        message: error.message,
      });
    }

    if (
      error instanceof InvalidCategoryNameError ||
      error instanceof InvalidTypeIdError
    ) {
      return new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
      });
    }

    if (
      error.message.includes('Transaction type') &&
      error.message.includes('not found')
    ) {
      return new TRPCError({
        code: 'BAD_REQUEST',
        message:
          '取引種別(INCOME/EXPENSE)がDBに未登録です。packages/db の seed を実行してください。',
      });
    }

    if (error.message.includes('既に存在')) {
      return new TRPCError({
        code: 'CONFLICT',
        message: error.message,
      });
    }

    if (error.message.includes('必須') || error.message.includes('以内')) {
      return new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
      });
    }
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'カテゴリの作成に失敗しました',
  });
};

export const categoryRouter = router({
  create: protectedProcedure
    .input(categoriesCreateInputSchema)
    .output(categoriesCreateOutputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const createCategoryUseCase = resolveCreateCategoryUseCase(ctx.db);
        const category = await createCategoryUseCase.execute({
          name: input.name,
          typeId: input.typeId,
          userId: ctx.userId,
        });

        return {
          category,
        };
      } catch (error) {
        throw toCreateCategoryTrpcError(error);
      }
    }),
});
