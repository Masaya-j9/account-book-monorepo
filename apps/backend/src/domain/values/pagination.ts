// Domain Layer: Pagination Value Object
// 取引一覧などのページネーション（limit/offset）を表現する

import { DomainError } from './domain-error';

export class PaginationDomainError extends DomainError {
  constructor(message: string) {
    super(message, 'PaginationDomainError');
  }
}

export const PAGINATION_MIN_LIMIT = 1 as const;
export const PAGINATION_MAX_LIMIT = 100 as const;
export const PAGINATION_MIN_OFFSET = 0 as const;

type PaginationParams = {
  limit: number;
  offset: number;
};

const assertLimitInRange = (limit: number): void => {
  if (
    !Number.isInteger(limit) ||
    limit < PAGINATION_MIN_LIMIT ||
    limit > PAGINATION_MAX_LIMIT
  ) {
    throw new PaginationDomainError(
      `limit は${PAGINATION_MIN_LIMIT}〜${PAGINATION_MAX_LIMIT}の整数である必要があります`,
    );
  }
};

const assertOffsetNonNegative = (offset: number): void => {
  if (!Number.isInteger(offset) || offset < PAGINATION_MIN_OFFSET) {
    throw new PaginationDomainError('offset は0以上の整数である必要があります');
  }
};

export class Pagination {
  private constructor(
    private readonly _limit: number,
    private readonly _offset: number,
  ) {}

  static of(params: PaginationParams): Pagination {
    assertLimitInRange(params.limit);
    assertOffsetNonNegative(params.offset);
    return new Pagination(params.limit, params.offset);
  }

  static fromPage(params: { page: number; limit: number }): Pagination {
    if (!Number.isInteger(params.page) || params.page < 1) {
      throw new PaginationDomainError('page は1以上の整数である必要があります');
    }

    const offset = (params.page - 1) * params.limit;
    return Pagination.of({ limit: params.limit, offset });
  }

  get limit(): number {
    return this._limit;
  }

  get offset(): number {
    return this._offset;
  }

  next(): Pagination {
    return Pagination.of({
      limit: this._limit,
      offset: this._offset + this._limit,
    });
  }

  prev(): Pagination {
    return Pagination.of({
      limit: this._limit,
      offset: Math.max(this._offset - this._limit, 0),
    });
  }
}
