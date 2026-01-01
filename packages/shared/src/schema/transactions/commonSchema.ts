import { z } from 'zod';

import { transactionTypeSchema } from '../categories/commonSchema';
import {
  TRANSACTION_CURRENCY_MAX_LENGTH,
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
