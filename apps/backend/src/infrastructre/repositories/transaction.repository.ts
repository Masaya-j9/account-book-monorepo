import {
	and,
	asc,
	count,
	currencies,
	desc,
	eq,
	type NodePgDatabase,
	sql,
	transactionCategories,
	transactions,
	transactionTypes,
} from "@account-book-app/db";
import { inject, injectable } from "inversify";

import type {
	CreateTransactionData,
	Transaction,
	TransactionListItemRecord,
	TransactionRecord,
} from "../../domain/entities/transaction.entity";
import type {
	ITransactionRepository,
	ListTransactionsQuery,
	ListTransactionsResult,
} from "../../domain/repositories/transaction.repository.interface";
import { TransactionDate } from "../../domain/values/transaction-date";
import { TOKENS } from "../../services/di/tokens";

const DEFAULT_CURRENCY_CODE = "JPY" as const;

const toTransactionType = (code: string): "INCOME" | "EXPENSE" => {
	if (code === "INCOME" || code === "EXPENSE") {
		return code;
	}
	throw new Error(`Unsupported transaction type code: ${code}`);
};

type JoinedTransactionRow = {
	transaction: typeof transactions.$inferSelect;
	transactionType: typeof transactionTypes.$inferSelect;
	currency: typeof currencies.$inferSelect;
	transactionCategory: typeof transactionCategories.$inferSelect | null;
};

const toDateString = (value: string | Date): string =>
	TransactionDate.fromDateLike(value).format();

const buildInNumberList = (
	column:
		| typeof transactionCategories.transactionId
		| typeof transactionCategories.categoryId,
	values: number[],
): ReturnType<typeof sql> =>
	sql`${column} in (${sql.join(
		values.map((v) => sql`${v}`),
		sql`, `,
	)})`;

@injectable()
export class TransactionRepository implements ITransactionRepository {
	@inject(TOKENS.Db)
	private db!: NodePgDatabase;

	async create(data: CreateTransactionData): Promise<TransactionRecord> {
		return await this.db.transaction(async (tx) => {
			const [transactionType] = await tx
				.select()
				.from(transactionTypes)
				.where(eq(transactionTypes.code, data.type))
				.limit(1);

			if (!transactionType) {
				throw new Error(`Transaction type ${data.type} not found`);
			}

			const typeCode = toTransactionType(transactionType.code);

			const [currency] = await tx
				.select()
				.from(currencies)
				.where(eq(currencies.code, DEFAULT_CURRENCY_CODE))
				.limit(1);

			if (!currency) {
				throw new Error(`Currency ${DEFAULT_CURRENCY_CODE} not found`);
			}

			const [created] = await tx
				.insert(transactions)
				.values({
					userId: data.userId,
					typeId: transactionType.id,
					title: data.title,
					amount: data.amount,
					currencyId: currency.id,
					date: data.date,
					memo: data.memo.length === 0 ? null : data.memo,
				})
				.returning();

			await tx.insert(transactionCategories).values({
				transactionId: created.id,
				categoryId: data.categoryId,
			});

			return {
				id: created.id,
				userId: created.userId,
				type: typeCode,
				title: created.title,
				amount: created.amount,
				currency: currency.code,
				date: toDateString(created.date),
				categoryId: data.categoryId,
				memo: data.memo,
				createdAt: created.createdAt,
				updatedAt: created.updatedAt,
			};
		});
	}

	async findById(id: number): Promise<TransactionRecord | null> {
		const results = await this.selectJoinedTransactions(
			sql`${transactions.id} = ${id} and ${transactions.deletedAt} is null`,
		);

		return results.length === 0 ? null : results[0];
	}

	async findCategoryIdsByTransactionId(
		transactionId: number,
	): Promise<number[]> {
		const rows: { categoryId: number }[] = await this.db
			.select({ categoryId: transactionCategories.categoryId })
			.from(transactionCategories)
			.innerJoin(
				transactions,
				eq(transactionCategories.transactionId, transactions.id),
			)
			.where(
				sql`${transactionCategories.transactionId} = ${transactionId} and ${transactions.deletedAt} is null`,
			)
			.orderBy(asc(transactionCategories.id));

		return rows.map((r) => r.categoryId);
	}

	async findByUserId(userId: number): Promise<TransactionRecord[]> {
		return await this.selectJoinedTransactions(
			sql`${transactions.userId} = ${userId} and ${transactions.deletedAt} is null`,
		);
	}

	async findByUserIdAndPeriod(
		userId: number,
		startDate: string,
		endDate: string,
	): Promise<TransactionRecord[]> {
		return await this.selectJoinedTransactions(
			sql`${transactions.userId} = ${userId} and ${transactions.deletedAt} is null and ${transactions.date} >= ${startDate} and ${transactions.date} <= ${endDate}`,
		);
	}

	async listByUserId(
		query: ListTransactionsQuery,
	): Promise<ListTransactionsResult> {
		const baseConditions = [
			sql`${transactions.userId} = ${query.userId}`,
			sql`${transactions.deletedAt} is null`,
		];

		const dateConditions = [
			query.startDate ? sql`${transactions.date} >= ${query.startDate}` : null,
			query.endDate ? sql`${transactions.date} <= ${query.endDate}` : null,
		].filter((v): v is ReturnType<typeof sql> => v !== null);

		const whereForTransactions = and(...baseConditions, ...dateConditions);

		const typeCondition =
			query.type !== undefined
				? sql`${transactionTypes.code} = ${query.type}`
				: null;

		const categoryCondition =
			query.categoryIds !== undefined && query.categoryIds.length > 0
				? sql`exists (
					select 1
					from ${transactionCategories}
					where ${transactionCategories.transactionId} = ${transactions.id}
						and ${buildInNumberList(transactionCategories.categoryId, query.categoryIds)}
				)`
				: null;

		const whereClause = and(
			whereForTransactions,
			...(typeCondition ? [typeCondition] : []),
			...(categoryCondition ? [categoryCondition] : []),
		);

		const [{ total }] = await this.db
			.select({
				total: count(),
			})
			.from(transactions)
			.innerJoin(transactionTypes, eq(transactions.typeId, transactionTypes.id))
			.where(whereClause);

		const totalCount = Number(total ?? 0);

		const rows: {
			transaction: typeof transactions.$inferSelect;
			transactionType: typeof transactionTypes.$inferSelect;
			currency: typeof currencies.$inferSelect;
		}[] = await this.db
			.select({
				transaction: transactions,
				transactionType: transactionTypes,
				currency: currencies,
			})
			.from(transactions)
			.innerJoin(transactionTypes, eq(transactions.typeId, transactionTypes.id))
			.innerJoin(currencies, eq(transactions.currencyId, currencies.id))
			.where(whereClause)
			.orderBy(
				({ asc, desc } as const)[query.order](transactions.date),
				({ asc, desc } as const)[query.order](transactions.id),
			)
			.limit(query.limit)
			.offset(query.offset);

		const transactionIds = rows.map((r) => r.transaction.id);

		if (transactionIds.length === 0) {
			return {
				items: [],
				total: totalCount,
			};
		}

		const categoryRows: {
			transactionId: number;
			categoryId: number;
		}[] = await this.db
			.select({
				transactionId: transactionCategories.transactionId,
				categoryId: transactionCategories.categoryId,
			})
			.from(transactionCategories)
			.where(
				buildInNumberList(transactionCategories.transactionId, transactionIds),
			)
			.orderBy(asc(transactionCategories.id));

		const categoryIdsByTransactionId = new Map(
			transactionIds.map((transactionId) => [
				transactionId,
				categoryRows
					.filter((row) => row.transactionId === transactionId)
					.map((row) => row.categoryId),
			]),
		);

		const items: TransactionListItemRecord[] = rows.map((row) => ({
			id: row.transaction.id,
			userId: row.transaction.userId,
			type: toTransactionType(row.transactionType.code),
			title: row.transaction.title,
			amount: row.transaction.amount,
			currencyCode: row.currency.code,
			date: toDateString(row.transaction.date),
			categoryIds: categoryIdsByTransactionId.get(row.transaction.id) ?? [],
			memo: row.transaction.memo,
			createdAt: row.transaction.createdAt,
			updatedAt: row.transaction.updatedAt,
		}));

		return {
			items,
			total: totalCount,
		};
	}

	async update(
		transaction: Transaction,
		options?: { categoryIds?: number[] },
	): Promise<TransactionRecord> {
		return await this.db.transaction(async (tx) => {
			const [currency] = await tx
				.select()
				.from(currencies)
				.where(eq(currencies.code, transaction.amount.currency))
				.limit(1);

			if (!currency) {
				throw new Error(`Currency ${transaction.amount.currency} not found`);
			}

			const [type] = await tx
				.select()
				.from(transactionTypes)
				.where(eq(transactionTypes.code, transaction.type))
				.limit(1);

			if (!type) {
				throw new Error(`Transaction type ${transaction.type} not found`);
			}

			const [updated] = await tx
				.update(transactions)
				.set({
					title: transaction.title,
					amount: transaction.amount.amount,
					currencyId: currency.id,
					typeId: type.id,
					date: transaction.date.format(),
					memo: transaction.memo.length === 0 ? null : transaction.memo,
					updatedAt: sql`now()`,
				})
				.where(eq(transactions.id, transaction.id))
				.returning();

			if (options?.categoryIds !== undefined) {
				await tx
					.delete(transactionCategories)
					.where(eq(transactionCategories.transactionId, updated.id));

				if (options.categoryIds.length > 0) {
					await tx.insert(transactionCategories).values(
						options.categoryIds.map((categoryId) => ({
							transactionId: updated.id,
							categoryId,
						})),
					);
				}
			}

			const categoryIds =
				options?.categoryIds !== undefined
					? options.categoryIds
					: (
							await tx
								.select({ categoryId: transactionCategories.categoryId })
								.from(transactionCategories)
								.where(eq(transactionCategories.transactionId, updated.id))
								.orderBy(asc(transactionCategories.id))
						).map((r) => r.categoryId);

			const primaryCategoryId = categoryIds[0];

			if (primaryCategoryId === undefined) {
				throw new Error(`Transaction ${updated.id} has no category`);
			}

			return {
				id: updated.id,
				userId: updated.userId,
				type: toTransactionType(type.code),
				title: updated.title,
				amount: updated.amount,
				currency: currency.code,
				date: toDateString(updated.date),
				categoryId: primaryCategoryId,
				memo: updated.memo ?? "",
				createdAt: updated.createdAt,
				updatedAt: updated.updatedAt,
			};
		});
	}

	async delete(id: number): Promise<void> {
		await this.db
			.update(transactions)
			.set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
			.where(eq(transactions.id, id));
	}

	async existsByCategoryId(categoryId: number): Promise<boolean> {
		const [result] = await this.db
			.select({ count: count() })
			.from(transactionCategories)
			.innerJoin(
				transactions,
				eq(transactionCategories.transactionId, transactions.id),
			)
			.where(
				sql`${transactionCategories.categoryId} = ${categoryId} and ${transactions.deletedAt} is null`,
			);

		return (result?.count ?? 0) > 0;
	}

	private async selectJoinedTransactions(
		whereClause: ReturnType<typeof sql>,
		tx?: NodePgDatabase,
	): Promise<TransactionRecord[]> {
		const db = tx ?? this.db;

		const rows: JoinedTransactionRow[] = await db
			.select({
				transaction: transactions,
				transactionType: transactionTypes,
				currency: currencies,
				transactionCategory: transactionCategories,
			})
			.from(transactions)
			.innerJoin(transactionTypes, eq(transactions.typeId, transactionTypes.id))
			.innerJoin(currencies, eq(transactions.currencyId, currencies.id))
			.leftJoin(
				transactionCategories,
				eq(transactionCategories.transactionId, transactions.id),
			)
			.where(whereClause)
			.orderBy(desc(transactions.id));

		const byId = rows.reduce((map, row) => {
			if (!map.has(row.transaction.id)) {
				map.set(row.transaction.id, row);
			}
			return map;
		}, new Map<number, JoinedTransactionRow>());

		return Array.from(byId.values()).map((row) => {
			const categoryId = row.transactionCategory?.categoryId;

			if (categoryId === undefined) {
				throw new Error(`Transaction ${row.transaction.id} has no category`);
			}

			return {
				id: row.transaction.id,
				userId: row.transaction.userId,
				type: toTransactionType(row.transactionType.code),
				title: row.transaction.title,
				amount: row.transaction.amount,
				currency: row.currency.code,
				date: toDateString(row.transaction.date),
				categoryId,
				memo: row.transaction.memo ?? "",
				createdAt: row.transaction.createdAt,
				updatedAt: row.transaction.updatedAt,
			};
		});
	}
}
