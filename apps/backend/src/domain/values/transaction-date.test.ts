import { describe, expect, it } from 'vitest';

import {
  TransactionDate,
  TransactionDateValidationError,
} from './transaction-date';

describe('TransactionDate（取引日付）', () => {
  describe('正常系', () => {
    it('of: 年月日からインスタンスを作成できる', () => {
      const date = TransactionDate.of(2025, 1, 15);
      expect(date.year).toBe(2025);
      expect(date.month).toBe(1);
      expect(date.day).toBe(15);
    });

    it('fromDate: Dateオブジェクトから作成できる', () => {
      const jsDate = new Date(2025, 0, 15); // 月は0始まり
      const date = TransactionDate.fromDate(jsDate);

      expect(date.year).toBe(2025);
      expect(date.month).toBe(1);
      expect(date.day).toBe(15);
    });

    it('fromString: ISO8601形式の文字列から作成できる', () => {
      const date = TransactionDate.fromString('2025-01-15');

      expect(date.year).toBe(2025);
      expect(date.month).toBe(1);
      expect(date.day).toBe(15);
    });

    it('today: 今日の日付を取得できる', () => {
      const today = TransactionDate.today();
      const now = new Date();

      expect(today.year).toBe(now.getFullYear());
      expect(today.month).toBe(now.getMonth() + 1);
      expect(today.day).toBe(now.getDate());
    });

    it('toDate: Dateオブジェクトに変換できる', () => {
      const date = TransactionDate.of(2025, 1, 15);
      const jsDate = date.toDate();

      expect(jsDate.getFullYear()).toBe(2025);
      expect(jsDate.getMonth()).toBe(0); // 月は0始まり
      expect(jsDate.getDate()).toBe(15);
    });

    it('format: ISO8601形式の文字列に変換できる', () => {
      const date = TransactionDate.of(2025, 1, 15);
      expect(date.format()).toBe('2025-01-15');
    });

    it('formatJapanese: 日本語形式の文字列に変換できる', () => {
      const date = TransactionDate.of(2025, 1, 15);
      expect(date.formatJapanese()).toBe('2025年1月15日');
    });

    it('equals: 同じ日付の場合はtrueを返す', () => {
      const a = TransactionDate.of(2025, 1, 15);
      const b = TransactionDate.of(2025, 1, 15);
      const c = TransactionDate.of(2025, 1, 16);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it('isSameMonth: 同じ月かどうかを判定できる', () => {
      const a = TransactionDate.of(2025, 1, 15);
      const b = TransactionDate.of(2025, 1, 20);
      const c = TransactionDate.of(2025, 2, 15);

      expect(a.isSameMonth(b)).toBe(true);
      expect(a.isSameMonth(c)).toBe(false);
    });

    it('isSameYear: 同じ年かどうかを判定できる', () => {
      const a = TransactionDate.of(2025, 1, 15);
      const b = TransactionDate.of(2025, 12, 31);
      const c = TransactionDate.of(2026, 1, 1);

      expect(a.isSameYear(b)).toBe(true);
      expect(a.isSameYear(c)).toBe(false);
    });

    it('isAfter/isBefore: 日付を比較できる', () => {
      const a = TransactionDate.of(2025, 1, 15);
      const b = TransactionDate.of(2025, 1, 16);

      expect(b.isAfter(a)).toBe(true);
      expect(a.isBefore(b)).toBe(true);
      expect(a.isAfter(a)).toBe(false);
    });

    it('isPast: 過去日かどうかを判定できる', () => {
      const past = TransactionDate.of(2020, 1, 1);
      expect(past.isPast()).toBe(true);
    });
  });

  describe('異常系', () => {
    it('of: 無効な年は例外になる', () => {
      expect(() => TransactionDate.of(1899, 1, 1)).toThrow(
        TransactionDateValidationError,
      );
      expect(() => TransactionDate.of(2101, 1, 1)).toThrow(
        TransactionDateValidationError,
      );
    });

    it('of: 無効な月は例外になる', () => {
      expect(() => TransactionDate.of(2025, 0, 1)).toThrow(
        TransactionDateValidationError,
      );
      expect(() => TransactionDate.of(2025, 13, 1)).toThrow(
        TransactionDateValidationError,
      );
    });

    it('of: 無効な日は例外になる', () => {
      expect(() => TransactionDate.of(2025, 1, 0)).toThrow(
        TransactionDateValidationError,
      );
      expect(() => TransactionDate.of(2025, 1, 32)).toThrow(
        TransactionDateValidationError,
      );
    });

    it('of: 存在しない日付は例外になる', () => {
      // 2月30日
      expect(() => TransactionDate.of(2025, 2, 30)).toThrow(
        TransactionDateValidationError,
      );
      // 4月31日
      expect(() => TransactionDate.of(2025, 4, 31)).toThrow(
        TransactionDateValidationError,
      );
    });

    it('fromString: 不正な形式の文字列は例外になる', () => {
      expect(() => TransactionDate.fromString('2025/01/15')).toThrow(
        TransactionDateValidationError,
      );
      expect(() => TransactionDate.fromString('20250115')).toThrow(
        TransactionDateValidationError,
      );
      expect(() => TransactionDate.fromString('invalid')).toThrow(
        TransactionDateValidationError,
      );
    });
  });
});
