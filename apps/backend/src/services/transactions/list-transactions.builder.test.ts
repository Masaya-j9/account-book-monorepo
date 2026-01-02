import { describe, expect, it } from 'vitest';

import type { CategoryRecord } from '../../domain/entities/category.entity';
import type { TransactionListItemRecord } from '../../domain/entities/transaction.entity';
import type { ListTransactionsResult } from '../../domain/repositories/transaction.repository.interface';
import { ListTransactionsBuilder } from './list-transactions.builder';

describe('ListTransactionsBuilder（取引一覧DTO組み立て）', () => {
  const fixedCreatedAt = new Date('2026-01-01T23:49:39.821Z');
  const fixedUpdatedAt = new Date('2026-01-01T23:51:50.971Z');

  const makeItem = (
    override?: Partial<TransactionListItemRecord>,
  ): TransactionListItemRecord => ({
    id: 1,
    userId: 1,
    type: 'EXPENSE',
    title: 'ランチ',
    amount: 1000,
    currencyCode: 'JPY',
    date: '2025-01-01',
    categoryIds: [10],
    memo: null,
    createdAt: fixedCreatedAt,
    updatedAt: fixedUpdatedAt,
    ...override,
  });

  const makeCategory = (override?: Partial<CategoryRecord>): CategoryRecord => {
    const createdAt = override?.createdAt ?? fixedCreatedAt;
    const updatedAt = override?.updatedAt ?? fixedUpdatedAt;
    const {
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...rest
    } = override ?? {};

    return {
      id: 10,
      name: '食費',
      type: 'EXPENSE',
      isDefault: false,
      createdAt,
      updatedAt,
      ...rest,
    };
  };

  const makeResult = (
    items: TransactionListItemRecord[],
    total: number,
  ): ListTransactionsResult => ({
    items,
    total,
  });

  describe('正常系', () => {
    it('カテゴリIDからカテゴリ詳細を組み立て、createdAt/updatedAtをISO文字列に変換できる', () => {
      const builder = new ListTransactionsBuilder();
      const categoriesById = new Map<number, CategoryRecord>([
        [10, makeCategory({ id: 10, name: '食費' })],
      ]);

      const output = builder.build({
        input: {
          userId: 1,
          order: 'desc',
          page: 1,
          limit: 20,
        },
        result: makeResult([makeItem({ categoryIds: [10] })], 1),
        categoriesById,
      });

      expect(output.transactions[0]?.categories).toEqual([
        { id: 10, name: '食費', type: 'EXPENSE', isDefault: false },
      ]);
      expect(output.transactions[0]?.createdAt).toBe(
        fixedCreatedAt.toISOString(),
      );
      expect(output.transactions[0]?.updatedAt).toBe(
        fixedUpdatedAt.toISOString(),
      );
    });

    it('ページ情報（totalPages/hasNext/hasPrev）を計算できる', () => {
      const builder = new ListTransactionsBuilder();

      const output = builder.build({
        input: {
          userId: 1,
          order: 'desc',
          page: 2,
          limit: 20,
        },
        result: makeResult([makeItem({ id: 1 })], 41),
        categoriesById: new Map(),
      });

      expect(output.pagination.total).toBe(41);
      expect(output.pagination.totalPages).toBe(3);
      expect(output.pagination.hasNext).toBe(true);
      expect(output.pagination.hasPrev).toBe(true);
    });

    it('total=0 の場合は totalPages=0 になる', () => {
      const builder = new ListTransactionsBuilder();

      const output = builder.build({
        input: {
          userId: 1,
          order: 'desc',
          page: 1,
          limit: 20,
        },
        result: makeResult([], 0),
        categoriesById: new Map(),
      });

      expect(output.pagination.totalPages).toBe(0);
      expect(output.pagination.hasNext).toBe(false);
      expect(output.pagination.hasPrev).toBe(false);
    });
  });

  describe('異常系', () => {
    it('カテゴリ詳細が取得できないIDは出力から除外される', () => {
      const builder = new ListTransactionsBuilder();

      const output = builder.build({
        input: {
          userId: 1,
          order: 'desc',
          page: 1,
          limit: 20,
        },
        result: makeResult([makeItem({ categoryIds: [999] })], 1),
        categoriesById: new Map(),
      });

      expect(output.transactions[0]?.categories).toEqual([]);
    });
  });
});
