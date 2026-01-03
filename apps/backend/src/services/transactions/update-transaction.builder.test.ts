import { describe, expect, it } from 'vitest';

import type { CategoryRecord } from '../../domain/entities/category.entity';
import type { TransactionRecord } from '../../domain/entities/transaction.entity';
import { UpdateTransactionBuilder } from './update-transaction.builder';

describe('UpdateTransactionBuilder（取引更新DTO組み立て）', () => {
  const fixedCreatedAt = new Date('2026-01-01T00:00:00.000Z');
  const fixedUpdatedAt = new Date('2026-01-02T00:00:00.000Z');

  const makeTransactionRecord = (
    override?: Partial<TransactionRecord>,
  ): TransactionRecord => ({
    id: 1,
    userId: 100,
    type: 'EXPENSE',
    title: 'ランチ',
    amount: 1000,
    currency: 'JPY',
    date: '2026-01-01',
    categoryId: 10,
    memo: 'メモ',
    createdAt: fixedCreatedAt,
    updatedAt: fixedUpdatedAt,
    ...override,
  });

  const makeCategoryRecord = (
    override?: Partial<CategoryRecord>,
  ): CategoryRecord => ({
    id: 10,
    name: '食費',
    type: 'EXPENSE',
    isDefault: false,
    createdAt: fixedCreatedAt,
    updatedAt: fixedUpdatedAt,
    ...override,
  });

  it('カテゴリ順序を保ち、ISO文字列へ変換できる', () => {
    const builder = new UpdateTransactionBuilder();

    const record = makeTransactionRecord({
      memo: '内容',
    });

    const categories = [
      makeCategoryRecord({ id: 10, name: '食費' }),
      makeCategoryRecord({ id: 11, name: '日用品' }),
    ];

    const output = builder.build({
      record,
      categoryIds: [11, 10],
      categories,
    });

    expect(output).toEqual({
      transaction: {
        id: 1,
        userId: 100,
        type: 'EXPENSE',
        title: 'ランチ',
        amount: 1000,
        currencyCode: 'JPY',
        date: '2026-01-01',
        categories: [
          { id: 11, name: '日用品', type: 'EXPENSE', isDefault: false },
          { id: 10, name: '食費', type: 'EXPENSE', isDefault: false },
        ],
        memo: '内容',
        createdAt: fixedCreatedAt.toISOString(),
        updatedAt: fixedUpdatedAt.toISOString(),
      },
    });
  });

  it('memo が空文字の場合は null に変換できる', () => {
    const builder = new UpdateTransactionBuilder();

    const output = builder.build({
      record: makeTransactionRecord({ memo: '' }),
      categoryIds: [10],
      categories: [makeCategoryRecord({ id: 10 })],
    });

    expect(output.transaction.memo).toBeNull();
  });
});
