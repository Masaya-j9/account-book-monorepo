import { z } from "zod";

import { transactionTypeSchema } from "../categories/commonSchema";
import {
	TRANSACTION_DATE_REGEX,
	TRANSACTION_MEMO_MAX_LENGTH,
	TRANSACTION_TITLE_MAX_LENGTH,
} from "./constants";

// =====================================
// Transactions Router Input Schemas
// =====================================

// transactions.create
export const transactionsCreateInputSchema = z.object({
	type: transactionTypeSchema,
	title: z
		.string()
		.min(1, "タイトルは必須です")
		.max(
			TRANSACTION_TITLE_MAX_LENGTH,
			`タイトルは${TRANSACTION_TITLE_MAX_LENGTH}文字以内である必要があります`,
		),
	amount: z.number().int().positive("金額は0より大きい必要があります"),
	// NOTE: 現状は文字列で受け取り、バックエンド側の VO で厳密に検証する
	date: z
		.string()
		.regex(TRANSACTION_DATE_REGEX, "日付はYYYY-MM-DD形式である必要があります"),
	categoryId: z.number().int().positive(),
	memo: z
		.string()
		.max(
			TRANSACTION_MEMO_MAX_LENGTH,
			`メモは${TRANSACTION_MEMO_MAX_LENGTH}文字以内である必要があります`,
		)
		.optional()
		.default(""),
});

export type TransactionsCreateInput = z.infer<
	typeof transactionsCreateInputSchema
>;
