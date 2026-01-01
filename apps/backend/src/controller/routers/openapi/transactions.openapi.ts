import type { NodePgDatabase } from '@account-book-app/db';
import {
  transactionsCreateInputSchema,
  transactionsCreateOutputSchema,
} from '@account-book-app/shared';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute, z } from '@hono/zod-openapi';

import { createRequestContainer } from '../../../infrastructre/di/container';
import { TOKENS } from '../../../infrastructre/di/tokens';
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
} from '../../../services/transactions/create-transaction.errors';
import type { CreateTransactionUseCase } from '../../../services/transactions/create-transaction.service';

const resolveCreateTransactionUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<CreateTransactionUseCase>(
    TOKENS.CreateTransactionUseCase,
  );
};

const errorResponseSchema = z.object({
  message: z.string(),
});

const createTransactionRoute = createRoute({
  method: 'post',
  path: '/transactions',
  tags: ['transactions'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: transactionsCreateInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '取引作成',
      content: {
        'application/json': {
          schema: transactionsCreateOutputSchema,
        },
      },
    },
    400: {
      description: '不正なリクエスト',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: '参照先が見つからない（カテゴリなど）',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: 'サーバーエラー',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

export const registerTransactionsOpenApi = (
  app: OpenAPIHono,
  db: NodePgDatabase,
) => {
  app.openapi(createTransactionRoute, async (c) => {
    const input = c.req.valid('json');
    const createTransactionUseCase = resolveCreateTransactionUseCase(db);

    try {
      const record = await createTransactionUseCase.execute({
        userId: 1, // TODO: 認証実装後にctx.userIdから取得
        type: input.type,
        title: input.title,
        amount: input.amount,
        date: input.date,
        categoryId: input.categoryId,
        memo: input.memo,
      });

      return c.json(
        {
          transaction: {
            id: record.id,
            userId: record.userId,
            type: record.type,
            title: record.title,
            amount: record.amount,
            currency: record.currency,
            date: record.date,
            categoryId: record.categoryId,
            memo: record.memo,
          },
        },
        200,
      );
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));

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
        return c.json({ message: error.message }, 400);
      }

      if (error instanceof CategoryNotFoundError) {
        return c.json({ message: error.message }, 404);
      }

      return c.json({ message: '取引の作成に失敗しました' }, 500);
    }
  });
};
