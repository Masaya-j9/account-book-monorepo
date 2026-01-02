// Application Layer: List Transactions Builder
// 取引一覧取得ユースケースの出力DTO組み立てを担当する

import type { CategoryRecord } from '../../domain/entities/category.entity';
import type { ListTransactionsResult } from '../../domain/repositories/transaction.repository.interface';

export type ListTransactionsInput = {
  userId: number;
  startDate?: string;
  endDate?: string;
  type?: 'INCOME' | 'EXPENSE';
  categoryIds?: number[];
  order: 'asc' | 'desc';
  page: number;
  limit: number;
};

type OutputTransaction = {
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

export type ListTransactionsOutput = {
  transactions: OutputTransaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

const toIsoString = (value: Date): string => value.toISOString();

const calcTotalPages = (total: number, limit: number): number =>
  total === 0 ? 0 : Math.ceil(total / limit);

export class ListTransactionsBuilder {
  build(params: {
    input: ListTransactionsInput;
    result: ListTransactionsResult;
    categoriesById: Map<number, CategoryRecord>;
  }): ListTransactionsOutput {
    const { input, result, categoriesById } = params;
    const totalPages = calcTotalPages(result.total, input.limit);

    return {
      transactions: result.items.map((item) => ({
        id: item.id,
        userId: item.userId,
        type: item.type,
        title: item.title,
        amount: item.amount,
        currencyCode: item.currencyCode,
        date: item.date,
        categories: item.categoryIds
          .map((id) => categoriesById.get(id))
          .filter((v): v is CategoryRecord => v !== undefined)
          .map((category) => ({
            id: category.id,
            name: category.name,
            type: category.type,
            isDefault: category.isDefault,
          })),
        memo: item.memo,
        createdAt: toIsoString(item.createdAt),
        updatedAt: toIsoString(item.updatedAt),
      })),
      pagination: {
        total: result.total,
        page: input.page,
        limit: input.limit,
        totalPages,
        hasNext: input.page < totalPages,
        hasPrev: input.page > 1,
      },
    };
  }
}
