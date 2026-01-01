import { z } from "zod";
import { paginationInputSchema, sortOrderSchema } from "../common/pagination";
import { transactionTypeSchema } from "./commonSchema";

// =====================================
// Categories Router Input Schemas
// =====================================

// categories.create
export const categoriesCreateInputSchema = z.object({
	name: z
		.string()
		.min(1, "カテゴリ名は必須です")
		.max(50, "カテゴリ名は50文字以内である必要があります"),
	typeId: z.number().int().positive(),
});

export type CategoriesCreateInput = z.infer<typeof categoriesCreateInputSchema>;

const booleanFromQueryParamSchema = z.preprocess((value) => {
	if (typeof value !== "string") {
		return value;
	}

	const normalized = value.trim().toLowerCase();

	if (normalized === "true" || normalized === "1") {
		return true;
	}

	if (normalized === "false" || normalized === "0") {
		return false;
	}

	return value;
}, z.boolean());

// categories.list
export const categoriesListInputSchema = z
	.object({
		type: transactionTypeSchema.optional(),
		// NOTE: OpenAPI の query param は文字列になるため、boolean に寄せる
		includeHidden: booleanFromQueryParamSchema.optional().default(false),
		sortBy: z
			.enum(["name", "createdAt", "displayOrder"])
			.optional()
			.default("displayOrder"),
		sortOrder: sortOrderSchema.optional().default("asc"),
	})
	.merge(paginationInputSchema);

export type CategoriesListInput = z.infer<typeof categoriesListInputSchema>;

// categories.getById
export const categoriesGetByIdInputSchema = z.object({
	id: z.number().int().positive(),
});

export type CategoriesGetByIdInput = z.infer<
	typeof categoriesGetByIdInputSchema
>;

// categories.update
export const categoriesUpdateInputSchema = z.object({
	categoryId: z.number().int().positive(),
	isVisible: z.boolean().optional(),
	customName: z
		.string()
		.min(1, "カスタム名は必須です")
		.max(50, "カスタム名は50文字以内である必要があります")
		.optional(),
	displayOrder: z.number().int().nonnegative().optional(),
});

export type CategoriesUpdateInput = z.infer<typeof categoriesUpdateInputSchema>;

// categories.reorder
export const categoryOrderSchema = z.object({
	categoryId: z.number().int().positive(),
	order: z.number().int().nonnegative(),
});

export const categoriesReorderInputSchema = z.object({
	categoryOrders: z.array(categoryOrderSchema).min(1),
});

export type CategoriesReorderInput = z.infer<
	typeof categoriesReorderInputSchema
>;
