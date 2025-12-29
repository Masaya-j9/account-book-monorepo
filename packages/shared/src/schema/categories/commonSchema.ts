import { z } from 'zod';

// =====================================
// TransactionType Union
// =====================================

export const transactionTypeSchema = z.union([
  z.literal('INCOME'),
  z.literal('EXPENSE'),
]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

// =====================================
// Category Base Schema
// =====================================

export const categorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  type: transactionTypeSchema,
  isDefault: z.boolean(),
});

export type Category = z.infer<typeof categorySchema>;

// =====================================
// UserCategory Schema
// =====================================

export const userCategorySchema = categorySchema.extend({
  isVisible: z.boolean(),
  customName: z.string().max(50).nullable(),
  displayOrder: z.number().int().nonnegative(),
});

export type UserCategory = z.infer<typeof userCategorySchema>;
