import type { NodePgDatabase } from '@account-book-app/db';
import {
  transactionsCreateInputSchema,
  transactionsCreateOutputSchema,
  transactionsDeleteOutputSchema,
  transactionsListInputSchema,
  transactionsListOutputSchema,
  transactionsUpdateInputSchema,
  transactionsUpdateOutputSchema,
} from '@account-book-app/shared';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute, z } from '@hono/zod-openapi';
import type { Context, Env } from 'hono';

import { createRequestContainer } from '../../../infrastructre/di/container';
import { TOKENS } from '../../../services/di/tokens';
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
import { InvalidPaginationError } from '../../../services/transactions/list-transactions.errors';
import type { ListTransactionsUseCase } from '../../../services/transactions/list-transactions.service';
import {
  CategoriesNotFoundError,
  InvalidCategoryIdsError,
  NotOwnerError,
  TransactionNotFoundError,
} from '../../../services/transactions/update-transaction.errors';
import { UnexpectedDeleteTransactionError } from '../../../services/transactions/delete-transaction.errors';
import type { UpdateTransactionUseCase } from '../../../services/transactions/update-transaction.service';
import type { DeleteTransactionUseCase } from '../../../services/transactions/delete-transaction.service';
import { Effect, pipe } from '../../../shared/result';

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

const errorResponseSchema = z.object({
  message: z.string(),
});

type ErrorStatus = 400 | 403 | 404 | 500;

type HttpError<S extends ErrorStatus = ErrorStatus> = {
  status: S;
  message: string;
};

const respondError = <S extends ErrorStatus, E extends Env, P extends string>(
  c: Context<E, P>,
  error: HttpError<S>,
) => c.json({ message: error.message }, error.status);

const normalizeError = (cause: unknown) =>
  cause instanceof Error ? cause : new Error(String(cause));

const toCreateTransactionHttpError = (
  cause: unknown,
): HttpError<400 | 404 | 500> => {
  const error = normalizeError(cause);

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
    return { status: 400, message: error.message };
  }

  if (error instanceof CategoryNotFoundError) {
    return { status: 404, message: error.message };
  }

  return { status: 500, message: '取引の作成に失敗しました' };
};

const toListTransactionsHttpError = (cause: unknown): HttpError<400 | 500> => {
  const error = normalizeError(cause);

  if (error instanceof InvalidPaginationError) {
    return { status: 400, message: error.message };
  }

  return { status: 500, message: '取引一覧の取得に失敗しました' };
};

const toUpdateTransactionsHttpError = (
  cause: unknown,
): HttpError<400 | 403 | 404 | 500> => {
  const error = normalizeError(cause);

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
    return { status: 400, message: error.message };
  }

  if (error instanceof NotOwnerError) {
    return { status: 403, message: error.message };
  }

  if (
    error instanceof TransactionNotFoundError ||
    error instanceof CategoriesNotFoundError
  ) {
    return { status: 404, message: error.message };
  }

  return { status: 500, message: '取引の更新に失敗しました' };
};

const toDeleteTransactionsHttpError = (
  cause: unknown,
): HttpError<403 | 404 | 500> => {
  const error = normalizeError(cause);

  if (error instanceof TransactionNotFoundError) {
    return { status: 404, message: error.message };
  }

  if (error instanceof NotOwnerError) {
    return { status: 403, message: error.message };
  }

  if (error instanceof UnexpectedDeleteTransactionError) {
    return { status: 500, message: error.message };
  }

  return { status: 500, message: '取引の削除に失敗しました' };
};

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

const listTransactionsRoute = createRoute({
  method: 'get',
  path: '/transactions',
  tags: ['transactions'],
  request: {
    query: transactionsListInputSchema,
  },
  responses: {
    200: {
      description: '取引一覧取得',
      content: {
        'application/json': {
          schema: transactionsListOutputSchema,
        },
      },
    },
    400: {
      description: '不正なリクエスト（ページネーション等）',
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

const updateTransactionRoute = createRoute({
  method: 'patch',
  path: '/transactions/{id}',
  tags: ['transactions'],
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: transactionsUpdateInputSchema.omit({ id: true }),
        },
      },
    },
  },
  responses: {
    200: {
      description: '取引更新',
      content: {
        'application/json': {
          schema: transactionsUpdateOutputSchema,
        },
      },
    },
    400: {
      description: '不正なリクエスト（バリデーション等）',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: '権限がありません',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: '参照先が見つからない（取引/カテゴリなど）',
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

const deleteTransactionRoute = createRoute({
  method: 'delete',
  path: '/transactions/{id}',
  tags: ['transactions'],
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: '取引削除',
      content: {
        'application/json': {
          schema: transactionsDeleteOutputSchema,
        },
      },
    },
    403: {
      description: '権限がありません',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: '取引が見つかりません',
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

    return Effect.runPromise(
      pipe(
        Effect.tryPromise({
          try: () =>
            createTransactionUseCase.execute({
              userId: 1, // TODO: 認証実装後にctx.userIdから取得
              type: input.type,
              title: input.title,
              amount: input.amount,
              date: input.date,
              categoryId: input.categoryId,
              memo: input.memo,
            }),
          catch: (cause) => toCreateTransactionHttpError(cause),
        }),
        Effect.match({
          onFailure: (error) => respondError(c, error),
          onSuccess: (record) =>
            c.json(
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
            ),
        }),
      ),
    );
  });

  app.openapi(listTransactionsRoute, async (c) => {
    const input = c.req.valid('query');
    const listTransactionsUseCase = resolveListTransactionsUseCase(db);

    return Effect.runPromise(
      pipe(
        Effect.tryPromise({
          try: () =>
            listTransactionsUseCase.execute({
              userId: 1, // TODO: 認証実装後にctx.userIdから取得
              startDate: input.startDate,
              endDate: input.endDate,
              type: input.type,
              categoryIds: input.categoryIds,
              order: input.order,
              page: input.page,
              limit: input.limit,
            }),
          catch: (cause) => toListTransactionsHttpError(cause),
        }),
        Effect.match({
          onFailure: (error) => respondError(c, error),
          onSuccess: (output) => c.json(output, 200),
        }),
      ),
    );
  });

  app.openapi(updateTransactionRoute, async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const updateTransactionUseCase = resolveUpdateTransactionUseCase(db);

    return Effect.runPromise(
      pipe(
        Effect.tryPromise({
          try: () =>
            updateTransactionUseCase.execute({
              userId: 1, // TODO: 認証実装後にctx.userIdから取得
              id,
              type: body.type,
              title: body.title,
              amount: body.amount,
              date: body.date,
              categoryIds: body.categoryIds,
              memo: body.memo,
            }),
          catch: (cause) => toUpdateTransactionsHttpError(cause),
        }),
        Effect.match({
          onFailure: (error) => respondError(c, error),
          onSuccess: (output) => c.json(output, 200),
        }),
      ),
    );
  });

  app.openapi(deleteTransactionRoute, async (c) => {
    const { id } = c.req.valid('param');
    const deleteTransactionUseCase = resolveDeleteTransactionUseCase(db);

    return Effect.runPromise(
      pipe(
        Effect.tryPromise({
          try: () =>
            deleteTransactionUseCase.execute({
              userId: 1, // TODO: 認証実装後にctx.userIdから取得
              id,
            }),
          catch: (cause) => toDeleteTransactionsHttpError(cause),
        }),
        Effect.match({
          onFailure: (error) => respondError(c, error),
          onSuccess: (output) => c.json(output, 200),
        }),
      ),
    );
  });
};
