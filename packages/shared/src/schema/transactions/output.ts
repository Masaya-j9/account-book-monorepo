import { z } from 'zod';
import { transactionApiSchema, transactionSchema } from './commonSchema';
import {
  TRANSACTIONS_LIST_MAX_LIMIT,
  TRANSACTIONS_LIST_MIN_LIMIT,
  TRANSACTIONS_LIST_MIN_PAGE,
} from './constants';

// =====================================
// Transactions Router Output Schemas
// =====================================

// transactions.create Output
export const transactionsCreateOutputSchema = z.object({
  transaction: transactionSchema,
});

export type TransactionsCreateOutput = z.infer<
  typeof transactionsCreateOutputSchema
>;

// transactions.list Output
export const transactionsListPaginationSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(TRANSACTIONS_LIST_MIN_PAGE),
  limit: z
    .number()
    .int()
    .min(TRANSACTIONS_LIST_MIN_LIMIT)
    .max(TRANSACTIONS_LIST_MAX_LIMIT),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type TransactionsListPagination = z.infer<
  typeof transactionsListPaginationSchema
>;

export const transactionsListOutputSchema = z.object({
  transactions: z.array(transactionApiSchema),
  pagination: transactionsListPaginationSchema,
});

export type TransactionsListOutput = z.infer<
  typeof transactionsListOutputSchema
>;

// transactions.update Output
export const transactionsUpdateOutputSchema = z.object({
  transaction: transactionApiSchema,
});

export type TransactionsUpdateOutput = z.infer<
  typeof transactionsUpdateOutputSchema
>;

// transactions.delete Output
export const transactionsDeleteOutputSchema = z.object({
  deleted: z.boolean(),
});

export type TransactionsDeleteOutput = z.infer<
  typeof transactionsDeleteOutputSchema
>;
