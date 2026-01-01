import { z } from "zod";

import { transactionSchema } from "./commonSchema";

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
