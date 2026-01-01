import { describe, expect, it } from 'vitest';

import { Money } from '../values/money';
import { TransactionDate } from '../values/transaction-date';
import { Transaction, TransactionDomainError } from './transaction.entity';

describe('Transaction（取引）', () => {
  describe('正常系', () => {
    it('create: 新規取引を生成できる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);

      const transaction = Transaction.create(
        1,
        100,
        'EXPENSE',
        'ランチ',
        amount,
        date,
        10,
        'カフェでランチ',
      );

      expect(transaction.id).toBe(1);
      expect(transaction.userId).toBe(100);
      expect(transaction.type).toBe('EXPENSE');
      expect(transaction.title).toBe('ランチ');
      expect(transaction.amount.amount).toBe(1000);
      expect(transaction.date.format()).toBe('2025-01-15');
      expect(transaction.categoryId).toBe(10);
      expect(transaction.memo).toBe('カフェでランチ');
      expect(transaction.createdAt).toBeInstanceOf(Date);
      expect(transaction.updatedAt).toBeInstanceOf(Date);
    });

    it('create: 収入取引を生成できる', () => {
      const amount = Money.of(300000);
      const date = TransactionDate.of(2025, 1, 25);

      const transaction = Transaction.create(
        1,
        100,
        'INCOME',
        '給与',
        amount,
        date,
        20,
        '1月分給与',
      );

      expect(transaction.type).toBe('INCOME');
      expect(transaction.isIncome()).toBe(true);
      expect(transaction.isExpense()).toBe(false);
    });

    it('reconstruct: 既存取引を再構築できる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const createdAt = new Date('2025-01-15T10:00:00Z');
      const updatedAt = new Date('2025-01-15T10:00:00Z');

      const transaction = Transaction.reconstruct(
        1,
        100,
        'EXPENSE',
        'ランチ',
        amount,
        date,
        10,
        'カフェでランチ',
        createdAt,
        updatedAt,
      );

      expect(transaction.id).toBe(1);
      expect(transaction.createdAt).toBe(createdAt);
      expect(transaction.updatedAt).toBe(updatedAt);
    });

    it('updateTitle: タイトルを更新できる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const transaction = Transaction.create(
        1,
        100,
        'EXPENSE',
        'ランチ',
        amount,
        date,
        10,
        '',
      );

      const oldUpdatedAt = transaction.updatedAt;

      // 少し時間を置く
      const now = new Date();
      now.setMilliseconds(now.getMilliseconds() + 10);

      transaction.updateTitle('ディナー');

      expect(transaction.title).toBe('ディナー');
      expect(transaction.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldUpdatedAt.getTime(),
      );
    });

    it('updateAmount: 金額を更新できる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const transaction = Transaction.create(
        1,
        100,
        'EXPENSE',
        'ランチ',
        amount,
        date,
        10,
        '',
      );

      const newAmount = Money.of(2000);
      transaction.updateAmount(newAmount);

      expect(transaction.amount.amount).toBe(2000);
    });

    it('updateDate: 日付を更新できる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const transaction = Transaction.create(
        1,
        100,
        'EXPENSE',
        'ランチ',
        amount,
        date,
        10,
        '',
      );

      const newDate = TransactionDate.of(2025, 1, 16);
      transaction.updateDate(newDate);

      expect(transaction.date.format()).toBe('2025-01-16');
    });

    it('updateCategory: カテゴリを更新できる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const transaction = Transaction.create(
        1,
        100,
        'EXPENSE',
        'ランチ',
        amount,
        date,
        10,
        '',
      );

      transaction.updateCategory(20);

      expect(transaction.categoryId).toBe(20);
    });

    it('updateMemo: メモを更新できる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const transaction = Transaction.create(
        1,
        100,
        'EXPENSE',
        'ランチ',
        amount,
        date,
        10,
        '',
      );

      transaction.updateMemo('新しいメモ');

      expect(transaction.memo).toBe('新しいメモ');
    });

    it('isInMonth: 指定された月の取引かどうかを判定できる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const transaction = Transaction.create(
        1,
        100,
        'EXPENSE',
        'ランチ',
        amount,
        date,
        10,
        '',
      );

      const sameMonth = TransactionDate.of(2025, 1, 20);
      const differentMonth = TransactionDate.of(2025, 2, 15);

      expect(transaction.isInMonth(sameMonth)).toBe(true);
      expect(transaction.isInMonth(differentMonth)).toBe(false);
    });

    it('isInYear: 指定された年の取引かどうかを判定できる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const transaction = Transaction.create(
        1,
        100,
        'EXPENSE',
        'ランチ',
        amount,
        date,
        10,
        '',
      );

      const sameYear = TransactionDate.of(2025, 12, 31);
      const differentYear = TransactionDate.of(2026, 1, 1);

      expect(transaction.isInYear(sameYear)).toBe(true);
      expect(transaction.isInYear(differentYear)).toBe(false);
    });
  });

  describe('異常系', () => {
    it('create: タイトルが空の場合は例外になる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);

      expect(() =>
        Transaction.create(1, 100, 'EXPENSE', '', amount, date, 10, ''),
      ).toThrow(TransactionDomainError);
      expect(() =>
        Transaction.create(1, 100, 'EXPENSE', '   ', amount, date, 10, ''),
      ).toThrow('タイトルは必須です');
    });

    it('create: タイトルが100文字を超える場合は例外になる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const longTitle = 'あ'.repeat(101);

      expect(() =>
        Transaction.create(1, 100, 'EXPENSE', longTitle, amount, date, 10, ''),
      ).toThrow(TransactionDomainError);
      expect(() =>
        Transaction.create(1, 100, 'EXPENSE', longTitle, amount, date, 10, ''),
      ).toThrow('タイトルは100文字以内である必要があります');
    });

    it('create: 金額が0の場合は例外になる', () => {
      const amount = Money.of(0);
      const date = TransactionDate.of(2025, 1, 15);

      expect(() =>
        Transaction.create(1, 100, 'EXPENSE', 'ランチ', amount, date, 10, ''),
      ).toThrow(TransactionDomainError);
      expect(() =>
        Transaction.create(1, 100, 'EXPENSE', 'ランチ', amount, date, 10, ''),
      ).toThrow('金額は0より大きい必要があります');
    });

    it('create: メモが500文字を超える場合は例外になる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const longMemo = 'あ'.repeat(501);

      expect(() =>
        Transaction.create(
          1,
          100,
          'EXPENSE',
          'ランチ',
          amount,
          date,
          10,
          longMemo,
        ),
      ).toThrow(TransactionDomainError);
      expect(() =>
        Transaction.create(
          1,
          100,
          'EXPENSE',
          'ランチ',
          amount,
          date,
          10,
          longMemo,
        ),
      ).toThrow('メモは500文字以内である必要があります');
    });

    it('updateTitle: 空のタイトルは例外になる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const transaction = Transaction.create(
        1,
        100,
        'EXPENSE',
        'ランチ',
        amount,
        date,
        10,
        '',
      );

      expect(() => transaction.updateTitle('')).toThrow(TransactionDomainError);
      expect(() => transaction.updateTitle('   ')).toThrow(
        'タイトルは必須です',
      );
    });

    it('updateAmount: 0の金額は例外になる', () => {
      const amount = Money.of(1000);
      const date = TransactionDate.of(2025, 1, 15);
      const transaction = Transaction.create(
        1,
        100,
        'EXPENSE',
        'ランチ',
        amount,
        date,
        10,
        '',
      );

      const zeroAmount = Money.of(0);
      expect(() => transaction.updateAmount(zeroAmount)).toThrow(
        TransactionDomainError,
      );
      expect(() => transaction.updateAmount(zeroAmount)).toThrow(
        '金額は0より大きい必要があります',
      );
    });
  });
});
