// Application Layer: Update Transaction Builder
// 取引更新ユースケースの出力DTO組み立てを担当する

import type { CategoryRecord } from '../../domain/entities/category.entity';
import type { TransactionRecord } from '../../domain/entities/transaction.entity';

export type UpdateTransactionBuilderOutput = {
  transaction: {
    id: number;
    userId: number;
    type: 'INCOME' | 'EXPENSE';
    title: string;
    amount: number;
    currencyCode: string;
    date: string;
    categories: {
      id: number;
      name: string;
      type: 'INCOME' | 'EXPENSE';
      isDefault: boolean;
    }[];
    memo: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

const toIsoString = (value: Date): string => value.toISOString();

export class UpdateTransactionBuilder {
  build(params: {
    record: TransactionRecord;
    categoryIds: number[];
    categories: CategoryRecord[];
  }): UpdateTransactionBuilderOutput {
    const categoriesById = new Map(
      params.categories.map((c) => [c.id, c] as const),
    );

    return {
      transaction: {
        id: params.record.id,
        userId: params.record.userId,
        type: params.record.type,
        title: params.record.title,
        amount: params.record.amount,
        currencyCode: params.record.currency,
        date: params.record.date,
        categories: params.categoryIds
          .map((id) => categoriesById.get(id))
          .filter((v): v is CategoryRecord => v !== undefined)
          .map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            isDefault: c.isDefault,
          })),
        memo: params.record.memo.length === 0 ? null : params.record.memo,
        createdAt: toIsoString(params.record.createdAt),
        updatedAt: toIsoString(params.record.updatedAt),
      },
    };
  }
}
