import type { NodePgDatabase } from '@account-book-app/db';
import {
  categoriesCreateInputSchema,
  categoriesCreateOutputSchema,
  categoriesGetByIdInputSchema,
  categoriesGetByIdOutputSchema,
  categoriesListInputSchema,
  categoriesListOutputSchema,
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
import type { GetCategoryUseCase } from '../../../services/categories/get-category.service';
import type { ListCategoriesUseCase } from '../../../services/categories/list-categories.service';
import {
  CategoryNotFoundError,
  InvalidCategoryIdError,
  InvalidPaginationError,
  InvalidSortParameterError,
} from '../../../services/categories/read-category.errors';

const resolveCreateCategoryUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<CreateCategoryUseCase>(TOKENS.CreateCategoryUseCase);
};

const resolveListCategoriesUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<ListCategoriesUseCase>(TOKENS.ListCategoriesUseCase);
};

const resolveGetCategoryUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<GetCategoryUseCase>(TOKENS.GetCategoryUseCase);
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

const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/categories',
  request: {
    query: categoriesListInputSchema,
  },
  responses: {
    200: {
      description: 'カテゴリ一覧取得成功',
      content: {
        'application/json': {
          schema: categoriesListOutputSchema,
        },
      },
    },
    400: {
      description: '不正なリクエスト（ページネーションやソートパラメータ不正）',
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

const getCategoryRoute = createRoute({
  method: 'get',
  path: '/categories/{id}',
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: 'カテゴリ取得成功',
      content: {
        'application/json': {
          schema: categoriesGetByIdOutputSchema,
        },
      },
    },
    400: {
      description: '不正なリクエスト（IDが不正）',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: 'カテゴリが見つかりません',
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

  app.openapi(listCategoriesRoute, async (c) => {
    const query = c.req.valid('query');
    const listCategoriesUseCase = resolveListCategoriesUseCase(db);

    try {
      const result = await listCategoriesUseCase.execute({
        userId: 1, // TODO: 認証実装後にctx.userIdから取得
        page: query.page,
        perPage: query.perPage,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        type: query.type,
        includeHidden: query.includeHidden,
      });

      return c.json(result, 200);
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));

      if (
        error instanceof InvalidPaginationError ||
        error instanceof InvalidSortParameterError
      ) {
        return c.json({ message: error.message }, 400);
      }

      return c.json({ message: 'カテゴリ一覧の取得に失敗しました' }, 500);
    }
  });

  app.openapi(getCategoryRoute, async (c) => {
    const { id } = c.req.valid('param');
    const getCategoryUseCase = resolveGetCategoryUseCase(db);

    try {
      const result = await getCategoryUseCase.execute({
        id,
        userId: 1, // TODO: 認証実装後にctx.userIdから取得
      });

      return c.json(result, 200);
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));

      if (error instanceof InvalidCategoryIdError) {
        return c.json({ message: error.message }, 400);
      }

      if (error instanceof CategoryNotFoundError) {
        return c.json({ message: error.message }, 404);
      }

      return c.json({ message: 'カテゴリの取得に失敗しました' }, 500);
    }
  });
};
