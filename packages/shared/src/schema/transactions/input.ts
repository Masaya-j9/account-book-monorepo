import { z } from 'zod';

import { transactionTypeSchema } from '../categories/commonSchema';
import {
  TRANSACTION_DATE_REGEX,
  TRANSACTION_MEMO_MAX_LENGTH,
  TRANSACTION_TITLE_MAX_LENGTH,
  TRANSACTIONS_LIST_DEFAULT_LIMIT,
  TRANSACTIONS_LIST_DEFAULT_ORDER,
  TRANSACTIONS_LIST_DEFAULT_PAGE,
  TRANSACTIONS_LIST_MAX_LIMIT,
  TRANSACTIONS_LIST_MIN_LIMIT,
  TRANSACTIONS_LIST_MIN_PAGE,
  TRANSACTIONS_LIST_ORDER_VALUES,
} from './constants';

// =====================================
// Transactions Router Input Schemas
// =====================================

// transactions.create
export const transactionsCreateInputSchema = z.object({
  type: transactionTypeSchema,
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(
      TRANSACTION_TITLE_MAX_LENGTH,
      `タイトルは${TRANSACTION_TITLE_MAX_LENGTH}文字以内である必要があります`,
    ),
  amount: z.number().int().positive('金額は0より大きい必要があります'),
  // NOTE: 現状は文字列で受け取り、バックエンド側の VO で厳密に検証する
  date: z
    .string()
    .regex(TRANSACTION_DATE_REGEX, '日付はYYYY-MM-DD形式である必要があります'),
  categoryId: z.number().int().positive(),
  memo: z
    .string()
    .max(
      TRANSACTION_MEMO_MAX_LENGTH,
      `メモは${TRANSACTION_MEMO_MAX_LENGTH}文字以内である必要があります`,
    )
    .optional()
    .default(''),
});

export type TransactionsCreateInput = z.infer<
  typeof transactionsCreateInputSchema
>;

// transactions.list
export const transactionsListInputSchema = z
  .object({
    startDate: z
      .string()
      .regex(
        TRANSACTION_DATE_REGEX,
        'startDate はYYYY-MM-DD形式である必要があります',
      )
      .optional(),
    endDate: z
      .string()
      .regex(
        TRANSACTION_DATE_REGEX,
        'endDate はYYYY-MM-DD形式である必要があります',
      )
      .optional(),
    type: transactionTypeSchema.optional(),
    categoryIds: z.array(z.number().int().positive()).optional(),
    order: z
      .enum(TRANSACTIONS_LIST_ORDER_VALUES)
      .default(TRANSACTIONS_LIST_DEFAULT_ORDER),
    page: z.coerce
      .number()
      .int()
      .min(TRANSACTIONS_LIST_MIN_PAGE, 'page は1以上の整数である必要があります')
      .default(TRANSACTIONS_LIST_DEFAULT_PAGE),
    limit: z.coerce
      .number()
      .int()
      .min(
        TRANSACTIONS_LIST_MIN_LIMIT,
        'limit は1以上の整数である必要があります',
      )
      .max(
        TRANSACTIONS_LIST_MAX_LIMIT,
        `limit は${TRANSACTIONS_LIST_MAX_LIMIT}以下である必要があります`,
      )
      .default(TRANSACTIONS_LIST_DEFAULT_LIMIT),
  })
  .refine(
    ({ startDate, endDate }) =>
      startDate === undefined || endDate === undefined || startDate <= endDate,
    {
      message: 'startDate は endDate より後にできません',
      path: ['startDate'],
    },
  );

export type TransactionsListInput = z.infer<typeof transactionsListInputSchema>;
