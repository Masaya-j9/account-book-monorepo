import { transactionsListInputSchema } from '@account-book-app/shared';
import { describe, expect, it } from 'vitest';

const OVER_MAX_LIMIT = 101;
const BELOW_MIN_PAGE = 0;

describe('transactionsListInputSchema（OpenAPIのquery文字列変換）', () => {
  describe('正常系', () => {
    it('page/limit（文字列）を number に変換できる', () => {
      const query = {
        page: '2',
        limit: '10',
      } satisfies Record<string, string>;

      const parsed = transactionsListInputSchema.parse(query);

      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(10);
    });

    it('クエリ未指定の場合、デフォルト値が適用される', () => {
      const parsed = transactionsListInputSchema.parse({});

      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);
      expect(parsed.order).toBe('desc');
    });

    it('order を指定できる', () => {
      const parsed = transactionsListInputSchema.parse({ order: 'asc' });
      expect(parsed.order).toBe('asc');
    });

    it('startDate/endDate の指定が妥当な場合はパースできる', () => {
      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      } satisfies Record<string, string>;

      expect(() => transactionsListInputSchema.parse(query)).not.toThrow();
    });
  });

  describe('異常系', () => {
    it('page が最小未満の場合は例外になる', () => {
      expect(() =>
        transactionsListInputSchema.parse({
          page: String(BELOW_MIN_PAGE),
        } satisfies Record<string, string>),
      ).toThrow();
    });

    it('limit が最大超過の場合は例外になる', () => {
      expect(() =>
        transactionsListInputSchema.parse({
          limit: String(OVER_MAX_LIMIT),
        } satisfies Record<string, string>),
      ).toThrow();
    });

    it('日付形式が不正な場合は例外になる', () => {
      expect(() =>
        transactionsListInputSchema.parse({
          startDate: '2025/01/01',
        } satisfies Record<string, string>),
      ).toThrow();
    });

    it('startDate が endDate より後の場合は例外になる', () => {
      expect(() =>
        transactionsListInputSchema.parse({
          startDate: '2025-02-01',
          endDate: '2025-01-01',
        } satisfies Record<string, string>),
      ).toThrow();
    });

    it('order が不正な場合は例外になる', () => {
      expect(() =>
        transactionsListInputSchema.parse({
          order: 'invalid',
        } as const),
      ).toThrow();
    });
  });
});
