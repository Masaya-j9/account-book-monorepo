import { z } from 'zod';

import {
  categorySchema,
  transactionTypeSchema,
} from '../categories/commonSchema';
import {
  TRANSACTION_CURRENCY_MAX_LENGTH,
  TRANSACTION_DATE_REGEX,
  TRANSACTION_MEMO_MAX_LENGTH,
  TRANSACTION_TITLE_MAX_LENGTH,
} from './constants';

// =====================================
// Transaction Base Schema
// =====================================

export const transactionSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  type: transactionTypeSchema,
  title: z.string().min(1).max(TRANSACTION_TITLE_MAX_LENGTH),
  amount: z.number().int().positive(),
  currency: z.string().min(1).max(TRANSACTION_CURRENCY_MAX_LENGTH),
  date: z.string().min(1),
  categoryId: z.number().int().positive(),
  memo: z.string().max(TRANSACTION_MEMO_MAX_LENGTH),
});

export type Transaction = z.infer<typeof transactionSchema>;

// =====================================
// Transaction API Schema (I/F 準拠)
// =====================================

export const transactionApiSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  type: transactionTypeSchema,
  title: z.string().min(1).max(TRANSACTION_TITLE_MAX_LENGTH),
  amount: z.number().int().positive(),
  currencyCode: z.string().min(1).max(TRANSACTION_CURRENCY_MAX_LENGTH),
  date: z
    .string()
    .regex(TRANSACTION_DATE_REGEX, '日付はYYYY-MM-DD形式である必要があります'),
  categories: z.array(categorySchema),
  memo: z.string().max(TRANSACTION_MEMO_MAX_LENGTH).nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type TransactionApi = z.infer<typeof transactionApiSchema>;
