import type { NodePgDatabase } from '@account-book-app/db';
import {
  categoriesCreateInputSchema,
  categoriesCreateOutputSchema,
} from '@account-book-app/shared';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute, z } from '@hono/zod-openapi';

import { createRequestContainer } from '../../../infrastructre/di/container';
import { TOKENS } from '../../../infrastructre/di/tokens';
import type { CreateCategoryUseCase } from '../../../services/categories/create.category.service';
import {
  DuplicateCategoryError,
  InvalidCategoryNameError,
  InvalidTypeIdError,
  TransactionTypeNotFoundError,
} from '../../../services/categories/create-category.errors';

const resolveCreateCategoryUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<CreateCategoryUseCase>(TOKENS.CreateCategoryUseCase);
};

const errorResponseSchema = z.object({
  message: z.string(),
});

const createCategoryRoute = createRoute({
  method: 'post',
  path: '/categories',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: categoriesCreateInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'カテゴリ作成',
      content: {
        'application/json': {
          schema: categoriesCreateOutputSchema,
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
    409: {
      description: '競合（同名カテゴリなど）',
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

export const registerCategoriesOpenApi = (
  app: OpenAPIHono,
  db: NodePgDatabase,
) => {
  app.openapi(createCategoryRoute, async (c) => {
    const input = c.req.valid('json');
    const createCategoryUseCase = resolveCreateCategoryUseCase(db);

    try {
      const record = await createCategoryUseCase.execute({
        name: input.name,
        typeId: input.typeId,
        userId: 1,
      });

      return c.json(
        {
          category: {
            id: record.id,
            name: record.name,
            type: record.type,
            isDefault: record.isDefault,
          },
        },
        200,
      );
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));

      if (
        error instanceof TransactionTypeNotFoundError ||
        error instanceof InvalidCategoryNameError ||
        error instanceof InvalidTypeIdError
      ) {
        return c.json({ message: error.message }, 400);
      }

      if (error instanceof DuplicateCategoryError) {
        return c.json({ message: error.message }, 409);
      }

      return c.json({ message: 'カテゴリの作成に失敗しました' }, 500);
    }
  });
};
