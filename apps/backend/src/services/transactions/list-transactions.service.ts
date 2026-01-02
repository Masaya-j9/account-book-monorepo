// Application Layer: List Transactions Use Case
// 取引一覧取得（フィルタ + ページネーション）を担当する

import * as Cause from 'effect/Cause';
import * as Exit from 'effect/Exit';
import { inject, injectable } from 'inversify';

import type { CategoryRecord } from '../../domain/entities/category.entity';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import type {
  ITransactionRepository,
  ListTransactionsResult,
} from '../../domain/repositories/transaction.repository.interface';
import {
  Pagination,
  PaginationDomainError,
} from '../../domain/values/pagination';
import { TransactionListOrder } from '../../domain/values/transaction-list-order';
import { TOKENS } from '../../infrastructre/di/tokens';
import { Effect, pipe } from '../../shared/result';
import {
  ListTransactionsBuilder,
  type ListTransactionsInput,
  type ListTransactionsOutput,
} from './list-transactions.builder';
import {
  InvalidPaginationError,
  type ListTransactionsError,
  UnexpectedListTransactionsError,
} from './list-transactions.errors';

@injectable()
export class ListTransactionsUseCase {
  @inject(TOKENS.TransactionRepository)
  private transactionRepository!: ITransactionRepository;

  @inject(TOKENS.CategoryRepository)
  private categoryRepository!: ICategoryRepository;

  private readonly builder = new ListTransactionsBuilder();

  async execute(input: ListTransactionsInput): Promise<ListTransactionsOutput> {
    const program = this.buildProgram(input);
    const exit = await Effect.runPromiseExit(program);
    return this.unwrapExit(exit);
  }

  private buildProgram(
    input: ListTransactionsInput,
  ): Effect.Effect<ListTransactionsOutput, ListTransactionsError> {
    return pipe(
      this.createPagination(input),
      Effect.flatMap((pagination) => this.fetchTransactions(input, pagination)),
      Effect.flatMap((result) => this.fetchCategories(input.userId, result)),
      Effect.map(({ result, categoriesById }) =>
        this.builder.build({ input, result, categoriesById }),
      ),
    );
  }

  private createPagination(
    input: ListTransactionsInput,
  ): Effect.Effect<Pagination, ListTransactionsError> {
    return pipe(
      Effect.try({
        try: () =>
          Pagination.fromPage({ page: input.page, limit: input.limit }),
        catch: (cause) => {
          const error =
            cause instanceof Error ? cause : new Error(String(cause));
          return error instanceof PaginationDomainError
            ? new InvalidPaginationError(error.message)
            : new InvalidPaginationError('ページネーションの指定が不正です');
        },
      }),
    );
  }

  private fetchTransactions(
    input: ListTransactionsInput,
    pagination: Pagination,
  ): Effect.Effect<ListTransactionsResult, ListTransactionsError> {
    const order = TransactionListOrder.from(input.order);

    return pipe(
      Effect.tryPromise({
        try: () =>
          this.transactionRepository.listByUserId({
            userId: input.userId,
            startDate: input.startDate,
            endDate: input.endDate,
            type: input.type,
            categoryIds: input.categoryIds,
            order: order.direction,
            limit: pagination.limit,
            offset: pagination.offset,
          }),
        catch: (cause) =>
          this.createUnexpectedError('取引一覧の取得に失敗しました', cause),
      }),
    );
  }

  private fetchCategories(
    userId: number,
    result: ListTransactionsResult,
  ): Effect.Effect<
    {
      result: ListTransactionsResult;
      categoriesById: Map<number, CategoryRecord>;
    },
    ListTransactionsError
  > {
    const allCategoryIds = result.items
      .map((item) => item.categoryIds)
      .reduce((acc, ids) => acc.concat(ids), [] as number[]);

    const uniqueCategoryIds = Array.from(new Set(allCategoryIds));

    return pipe(
      Effect.tryPromise({
        try: () => this.categoryRepository.findByIds(userId, uniqueCategoryIds),
        catch: (cause) =>
          this.createUnexpectedError('カテゴリの取得に失敗しました', cause),
      }),
      Effect.map((categories) =>
        categories.reduce((map, category) => {
          map.set(category.id, category);
          return map;
        }, new Map<number, CategoryRecord>()),
      ),
      Effect.map((categoriesById) => ({ result, categoriesById })),
    );
  }

  private createUnexpectedError(
    message: string,
    cause?: unknown,
  ): UnexpectedListTransactionsError {
    const normalizedCause =
      cause instanceof Error
        ? cause
        : typeof cause === 'string'
          ? new Error(cause)
          : new Error('unknown error');

    return new UnexpectedListTransactionsError({
      message,
      cause: normalizedCause,
    });
  }

  private unwrapExit(
    exit: Exit.Exit<ListTransactionsOutput, ListTransactionsError>,
  ): ListTransactionsOutput {
    if (Exit.isSuccess(exit)) {
      return exit.value;
    }

    const error = Cause.squash(exit.cause);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
