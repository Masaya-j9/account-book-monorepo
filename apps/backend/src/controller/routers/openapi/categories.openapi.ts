import type { NodePgDatabase } from "@account-book-app/db";
import {
	categoriesCreateInputSchema,
	categoriesCreateOutputSchema,
	categoriesGetByIdOutputSchema,
	categoriesListInputSchema,
	categoriesListOutputSchema,
	categoriesUpdateInputSchema,
	categoriesUpdateOutputSchema,
} from "@account-book-app/shared";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import type { Context, Env } from "hono";

import { createRequestContainer } from "../../../infrastructre/di/container";
import type { CreateCategoryUseCase } from "../../../services/categories/create.category.service";
import {
	DuplicateCategoryError,
	InvalidCategoryNameError,
	InvalidTypeIdError,
	TransactionTypeNotFoundError,
} from "../../../services/categories/create-category.errors";
import type { GetCategoryUseCase } from "../../../services/categories/get-category.service";
import type { ListCategoriesUseCase } from "../../../services/categories/list-categories.service";
import {
	CategoryNotFoundError,
	InvalidCategoryIdError,
	InvalidPaginationError,
	InvalidSortParameterError,
} from "../../../services/categories/read-category.errors";
import {
	DefaultCategoryUpdateForbiddenError,
	InvalidUpdateDataError,
	CategoryNotFoundError as UpdateCategoryNotFoundError,
} from "../../../services/categories/update-category.errors";
import type { UpdateCategoryUseCase } from "../../../services/categories/update-category.service";
import { TOKENS } from "../../../services/di/tokens";
import { Effect, pipe } from "../../../shared/result";

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

const resolveUpdateCategoryUseCase = (db: NodePgDatabase) => {
	const container = createRequestContainer(db);
	return container.get<UpdateCategoryUseCase>(TOKENS.UpdateCategoryUseCase);
};

const errorResponseSchema = z.object({
	message: z.string(),
});

type ErrorStatus = 400 | 403 | 404 | 409 | 500;

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

const toCreateCategoryHttpError = (
	cause: unknown,
): HttpError<400 | 409 | 500> => {
	const error = normalizeError(cause);

	if (
		error instanceof TransactionTypeNotFoundError ||
		error instanceof InvalidCategoryNameError ||
		error instanceof InvalidTypeIdError
	) {
		return { status: 400, message: error.message };
	}

	if (error instanceof DuplicateCategoryError) {
		return { status: 409, message: error.message };
	}

	return { status: 500, message: "カテゴリの作成に失敗しました" };
};

const toListCategoriesHttpError = (cause: unknown): HttpError<400 | 500> => {
	const error = normalizeError(cause);

	if (
		error instanceof InvalidPaginationError ||
		error instanceof InvalidSortParameterError
	) {
		return { status: 400, message: error.message };
	}

	return { status: 500, message: "カテゴリ一覧の取得に失敗しました" };
};

const toGetCategoryHttpError = (cause: unknown): HttpError<400 | 404 | 500> => {
	const error = normalizeError(cause);

	if (error instanceof InvalidCategoryIdError) {
		return { status: 400, message: error.message };
	}

	if (error instanceof CategoryNotFoundError) {
		return { status: 404, message: error.message };
	}

	return { status: 500, message: "カテゴリの取得に失敗しました" };
};

const toUpdateCategoryHttpError = (
	cause: unknown,
): HttpError<400 | 403 | 404 | 500> => {
	const error = normalizeError(cause);

	if (error instanceof InvalidUpdateDataError) {
		return { status: 400, message: error.message };
	}

	if (error instanceof DefaultCategoryUpdateForbiddenError) {
		return { status: 403, message: error.message };
	}

	if (error instanceof UpdateCategoryNotFoundError) {
		return { status: 404, message: error.message };
	}

	return { status: 500, message: "カテゴリの更新に失敗しました" };
};

const createCategoryRoute = createRoute({
	method: "post",
	path: "/categories",
	tags: ["categories"],
	request: {
		body: {
			required: true,
			content: {
				"application/json": {
					schema: categoriesCreateInputSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: "カテゴリ作成",
			content: {
				"application/json": {
					schema: categoriesCreateOutputSchema,
				},
			},
		},
		400: {
			description: "不正なリクエスト",
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
		},
		409: {
			description: "競合（同名カテゴリなど）",
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
		},
		500: {
			description: "サーバーエラー",
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
		},
	},
});

const listCategoriesRoute = createRoute({
	method: "get",
	path: "/categories",
	tags: ["categories"],
	request: {
		query: categoriesListInputSchema,
	},
	responses: {
		200: {
			description: "カテゴリ一覧取得成功",
			content: {
				"application/json": {
					schema: categoriesListOutputSchema,
				},
			},
		},
		400: {
			description: "不正なリクエスト（ページネーションやソートパラメータ不正）",
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
		},
		500: {
			description: "サーバーエラー",
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
		},
	},
});

const getCategoryRoute = createRoute({
	method: "get",
	path: "/categories/{id}",
	tags: ["categories"],
	request: {
		params: z.object({
			id: z.string().regex(/^\d+$/).transform(Number),
		}),
	},
	responses: {
		200: {
			description: "カテゴリ取得成功",
			content: {
				"application/json": {
					schema: categoriesGetByIdOutputSchema,
				},
			},
		},
		400: {
			description: "不正なリクエスト（IDが不正）",
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
		},
		404: {
			description: "カテゴリが見つかりません",
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
		},
		500: {
			description: "サーバーエラー",
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
		},
	},
});

const updateCategoryRoute = createRoute({
	method: "put",
	path: "/categories/{id}",
	tags: ["categories"],
	request: {
		params: z.object({
			id: z.string().regex(/^\d+$/).transform(Number),
		}),
		body: {
			required: true,
			content: {
				"application/json": {
					schema: categoriesUpdateInputSchema.omit({ categoryId: true }),
				},
			},
		},
	},
	responses: {
		200: {
			description: "カテゴリ更新成功",
			content: {
				"application/json": {
					schema: categoriesUpdateOutputSchema,
				},
			},
		},
		400: {
			description: "不正なリクエスト（更新データが不正）",
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
		},
		403: {
			description: "デフォルトカテゴリの更新は禁止されています",
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
		},
		404: {
			description: "カテゴリが見つかりません",
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
		},
		500: {
			description: "サーバーエラー",
			content: {
				"application/json": {
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
		const input = c.req.valid("json");
		const createCategoryUseCase = resolveCreateCategoryUseCase(db);

		return Effect.runPromise(
			pipe(
				Effect.tryPromise({
					try: () =>
						createCategoryUseCase.execute({
							name: input.name,
							typeId: input.typeId,
							userId: 1,
						}),
					catch: (cause) => toCreateCategoryHttpError(cause),
				}),
				Effect.match({
					onFailure: (error) => respondError(c, error),
					onSuccess: (record) =>
						c.json(
							{
								category: {
									id: record.id,
									name: record.name,
									type: record.type,
									isDefault: record.isDefault,
								},
							},
							200,
						),
				}),
			),
		);
	});

	app.openapi(listCategoriesRoute, async (c) => {
		const query = c.req.valid("query");
		const listCategoriesUseCase = resolveListCategoriesUseCase(db);

		return Effect.runPromise(
			pipe(
				Effect.tryPromise({
					try: () =>
						listCategoriesUseCase.execute({
							userId: 1, // TODO: 認証実装後にctx.userIdから取得
							page: query.page,
							perPage: query.perPage,
							sortBy: query.sortBy,
							sortOrder: query.sortOrder,
							type: query.type,
							includeHidden: query.includeHidden,
						}),
					catch: (cause) => toListCategoriesHttpError(cause),
				}),
				Effect.match({
					onFailure: (error) => respondError(c, error),
					onSuccess: (result) => c.json(result, 200),
				}),
			),
		);
	});

	app.openapi(getCategoryRoute, async (c) => {
		const { id } = c.req.valid("param");
		const getCategoryUseCase = resolveGetCategoryUseCase(db);

		return Effect.runPromise(
			pipe(
				Effect.tryPromise({
					try: () =>
						getCategoryUseCase.execute({
							id,
							userId: 1, // TODO: 認証実装後にctx.userIdから取得
						}),
					catch: (cause) => toGetCategoryHttpError(cause),
				}),
				Effect.match({
					onFailure: (error) => respondError(c, error),
					onSuccess: (result) => c.json(result, 200),
				}),
			),
		);
	});

	app.openapi(updateCategoryRoute, async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const updateCategoryUseCase = resolveUpdateCategoryUseCase(db);

		return Effect.runPromise(
			pipe(
				Effect.tryPromise({
					try: () =>
						updateCategoryUseCase.execute({
							categoryId: id,
							userId: 1, // TODO: 認証実装後にctx.userIdから取得
							isVisible: body.isVisible,
							customName: body.customName,
							displayOrder: body.displayOrder,
						}),
					catch: (cause) => toUpdateCategoryHttpError(cause),
				}),
				Effect.match({
					onFailure: (error) => respondError(c, error),
					onSuccess: (category) => c.json({ category }, 200),
				}),
			),
		);
	});
};
