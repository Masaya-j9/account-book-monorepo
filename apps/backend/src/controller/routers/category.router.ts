// Presentation Layer: Category Router
// カテゴリ関連のtRPCエンドポイント

import type { NodePgDatabase } from "@account-book-app/db";
import {
	categoriesCreateInputSchema,
	categoriesCreateOutputSchema,
	categoriesGetByIdInputSchema,
	categoriesGetByIdOutputSchema,
	categoriesListInputSchema,
	categoriesListOutputSchema,
	categoriesUpdateInputSchema,
	categoriesUpdateOutputSchema,
} from "@account-book-app/shared";
import { TRPCError } from "@trpc/server";
import { createRequestContainer } from "../../infrastructre/di/container";
import type { CreateCategoryUseCase } from "../../services/categories/create.category.service";
import {
	DuplicateCategoryError,
	InvalidCategoryNameError,
	InvalidTypeIdError,
	TransactionTypeNotFoundError,
} from "../../services/categories/create-category.errors";
import type { GetCategoryUseCase } from "../../services/categories/get-category.service";
import type { ListCategoriesUseCase } from "../../services/categories/list-categories.service";
import {
	CategoryNotFoundError,
	InvalidCategoryIdError,
	InvalidPaginationError,
	InvalidSortParameterError,
} from "../../services/categories/read-category.errors";
import {
	DefaultCategoryUpdateForbiddenError,
	InvalidUpdateDataError,
	CategoryNotFoundError as UpdateCategoryNotFoundError,
} from "../../services/categories/update-category.errors";
import type { UpdateCategoryUseCase } from "../../services/categories/update-category.service";
import { TOKENS } from "../../services/di/tokens";
import { protectedProcedure, router } from "../trpc/trpc";

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

const toCreateCategoryTrpcError = <T>(cause: T) => {
	const error = cause instanceof Error ? cause : new Error(String(cause));

	if (process.env.NODE_ENV !== "production") {
		console.error("[categories.create] error:", error);
	}

	if (error instanceof TransactionTypeNotFoundError) {
		return new TRPCError({
			code: "BAD_REQUEST",
			message:
				"取引種別(INCOME/EXPENSE)がDBに未登録です。packages/db の seed を実行してください。",
		});
	}

	if (error instanceof DuplicateCategoryError) {
		return new TRPCError({
			code: "CONFLICT",
			message: error.message,
		});
	}

	if (
		error instanceof InvalidCategoryNameError ||
		error instanceof InvalidTypeIdError
	) {
		return new TRPCError({
			code: "BAD_REQUEST",
			message: error.message,
		});
	}

	return new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "カテゴリの作成に失敗しました",
	});
};

const toListCategoriesTrpcError = <T>(cause: T) => {
	const error = cause instanceof Error ? cause : new Error(String(cause));

	if (process.env.NODE_ENV !== "production") {
		console.error("[categories.list] error:", error);
	}

	if (
		error instanceof InvalidPaginationError ||
		error instanceof InvalidSortParameterError
	) {
		return new TRPCError({
			code: "BAD_REQUEST",
			message: error.message,
		});
	}

	return new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "カテゴリ一覧の取得に失敗しました",
	});
};

const toGetCategoryTrpcError = <T>(cause: T) => {
	const error = cause instanceof Error ? cause : new Error(String(cause));

	if (process.env.NODE_ENV !== "production") {
		console.error("[categories.get] error:", error);
	}

	if (error instanceof CategoryNotFoundError) {
		return new TRPCError({
			code: "NOT_FOUND",
			message: error.message,
		});
	}

	if (error instanceof InvalidCategoryIdError) {
		return new TRPCError({
			code: "BAD_REQUEST",
			message: error.message,
		});
	}

	return new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "カテゴリの取得に失敗しました",
	});
};

const toUpdateCategoryTrpcError = <T>(cause: T) => {
	const error = cause instanceof Error ? cause : new Error(String(cause));

	if (process.env.NODE_ENV !== "production") {
		console.error("[categories.update] error:", error);
	}

	if (error instanceof UpdateCategoryNotFoundError) {
		return new TRPCError({
			code: "NOT_FOUND",
			message: error.message,
		});
	}

	if (error instanceof DefaultCategoryUpdateForbiddenError) {
		return new TRPCError({
			code: "FORBIDDEN",
			message: error.message,
		});
	}

	if (error instanceof InvalidUpdateDataError) {
		return new TRPCError({
			code: "BAD_REQUEST",
			message: error.message,
		});
	}

	return new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "カテゴリの更新に失敗しました",
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

	list: protectedProcedure
		.input(categoriesListInputSchema)
		.output(categoriesListOutputSchema)
		.query(async ({ input, ctx }) => {
			try {
				const listCategoriesUseCase = resolveListCategoriesUseCase(ctx.db);
				const result = await listCategoriesUseCase.execute({
					userId: ctx.userId,
					page: input.page,
					perPage: input.perPage,
					sortBy: input.sortBy,
					sortOrder: input.sortOrder,
					type: input.type,
					includeHidden: input.includeHidden,
				});

				return result;
			} catch (error) {
				throw toListCategoriesTrpcError(error);
			}
		}),

	get: protectedProcedure
		.input(categoriesGetByIdInputSchema)
		.output(categoriesGetByIdOutputSchema)
		.query(async ({ input, ctx }) => {
			try {
				const getCategoryUseCase = resolveGetCategoryUseCase(ctx.db);
				const result = await getCategoryUseCase.execute({
					id: input.id,
					userId: ctx.userId,
				});

				return result;
			} catch (error) {
				throw toGetCategoryTrpcError(error);
			}
		}),

	update: protectedProcedure
		.input(categoriesUpdateInputSchema)
		.output(categoriesUpdateOutputSchema)
		.mutation(async ({ input, ctx }) => {
			try {
				const updateCategoryUseCase = resolveUpdateCategoryUseCase(ctx.db);
				const category = await updateCategoryUseCase.execute({
					categoryId: input.categoryId,
					userId: ctx.userId,
					isVisible: input.isVisible,
					customName: input.customName,
					displayOrder: input.displayOrder,
				});

				return {
					category,
				};
			} catch (error) {
				throw toUpdateCategoryTrpcError(error);
			}
		}),
});
