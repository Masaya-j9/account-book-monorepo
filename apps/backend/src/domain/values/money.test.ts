import { describe, expect, it } from 'vitest';

import { Money, MoneyValidationError } from './money';

describe('Money（金額）', () => {
  describe('正常系', () => {
    it('of: 整数の金額でインスタンスを作成できる', () => {
      const money = Money.of(1000);
      expect(money.amount).toBe(1000);
      expect(money.currency).toBe('JPY');
    });

    it('ofWithCurrency: 通貨を指定して作成できる', () => {
      const money = Money.ofWithCurrency(100, 'USD');
      expect(money.amount).toBe(100);
      expect(money.currency).toBe('USD');
    });

    it('add: 同じ通貨同士で加算できる', () => {
      const a = Money.of(1000);
      const b = Money.of(500);
      const result = a.add(b);

      expect(result.amount).toBe(1500);
      expect(result.currency).toBe('JPY');
    });

    it('subtract: 同じ通貨同士で減算できる', () => {
      const a = Money.of(1000);
      const b = Money.of(500);
      const result = a.subtract(b);

      expect(result.amount).toBe(500);
      expect(result.currency).toBe('JPY');
    });

    it('multiply: 整数で乗算できる', () => {
      const money = Money.of(100);
      const result = money.multiply(3);

      expect(result.amount).toBe(300);
    });

    it('divide: 整数で除算できる（整数除算）', () => {
      const money = Money.of(1000);
      const result = money.divide(3);

      // 整数除算なので小数点以下は切り捨て
      expect(result.amount).toBe(333);
    });

    it('equals: 同じ金額と通貨の場合はtrueを返す', () => {
      const a = Money.of(1000);
      const b = Money.of(1000);
      const c = Money.of(500);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it('greaterThan/lessThan: 金額を比較できる', () => {
      const a = Money.of(1000);
      const b = Money.of(500);

      expect(a.greaterThan(b)).toBe(true);
      expect(b.lessThan(a)).toBe(true);
      expect(a.greaterThan(a)).toBe(false);
    });

    it('isZero: 金額が0かどうかを判定できる', () => {
      const zero = Money.of(0);
      const nonZero = Money.of(100);

      expect(zero.isZero()).toBe(true);
      expect(nonZero.isZero()).toBe(false);
    });

    it('format: フォーマット済み文字列を取得できる', () => {
      const money = Money.of(123456);
      expect(money.format()).toBe('¥123,456');
    });
  });

  describe('異常系', () => {
    it('of: 負の金額は例外になる', () => {
      expect(() => Money.of(-100)).toThrow(MoneyValidationError);
      expect(() => Money.of(-100)).toThrow('金額は0以上である必要があります');
    });

    it('of: 小数の金額は例外になる', () => {
      expect(() => Money.of(100.5)).toThrow(MoneyValidationError);
      expect(() => Money.of(100.5)).toThrow('金額は整数である必要があります');
    });

    it('ofWithCurrency: 不正な通貨コードは例外になる', () => {
      expect(() => Money.ofWithCurrency(100, 'US')).toThrow(
        MoneyValidationError,
      );
      expect(() => Money.ofWithCurrency(100, '')).toThrow(MoneyValidationError);
    });

    it('add: 異なる通貨同士の加算は例外になる', () => {
      const jpy = Money.of(1000);
      const usd = Money.ofWithCurrency(100, 'USD');

      expect(() => jpy.add(usd)).toThrow(MoneyValidationError);
      expect(() => jpy.add(usd)).toThrow('通貨が異なります');
    });

    it('subtract: 結果が負になる減算は例外になる', () => {
      const a = Money.of(100);
      const b = Money.of(500);

      expect(() => a.subtract(b)).toThrow(MoneyValidationError);
      expect(() => a.subtract(b)).toThrow('減算結果が負の値になります');
    });

    it('multiply: 負の乗数は例外になる', () => {
      const money = Money.of(100);

      expect(() => money.multiply(-2)).toThrow(MoneyValidationError);
    });

    it('divide: 0以下の除数は例外になる', () => {
      const money = Money.of(1000);

      expect(() => money.divide(0)).toThrow(MoneyValidationError);
      expect(() => money.divide(-2)).toThrow(MoneyValidationError);
    });
  });
});
