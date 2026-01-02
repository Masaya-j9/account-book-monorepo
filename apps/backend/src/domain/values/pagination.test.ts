import { describe, expect, it } from 'vitest';

import { Pagination, PaginationDomainError } from './pagination';

describe('Pagination（ページネーション）', () => {
  describe('正常系', () => {
    it('limit/offset から生成できる', () => {
      const pagination = Pagination.of({ limit: 20, offset: 0 });

      expect(pagination.limit).toBe(20);
      expect(pagination.offset).toBe(0);
    });

    it('page/limit から offset を計算して生成できる', () => {
      const pagination = Pagination.fromPage({ page: 2, limit: 20 });
      expect(pagination.offset).toBe(20);
    });

    it('next/prev でページを移動できる', () => {
      const pagination = Pagination.of({ limit: 10, offset: 0 });
      const next = pagination.next();
      const prev = next.prev();

      expect(next.offset).toBe(10);
      expect(prev.offset).toBe(0);
    });
  });

  describe('異常系', () => {
    it('limit が範囲外の場合は例外になる', () => {
      expect(() => Pagination.of({ limit: 0, offset: 0 })).toThrow(
        PaginationDomainError,
      );
      expect(() => Pagination.of({ limit: 101, offset: 0 })).toThrow(
        PaginationDomainError,
      );
    });

    it('offset が負の場合は例外になる', () => {
      expect(() => Pagination.of({ limit: 10, offset: -1 })).toThrow(
        PaginationDomainError,
      );
    });

    it('page が1未満の場合は例外になる', () => {
      expect(() => Pagination.fromPage({ page: 0, limit: 10 })).toThrow(
        PaginationDomainError,
      );
    });
  });
});
