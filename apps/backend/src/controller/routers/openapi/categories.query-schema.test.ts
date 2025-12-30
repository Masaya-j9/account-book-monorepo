import { categoriesListInputSchema } from '@account-book-app/shared';
import { describe, expect, it } from 'vitest';

describe('categoriesListInputSchema（OpenAPIのquery文字列変換）', () => {
  describe('正常系', () => {
    it('includeHidden=false（文字列）を boolean false に変換できる', () => {
      const query = {
        type: 'EXPENSE',
        includeHidden: 'false',
      } satisfies Record<string, string>;

      const parsed = categoriesListInputSchema.parse(query);

      expect(parsed.includeHidden).toBe(false);
    });

    it('includeHidden=true（文字列）を boolean true に変換できる', () => {
      const query = {
        type: 'EXPENSE',
        includeHidden: 'true',
      } satisfies Record<string, string>;

      const parsed = categoriesListInputSchema.parse(query);

      expect(parsed.includeHidden).toBe(true);
    });

    it('page/perPage（文字列）を number に変換できる', () => {
      const query = {
        type: 'EXPENSE',
        page: '2',
        perPage: '10',
      } satisfies Record<string, string>;

      const parsed = categoriesListInputSchema.parse(query);

      expect(parsed.page).toBe(2);
      expect(parsed.perPage).toBe(10);
    });

    it('クエリ未指定の場合、デフォルト値が適用される', () => {
      const query = {
        type: 'EXPENSE',
      } satisfies Record<string, string>;

      const parsed = categoriesListInputSchema.parse(query);

      expect(parsed.includeHidden).toBe(false);
      expect(parsed.page).toBe(1);
      expect(parsed.perPage).toBe(30);
    });
  });

  describe('異常系', () => {
    it('includeHidden が true/false 以外の場合は例外になる', () => {
      expect(() =>
        categoriesListInputSchema.parse({
          type: 'EXPENSE',
          includeHidden: 'foo',
        } satisfies Record<string, string>),
      ).toThrow();
    });

    it('page が数値に変換できない場合は例外になる', () => {
      expect(() =>
        categoriesListInputSchema.parse({
          type: 'EXPENSE',
          page: 'abc',
        } satisfies Record<string, string>),
      ).toThrow();
    });
  });
});
