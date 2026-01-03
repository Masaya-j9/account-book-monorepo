// Application Layer: Update Transaction Use Case
// 取引更新（部分更新）を担当する

import * as Cause from 'effect/Cause';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import { inject, injectable } from 'inversify';

import type { CategoryRecord } from '../../domain/entities/category.entity';
import type { TransactionRecord } from '../../domain/entities/transaction.entity';
import { Transaction } from '../../domain/entities/transaction.entity';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';
import { Money } from '../../domain/values/money';
import { TransactionDate } from '../../domain/values/transaction-date';
import { TOKENS } from '../../infrastructre/di/tokens';
import { Effect, pipe } from '../../shared/result';
import {
  CategoryTypeMismatchError,
  FutureTransactionDateError,
  InvalidAmountError,
  InvalidDateFormatError,
  InvalidTransactionTypeError,
  TransactionMemoTooLongError,
  TransactionTitleRequiredError,
  TransactionTitleTooLongError,
} from './create-transaction.errors';
import { UpdateTransactionBuilder } from './update-transaction.builder';
import {
  CategoriesNotFoundError,
  InvalidCategoryIdsError,
  NotOwnerError,
  TransactionNotFoundError,
  UnexpectedUpdateTransactionError,
  type UpdateTransactionError,
} from './update-transaction.errors';

const MAX_TITLE_LENGTH = 100;
const MAX_MEMO_LENGTH = 500;
const MIN_AMOUNT = 1;

export type UpdateTransactionInput = {
  userId: number;
  id: number;
  type?: 'INCOME' | 'EXPENSE';
  title?: string;
  amount?: number;
  date?: string;
  categoryIds?: number[];
  memo?: string;
};

export type UpdateTransactionOutput = {
  transaction: {
    id: number;
    userId: number;
    type: 'INCOME' | 'EXPENSE';
    title: string;
    amount: number;
    currencyCode: string;
    date: string;
    categories: {
      id: number;
      name: string;
      type: 'INCOME' | 'EXPENSE';
      isDefault: boolean;
    }[];
    memo: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

type NormalizedInput = UpdateTransactionInput & {
  title?: string;
  memo?: string;
};

@injectable()
export class UpdateTransactionUseCase {
  @inject(TOKENS.TransactionRepository)
  private transactionRepository!: ITransactionRepository;

  @inject(TOKENS.CategoryRepository)
  private categoryRepository!: ICategoryRepository;

  private readonly builder = new UpdateTransactionBuilder();

  async execute(
    input: UpdateTransactionInput,
  ): Promise<UpdateTransactionOutput> {
    const program = this.buildProgram(input);
    const exit = await Effect.runPromiseExit(program);
    return this.unwrapExit(exit);
  }

  private buildProgram(
    input: UpdateTransactionInput,
  ): Effect.Effect<UpdateTransactionOutput, UpdateTransactionError> {
    return pipe(
      this.normalizeInput(input),
      Effect.flatMap((value) => this.validateTransactionType(value)),
      Effect.flatMap((value) => this.validateTitle(value)),
      Effect.flatMap((value) => this.validateMemo(value)),
      Effect.flatMap((value) => this.validateAmount(value)),
      Effect.flatMap((value) => this.validateDate(value)),
      Effect.flatMap((value) => this.validateCategoryIds(value)),
      Effect.flatMap((value) => this.fetchCurrentTransaction(value)),
      Effect.flatMap((value) => this.ensureOwner(value)),
      Effect.flatMap((value) => this.resolveCategoryIds(value)),
      Effect.flatMap((value) => this.fetchCategories(value)),
      Effect.flatMap((value) => this.ensureCategoriesMatchType(value)),
      Effect.flatMap((value) => this.updateTransaction(value)),
      Effect.map((value) =>
        this.builder.build({
          record: value.record,
          categoryIds: value.categoryIds,
          categories: value.categories,
        }),
      ),
    );
  }

  private normalizeInput(
    input: UpdateTransactionInput,
  ): Effect.Effect<NormalizedInput, UpdateTransactionError> {
    return Effect.succeed({
      ...input,
      title: input.title === undefined ? undefined : input.title.trim(),
      memo: input.memo === undefined ? undefined : input.memo.trim(),
    });
  }

  private validateTransactionType(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, UpdateTransactionError> {
    return value.type === undefined
      ? Effect.succeed(value)
      : pipe(
          Effect.succeed(value),
          Effect.filterOrFail(
            ({ type }) => type === 'INCOME' || type === 'EXPENSE',
            ({ type }) => new InvalidTransactionTypeError(String(type)),
          ),
        );
  }

  private validateTitle(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, UpdateTransactionError> {
    return value.title === undefined
      ? Effect.succeed(value)
      : pipe(
          Effect.succeed(value),
          Effect.filterOrFail(
            ({ title }) => (title ?? '').length > 0,
            () => new TransactionTitleRequiredError(),
          ),
          Effect.filterOrFail(
            ({ title }) => (title ?? '').length <= MAX_TITLE_LENGTH,
            () => new TransactionTitleTooLongError(),
          ),
        );
  }

  private validateMemo(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, UpdateTransactionError> {
    return value.memo === undefined
      ? Effect.succeed(value)
      : pipe(
          Effect.succeed(value),
          Effect.filterOrFail(
            ({ memo }) => (memo ?? '').length <= MAX_MEMO_LENGTH,
            () => new TransactionMemoTooLongError(),
          ),
        );
  }

  private validateAmount(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, UpdateTransactionError> {
    return value.amount === undefined
      ? Effect.succeed(value)
      : pipe(
          Effect.succeed(value),
          Effect.filterOrFail(
            ({ amount }) =>
              Number.isInteger(amount) && (amount ?? 0) >= MIN_AMOUNT,
            ({ amount }) => new InvalidAmountError(amount ?? 0),
          ),
          Effect.map(() => value),
        );
  }

  private validateDate(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, UpdateTransactionError> {
    if (value.date === undefined) {
      return Effect.succeed(value);
    }

    return pipe(
      Effect.try({
        try: () => TransactionDate.fromString(value.date ?? ''),
        catch: () => new InvalidDateFormatError(value.date ?? ''),
      }),
      Effect.filterOrFail(
        (transactionDate) => !transactionDate.isFuture(),
        () => new FutureTransactionDateError(value.date ?? ''),
      ),
      Effect.map(() => value),
    );
  }

  private validateCategoryIds(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, UpdateTransactionError> {
    return value.categoryIds === undefined
      ? Effect.succeed(value)
      : pipe(
          Effect.succeed(value),
          Effect.filterOrFail(
            ({ categoryIds }) => (categoryIds ?? []).length > 0,
            () => new InvalidCategoryIdsError(),
          ),
        );
  }

  private fetchCurrentTransaction(
    value: NormalizedInput,
  ): Effect.Effect<
    NormalizedInput & { current: TransactionRecord },
    UpdateTransactionError
  > {
    return pipe(
      Effect.tryPromise({
        try: () => this.transactionRepository.findById(value.id),
        catch: (cause) =>
          this.createUnexpectedError('取引情報の取得に失敗しました', cause),
      }),
      Effect.flatMap((record) =>
        record === null
          ? Effect.fail(new TransactionNotFoundError(value.id))
          : Effect.succeed({ ...value, current: record }),
      ),
    );
  }

  private ensureOwner(
    value: NormalizedInput & { current: TransactionRecord },
  ): Effect.Effect<
    NormalizedInput & { current: TransactionRecord },
    UpdateTransactionError
  > {
    return pipe(
      Effect.succeed(value),
      Effect.filterOrFail(
        ({ current, userId }) => current.userId === userId,
        () => new NotOwnerError(),
      ),
    );
  }

  private resolveCategoryIds(
    value: NormalizedInput & { current: TransactionRecord },
  ): Effect.Effect<
    NormalizedInput & {
      current: TransactionRecord;
      resolvedCategoryIds: number[];
    },
    UpdateTransactionError
  > {
    return value.categoryIds !== undefined
      ? Effect.succeed({ ...value, resolvedCategoryIds: value.categoryIds })
      : pipe(
          Effect.tryPromise({
            try: () =>
              this.transactionRepository.findCategoryIdsByTransactionId(
                value.id,
              ),
            catch: (cause) =>
              this.createUnexpectedError(
                '取引カテゴリの取得に失敗しました',
                cause,
              ),
          }),
          Effect.map((ids) => ({ ...value, resolvedCategoryIds: ids })),
        );
  }

  private fetchCategories(
    value: NormalizedInput & {
      current: TransactionRecord;
      resolvedCategoryIds: number[];
    },
  ): Effect.Effect<
    NormalizedInput & {
      current: TransactionRecord;
      resolvedCategoryIds: number[];
      categories: CategoryRecord[];
    },
    UpdateTransactionError
  > {
    return pipe(
      Effect.tryPromise({
        try: () =>
          this.categoryRepository.findByIds(
            value.userId,
            value.resolvedCategoryIds,
          ),
        catch: (cause) =>
          this.createUnexpectedError('カテゴリの取得に失敗しました', cause),
      }),
      Effect.flatMap((categories) => {
        const foundIds = new Set(categories.map((c) => c.id));
        const missing = value.resolvedCategoryIds.filter(
          (id) => !foundIds.has(id),
        );

        return missing.length > 0
          ? Effect.fail(new CategoriesNotFoundError(missing))
          : Effect.succeed({ ...value, categories });
      }),
    );
  }

  private ensureCategoriesMatchType(
    value: NormalizedInput & {
      current: TransactionRecord;
      resolvedCategoryIds: number[];
      categories: CategoryRecord[];
    },
  ): Effect.Effect<
    NormalizedInput & {
      current: TransactionRecord;
      resolvedCategoryIds: number[];
      categories: CategoryRecord[];
      resolvedType: 'INCOME' | 'EXPENSE';
    },
    UpdateTransactionError
  > {
    const resolvedType = value.type ?? value.current.type;

    const mismatch = value.categories.find((c) => c.type !== resolvedType);

    return mismatch
      ? Effect.fail(new CategoryTypeMismatchError(resolvedType, mismatch.type))
      : Effect.succeed({ ...value, resolvedType });
  }

  private updateTransaction(
    value: NormalizedInput & {
      current: TransactionRecord;
      resolvedCategoryIds: number[];
      categories: CategoryRecord[];
      resolvedType: 'INCOME' | 'EXPENSE';
    },
  ): Effect.Effect<
    {
      record: TransactionRecord;
      categoryIds: number[];
      categories: CategoryRecord[];
    },
    UpdateTransactionError
  > {
    const nextTitle = value.title ?? value.current.title;
    const nextMemo = value.memo ?? value.current.memo;
    const nextAmount = value.amount ?? value.current.amount;
    const nextDate = value.date ?? value.current.date;
    const primaryCategoryId = value.resolvedCategoryIds[0];

    return pipe(
      Effect.try({
        try: () => {
          const money = Money.ofWithCurrency(
            nextAmount,
            value.current.currency,
          );
          const date = TransactionDate.fromString(nextDate);

          // NOTE: ドメインエンティティは単一カテゴリを保持しているため、先頭を代表カテゴリとして扱う
          const transaction = Transaction.reconstruct(
            value.current.id,
            value.current.userId,
            value.resolvedType,
            nextTitle,
            money,
            date,
            primaryCategoryId,
            nextMemo,
            value.current.createdAt,
            value.current.updatedAt,
          );

          const operations: ReadonlyArray<((t: Transaction) => void) | null> = [
            primaryCategoryId !== value.current.categoryId
              ? (t: Transaction) => t.updateCategory(primaryCategoryId)
              : null,
            value.title !== undefined
              ? (t: Transaction) => t.updateTitle(nextTitle)
              : null,
            value.amount !== undefined
              ? (t: Transaction) => t.updateAmount(money)
              : null,
            value.date !== undefined
              ? (t: Transaction) => t.updateDate(date)
              : null,
            value.memo !== undefined
              ? (t: Transaction) => t.updateMemo(nextMemo)
              : null,
          ];

          const isOperation = (
            op: ((t: Transaction) => void) | null,
          ): op is (t: Transaction) => void => op !== null;

          return operations.filter(isOperation).reduce((t, op) => {
            op(t);
            return t;
          }, transaction);
        },
        catch: (cause) =>
          this.createUnexpectedError('取引の更新に失敗しました', cause),
      }),
      Effect.flatMap((transaction) =>
        Effect.tryPromise({
          try: () =>
            this.transactionRepository.update(transaction, {
              categoryIds: value.categoryIds,
            }),
          catch: (cause) =>
            this.createUnexpectedError('取引の更新に失敗しました', cause),
        }),
      ),
      Effect.map((record) => ({
        record,
        categoryIds: value.resolvedCategoryIds,
        categories: value.categories,
      })),
    );
  }

  private createUnexpectedError(
    message: string,
    cause?: unknown,
  ): UnexpectedUpdateTransactionError {
    const normalizedCause =
      cause instanceof Error
        ? cause
        : typeof cause === 'string'
          ? new Error(cause)
          : new Error('unknown error');

    return new UnexpectedUpdateTransactionError({
      message,
      cause: normalizedCause,
    });
  }

  private unwrapExit(
    exit: Exit.Exit<UpdateTransactionOutput, UpdateTransactionError>,
  ): UpdateTransactionOutput {
    return Exit.match(exit, {
      onSuccess: (value) => value,
      onFailure: (cause) =>
        pipe(
          Cause.failureOption(cause),
          Option.match({
            onNone: () => {
              throw new UnexpectedUpdateTransactionError({
                message: '取引の更新に失敗しました',
                cause: new Error('Effectの実行が失敗しました'),
              });
            },
            onSome: (error) => {
              throw error;
            },
          }),
        ),
    });
  }
}
