// Application Layer: List Categories Use Case
// カテゴリ一覧取得のビジネスロジックのオーケストレーション

import * as Cause from 'effect/Cause';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import { inject, injectable } from 'inversify';
import type { UserCategoryRecord } from '../../domain/entities/category.entity';
import type {
  FindAllOptions,
  ICategoryRepository,
} from '../../domain/repositories/category.repository.interface';
import { TOKENS } from '../../infrastructre/di/tokens';
import { Effect, pipe } from '../../shared/result';
import {
  InvalidPaginationError,
  InvalidSortParameterError,
  type ListCategoriesError,
  UnexpectedListCategoriesError,
} from './read-category.errors';

export type ListCategoriesInput = {
  userId: number;
  page?: number;
  perPage?: number;
  sortBy?: 'name' | 'createdAt' | 'displayOrder';
  sortOrder?: 'asc' | 'desc';
  type?: 'INCOME' | 'EXPENSE';
  includeHidden?: boolean;
};

export type ListCategoriesOutput = {
  items: UserCategoryRecord[];
  pageInfo: {
    page: number;
    perPage: number;
    totalPages: number;
  };
  total: number;
};

type NormalizedInput = {
  userId: number;
  page: number;
  perPage: number;
  sortBy: 'name' | 'createdAt' | 'displayOrder';
  sortOrder: 'asc' | 'desc';
  type?: 'INCOME' | 'EXPENSE';
  includeHidden: boolean;
};

@injectable()
export class ListCategoriesUseCase {
  @inject(TOKENS.CategoryRepository)
  private categoryRepository!: ICategoryRepository;

  async execute(input: ListCategoriesInput): Promise<ListCategoriesOutput> {
    const program = this.buildProgram(input);
    const exit = await Effect.runPromiseExit(program);
    return this.unwrapExit(exit);
  }

  private buildProgram(
    input: ListCategoriesInput,
  ): Effect.Effect<ListCategoriesOutput, ListCategoriesError> {
    return pipe(
      this.normalizeInput(input),
      Effect.flatMap((normalized) => this.fetchCategories(normalized)),
    );
  }

  private normalizeInput(
    input: ListCategoriesInput,
  ): Effect.Effect<NormalizedInput, ListCategoriesError> {
    const page = input.page ?? 1;
    const perPage = input.perPage ?? 30;
    const sortBy = input.sortBy ?? 'displayOrder';
    const sortOrder = input.sortOrder ?? 'asc';
    const includeHidden = input.includeHidden ?? false;

    return pipe(
      Effect.succeed({
        userId: input.userId,
        page,
        perPage,
        sortBy,
        sortOrder,
        type: input.type,
        includeHidden,
      }),
      Effect.filterOrFail(
        ({ page, perPage }) =>
          Number.isInteger(page) &&
          page >= 1 &&
          Number.isInteger(perPage) &&
          perPage >= 1 &&
          perPage <= 100,
        () =>
          new InvalidPaginationError({
            message:
              'ページネーションパラメータが不正です。page は1以上、perPage は1〜100の整数である必要があります',
          }),
      ),
      Effect.filterOrFail(
        ({ sortBy }) =>
          sortBy === 'name' || sortBy === 'createdAt' || sortBy === 'displayOrder',
        () =>
          new InvalidSortParameterError({
            message: 'sortBy は name, createdAt, displayOrder のいずれかである必要があります',
          }),
      ),
    );
  }

  private fetchCategories(
    normalized: NormalizedInput,
  ): Effect.Effect<ListCategoriesOutput, ListCategoriesError> {
    const options: FindAllOptions = {
      userId: normalized.userId,
      page: normalized.page,
      perPage: normalized.perPage,
      sortBy: normalized.sortBy,
      sortOrder: normalized.sortOrder,
      type: normalized.type,
      includeHidden: normalized.includeHidden,
    };

    return pipe(
      Effect.promise(() => this.categoryRepository.findAllWithPagination(options)).pipe(
        Effect.mapError((cause) =>
          new UnexpectedListCategoriesError({
            message: 'カテゴリ一覧の取得に失敗しました',
            cause: this.normalizeError(cause),
          }),
        ),
      ),
      Effect.map((result) => ({
        items: result.items,
        pageInfo: {
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
        },
        total: result.total,
      })),
    );
  }

  private unwrapExit<A>(exit: Exit.Exit<A, ListCategoriesError>): A {
    return Exit.match(exit, {
      onSuccess: (a) => a,
      onFailure: (cause) =>
        pipe(
          Cause.failureOption(cause),
          Option.match({
            onNone: () => {
              throw new UnexpectedListCategoriesError({
                message: 'カテゴリ一覧の取得に失敗しました',
                cause: new Error('Effectの実行が失敗しました'),
              });
            },
            onSome: (e) => {
              throw Cause.originalError(e);
            },
          }),
        ),
    });
  }

  private normalizeError<T>(cause: T): Error {
    return cause instanceof Error ? cause : new Error(String(cause));
  }
}
