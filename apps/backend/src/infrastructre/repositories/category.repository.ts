// Infrastructure Layer: Category Repository Implementation
// Drizzle ORMを使用したデータアクセス層

import {
	and,
	asc,
	categories,
	count,
	desc,
	eq,
	type NodePgDatabase,
	sql,
	transactionTypes,
	userCategories,
} from "@account-book-app/db";
import { inject, injectable } from "inversify";
import type {
	CategoryRecord,
	CreateCategoryData,
	UserCategoryRecord,
} from "../../domain/entities/category.entity";
import type {
	FindAllOptions,
	ICategoryRepository,
	PaginatedResult,
	UpdateCategoryData,
} from "../../domain/repositories/category.repository.interface";
import { TOKENS } from "../../services/di/tokens";

// displayOrderが未設定の場合のデフォルト値
const DEFAULT_DISPLAY_ORDER = 0;

const buildInNumberList = (
	column: typeof categories.id,
	values: number[],
): ReturnType<typeof sql> =>
	sql`${column} in (${sql.join(
		values.map((v) => sql`${v}`),
		sql`, `,
	)})`;

@injectable()
export class CategoryRepository implements ICategoryRepository {
	@inject(TOKENS.Db)
	private db!: NodePgDatabase;

	async create(
		data: CreateCategoryData,
		userId: number,
	): Promise<CategoryRecord> {
		// トランザクション内で処理
		return await this.db.transaction(async (tx) => {
			// 1. transaction_typesからtypeIdを検証し、type code を取得
			const [transactionType] = await tx
				.select()
				.from(transactionTypes)
				.where(eq(transactionTypes.id, data.typeId))
				.limit(1);

			if (!transactionType) {
				throw new Error(`Transaction type ${data.typeId} not found`);
			}

			// 2. カテゴリを作成
			const [category] = await tx
				.insert(categories)
				.values({
					name: data.name,
					typeId: data.typeId,
					isDefault: false,
				})
				.returning();

			// 3. user_categoriesに自動登録
			await tx.insert(userCategories).values({
				userId,
				categoryId: category.id,
				isVisible: true,
				customName: null,
				displayOrder: 0,
			});

			// 4. ドメインエンティティに変換して返す
			return this.toDomainEntity(category, transactionType.code);
		});
	}

	async findById(id: number): Promise<CategoryRecord | null> {
		const result = await this.db
			.select({
				category: categories,
				transactionType: transactionTypes,
			})
			.from(categories)
			.innerJoin(transactionTypes, eq(categories.typeId, transactionTypes.id))
			.where(eq(categories.id, id))
			.limit(1);

		if (result.length === 0) {
			return null;
		}

		const { category, transactionType } = result[0];
		return this.toDomainEntity(category, transactionType.code);
	}

	async findByName(name: string): Promise<CategoryRecord | null> {
		const result = await this.db
			.select({
				category: categories,
				transactionType: transactionTypes,
			})
			.from(categories)
			.innerJoin(transactionTypes, eq(categories.typeId, transactionTypes.id))
			.where(eq(categories.name, name))
			.limit(1);

		if (result.length === 0) {
			return null;
		}

		const { category, transactionType } = result[0];
		return this.toDomainEntity(category, transactionType.code);
	}

	async findByUserId(userId: number): Promise<CategoryRecord[]> {
		const result = await this.db
			.select({
				category: categories,
				transactionType: transactionTypes,
			})
			.from(userCategories)
			.innerJoin(categories, eq(userCategories.categoryId, categories.id))
			.innerJoin(transactionTypes, eq(categories.typeId, transactionTypes.id))
			.where(eq(userCategories.userId, userId));

		return result.map(({ category, transactionType }) =>
			this.toDomainEntity(category, transactionType.code),
		);
	}

	async findByIds(userId: number, ids: number[]): Promise<CategoryRecord[]> {
		if (ids.length === 0) {
			return [];
		}

		// NOTE:
		// - デフォルトカテゴリ（isDefault=true）は user_categories に紐づきが無くても利用可能
		// - カスタムカテゴリは user_categories（未削除）に紐づいているもののみ利用可能
		const result = await this.db
			.select({
				category: categories,
				transactionType: transactionTypes,
			})
			.from(categories)
			.innerJoin(transactionTypes, eq(categories.typeId, transactionTypes.id))
			.leftJoin(
				userCategories,
				and(
					eq(userCategories.categoryId, categories.id),
					eq(userCategories.userId, userId),
					sql`${userCategories.deletedAt} is null`,
				),
			)
			.where(
				and(
					buildInNumberList(categories.id, ids),
					sql`(${categories.isDefault} = true or ${userCategories.id} is not null)`,
				),
			);

		return result.map(({ category, transactionType }) =>
			this.toDomainEntity(category, transactionType.code),
		);
	}

	async findAllWithPagination(
		options: FindAllOptions,
	): Promise<PaginatedResult<UserCategoryRecord>> {
		const {
			userId,
			page,
			perPage,
			sortBy = "displayOrder",
			sortOrder = "asc",
			type,
			includeHidden = false,
		} = options;

		// フィルタ条件の構築
		const conditions = [eq(userCategories.userId, userId)];

		if (type) {
			conditions.push(eq(transactionTypes.code, type));
		}

		if (!includeHidden) {
			conditions.push(eq(userCategories.isVisible, true));
		}

		const whereClause = and(...conditions);

		// ソート順の決定
		const sortColumn = {
			name: categories.name,
			createdAt: categories.createdAt,
			displayOrder: userCategories.displayOrder,
		}[sortBy];

		const orderClause =
			sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

		// 総数取得
		const [totalResult] = await this.db
			.select({ count: count() })
			.from(userCategories)
			.innerJoin(categories, eq(userCategories.categoryId, categories.id))
			.innerJoin(transactionTypes, eq(categories.typeId, transactionTypes.id))
			.where(whereClause);

		const total = totalResult?.count ?? 0;
		const totalPages = Math.ceil(total / perPage);

		// データ取得
		const offset = (page - 1) * perPage;
		const results = await this.db
			.select({
				category: categories,
				transactionType: transactionTypes,
				userCategory: userCategories,
			})
			.from(userCategories)
			.innerJoin(categories, eq(userCategories.categoryId, categories.id))
			.innerJoin(transactionTypes, eq(categories.typeId, transactionTypes.id))
			.where(whereClause)
			.orderBy(orderClause)
			.limit(perPage)
			.offset(offset);

		const items = results.map(({ category, transactionType, userCategory }) =>
			this.toUserCategoryEntity(category, transactionType.code, userCategory),
		);

		return {
			items,
			total,
			page,
			perPage,
			totalPages,
		};
	}

	async findByIdWithUser(
		id: number,
		userId: number,
	): Promise<UserCategoryRecord | null> {
		const results = await this.db
			.select({
				category: categories,
				transactionType: transactionTypes,
				userCategory: userCategories,
			})
			.from(userCategories)
			.innerJoin(categories, eq(userCategories.categoryId, categories.id))
			.innerJoin(transactionTypes, eq(categories.typeId, transactionTypes.id))
			.where(and(eq(categories.id, id), eq(userCategories.userId, userId)))
			.limit(1);

		if (results.length === 0) {
			return null;
		}

		const { category, transactionType, userCategory } = results[0];
		return this.toUserCategoryEntity(
			category,
			transactionType.code,
			userCategory,
		);
	}

	async update(
		categoryId: number,
		userId: number,
		data: UpdateCategoryData,
	): Promise<UserCategoryRecord> {
		// 更新対象のフィールドを構築（undefinedのフィールドは更新しない）
		const updateFields: Record<string, unknown> = {};

		if (data.isVisible !== undefined) {
			updateFields.isVisible = data.isVisible;
		}
		if (data.customName !== undefined) {
			updateFields.customName = data.customName;
		}
		if (data.displayOrder !== undefined) {
			updateFields.displayOrder = data.displayOrder;
		}

		// updatedAtは常に更新
		updateFields.updatedAt = sql`now()`;

		// user_categoriesテーブルを更新
		const [updatedUserCategory] = await this.db
			.update(userCategories)
			.set(updateFields)
			.where(
				and(
					eq(userCategories.categoryId, categoryId),
					eq(userCategories.userId, userId),
				),
			)
			.returning();

		if (!updatedUserCategory) {
			throw new Error(
				`UserCategory not found for categoryId: ${categoryId}, userId: ${userId}`,
			);
		}

		// 更新後のカテゴリ情報を取得
		const result = await this.findByIdWithUser(categoryId, userId);

		if (!result) {
			throw new Error(
				`Category not found after update: categoryId: ${categoryId}`,
			);
		}

		return result;
	}

	private toDomainEntity(
		dbCategory: typeof categories.$inferSelect,
		typeCode: string,
	): CategoryRecord {
		return {
			id: dbCategory.id,
			name: dbCategory.name,
			type: typeCode as "INCOME" | "EXPENSE",
			isDefault: dbCategory.isDefault,
			createdAt: dbCategory.createdAt,
			updatedAt: dbCategory.updatedAt,
		};
	}

	private toUserCategoryEntity(
		dbCategory: typeof categories.$inferSelect,
		typeCode: string,
		dbUserCategory: typeof userCategories.$inferSelect,
	): UserCategoryRecord {
		return {
			id: dbCategory.id,
			name: dbCategory.name,
			type: typeCode as "INCOME" | "EXPENSE",
			isDefault: dbCategory.isDefault,
			createdAt: dbCategory.createdAt,
			updatedAt: dbCategory.updatedAt,
			isVisible: dbUserCategory.isVisible,
			customName: dbUserCategory.customName,
			displayOrder: dbUserCategory.displayOrder ?? DEFAULT_DISPLAY_ORDER,
		};
	}
}
