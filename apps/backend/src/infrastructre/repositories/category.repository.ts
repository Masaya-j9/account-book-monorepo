// Infrastructure Layer: Category Repository Implementation
// Drizzle ORMを使用したデータアクセス層

import {
  categories,
  eq,
  type NodePgDatabase,
  transactionTypes,
  userCategories,
} from '@account-book-app/db';
import { inject, injectable } from 'inversify';
import type {
  CategoryRecord,
  CreateCategoryData,
} from '../../domain/entities/category.entity';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import { TOKENS } from '../di/tokens';

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

  private toDomainEntity(
    dbCategory: typeof categories.$inferSelect,
    typeCode: string,
  ): CategoryRecord {
    return {
      id: dbCategory.id,
      name: dbCategory.name,
      type: typeCode as 'INCOME' | 'EXPENSE',
      isDefault: dbCategory.isDefault,
      createdAt: dbCategory.createdAt,
      updatedAt: dbCategory.updatedAt,
    };
  }
}
