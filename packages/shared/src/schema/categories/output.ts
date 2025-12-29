import { z } from 'zod';
import { categorySchema, userCategorySchema } from './commonSchema';

// =====================================
// Categories Router Output Schemas
// =====================================

// categories.create Output
export const categoriesCreateOutputSchema = z.object({
  category: categorySchema,
});

export type CategoriesCreateOutput = z.infer<
  typeof categoriesCreateOutputSchema
>;

// categories.list Output
export const categoriesListOutputSchema = z.object({
  categories: z.array(userCategorySchema),
});

export type CategoriesListOutput = z.infer<typeof categoriesListOutputSchema>;

// categories.getById Output
export const categoriesGetByIdOutputSchema = z.object({
  category: userCategorySchema,
});

export type CategoriesGetByIdOutput = z.infer<
  typeof categoriesGetByIdOutputSchema
>;

// categories.update Output
export const categoriesUpdateOutputSchema = z.object({
  category: userCategorySchema,
});

export type CategoriesUpdateOutput = z.infer<
  typeof categoriesUpdateOutputSchema
>;

// categories.reorder Output
export const categoriesReorderOutputSchema = z.object({
  success: z.boolean(),
});

export type CategoriesReorderOutput = z.infer<
  typeof categoriesReorderOutputSchema
>;
