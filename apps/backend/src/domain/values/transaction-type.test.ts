import { describe, expect, it } from 'vitest';

import {
  TransactionType,
  TransactionTypeValidationError,
} from './transaction-type';

describe('TransactionType（取引タイプ）', () => {
  describe('正常系', () => {
    it('income/expense: 正しいフラグでインスタンスを作成できる', () => {
      const income = TransactionType.income();
      const expense = TransactionType.expense();

      expect(income.value).toBe('INCOME');
      expect(income.isIncome()).toBe(true);
      expect(income.isExpense()).toBe(false);

      expect(expense.value).toBe('EXPENSE');
      expect(expense.isIncome()).toBe(false);
      expect(expense.isExpense()).toBe(true);
    });

    it('fromString: INCOME/EXPENSE のみ受け付ける', () => {
      expect(TransactionType.fromString('INCOME').value).toBe('INCOME');
      expect(TransactionType.fromString('EXPENSE').value).toBe('EXPENSE');
    });

    it('equals/toString: 値として比較できる', () => {
      const a = TransactionType.income();
      const b = TransactionType.fromString('INCOME');
      const c = TransactionType.expense();

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
      expect(c.toString()).toBe('EXPENSE');
    });
  });

  describe('異常系', () => {
    it('fromString: 不正な値は例外になる', () => {
      expect(() => TransactionType.fromString('income')).toThrow(
        TransactionTypeValidationError,
      );
      expect(() => TransactionType.fromString('')).toThrow(
        TransactionTypeValidationError,
      );
    });
  });
});
