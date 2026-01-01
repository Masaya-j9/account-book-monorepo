// Application Layer: Create Transaction Use Case
// Effect-TSで入力のバリデーションと永続化を直列化

import * as Cause from 'effect/Cause';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import { inject, injectable } from 'inversify';
import type { CategoryRecord } from '../../domain/entities/category.entity';
import type {
  CreateTransactionData,
  TransactionRecord,
} from '../../domain/entities/transaction.entity';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';
import { Money } from '../../domain/values/money';
import { TransactionDate } from '../../domain/values/transaction-date';
import { TOKENS } from '../../infrastructre/di/tokens';
import { Effect, pipe } from '../../shared/result';
import {
  CategoryNotFoundError,
  CategoryTypeMismatchError,
  type CreateTransactionError,
  FutureTransactionDateError,
  InvalidAmountError,
  InvalidDateFormatError,
  InvalidTransactionTypeError,
  TransactionMemoTooLongError,
  TransactionTitleRequiredError,
  TransactionTitleTooLongError,
  UnexpectedCreateTransactionError,
} from './create-transaction.errors';

export interface CreateTransactionInput extends CreateTransactionData {}

type NormalizedInput = CreateTransactionInput & { title: string; memo: string };
type DatedInput = NormalizedInput & { transactionDate: TransactionDate };
type CategoryLoadedInput = DatedInput & { category: CategoryRecord };

@injectable()
export class CreateTransactionUseCase {
  @inject(TOKENS.TransactionRepository)
  private transactionRepository!: ITransactionRepository;

  @inject(TOKENS.CategoryRepository)
  private categoryRepository!: ICategoryRepository;

  async execute(input: CreateTransactionInput): Promise<TransactionRecord> {
    const program = this.buildProgram(input);
    const exit = await Effect.runPromiseExit(program);
    return this.unwrapExit(exit);
  }

  private buildProgram(
    input: CreateTransactionInput,
  ): Effect.Effect<TransactionRecord, CreateTransactionError> {
    return pipe(
      this.normalizeInput(input),
      Effect.flatMap((value) => this.validateTransactionType(value)),
      Effect.flatMap((value) => this.validateTitle(value)),
      Effect.flatMap((value) => this.validateMemo(value)),
      Effect.flatMap((value) => this.validateAmount(value)),
      Effect.flatMap((value) => this.validateDate(value)),
      Effect.flatMap((value) => this.fetchCategory(value)),
      Effect.flatMap((value) => this.ensureCategoryMatches(value)),
      Effect.flatMap((value) => this.createTransaction(value)),
    );
  }

  private normalizeInput(
    input: CreateTransactionInput,
  ): Effect.Effect<NormalizedInput, CreateTransactionError> {
    return Effect.succeed({
      ...input,
      title: input.title.trim(),
      memo: input.memo.trim(),
    });
  }

  private validateTransactionType(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, CreateTransactionError> {
    return pipe(
      Effect.succeed(value),
      Effect.filterOrFail(
        ({ type }) => type === 'INCOME' || type === 'EXPENSE',
        () => new InvalidTransactionTypeError(value.type),
      ),
    );
  }

  private validateTitle(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, CreateTransactionError> {
    return pipe(
      Effect.succeed(value),
      Effect.filterOrFail(
        ({ title }) => title.length > 0,
        () => new TransactionTitleRequiredError(),
      ),
      Effect.filterOrFail(
        ({ title }) => title.length <= 100,
        () => new TransactionTitleTooLongError(),
      ),
    );
  }

  private validateMemo(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, CreateTransactionError> {
    return pipe(
      Effect.succeed(value),
      Effect.filterOrFail(
        ({ memo }) => memo.length <= 500,
        () => new TransactionMemoTooLongError(),
      ),
    );
  }

  private validateAmount(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, CreateTransactionError> {
    return pipe(
      Effect.succeed(value),
      Effect.filterOrFail(
        ({ amount }) => Number.isInteger(amount) && amount > 0,
        () => new InvalidAmountError(value.amount),
      ),
      Effect.flatMap(() =>
        Effect.try({
          try: () => Money.of(value.amount),
          catch: () => new InvalidAmountError(value.amount),
        }),
      ),
      Effect.map(() => value),
    );
  }

  private validateDate(
    value: NormalizedInput,
  ): Effect.Effect<DatedInput, CreateTransactionError> {
    return pipe(
      Effect.try({
        try: () => TransactionDate.fromString(value.date),
        catch: () => new InvalidDateFormatError(value.date),
      }),
      Effect.filterOrFail(
        (transactionDate) => !transactionDate.isFuture(),
        () => new FutureTransactionDateError(value.date),
      ),
      Effect.map((transactionDate) => ({
        ...value,
        date: transactionDate.format(),
        transactionDate,
      })),
    );
  }

  private fetchCategory(
    value: DatedInput,
  ): Effect.Effect<CategoryLoadedInput, CreateTransactionError> {
    return pipe(
      pipe(
        Effect.promise(() =>
          this.categoryRepository.findById(value.categoryId),
        ),
        Effect.mapError((cause) =>
          this.createUnexpectedError('カテゴリ情報の取得に失敗しました', cause),
        ),
      ),
      Effect.flatMap((category) =>
        category === null
          ? Effect.fail(new CategoryNotFoundError(value.categoryId))
          : Effect.succeed({
              ...value,
              category,
            }),
      ),
    );
  }

  private ensureCategoryMatches(
    value: CategoryLoadedInput,
  ): Effect.Effect<CategoryLoadedInput, CreateTransactionError> {
    return pipe(
      Effect.succeed(value),
      Effect.filterOrFail(
        ({ category, type }) => category.type === type,
        () => new CategoryTypeMismatchError(value.type, value.category.type),
      ),
    );
  }

  private createTransaction(
    value: CategoryLoadedInput,
  ): Effect.Effect<TransactionRecord, CreateTransactionError> {
    const payload: CreateTransactionData = {
      userId: value.userId,
      type: value.type,
      title: value.title,
      amount: value.amount,
      date: value.date,
      categoryId: value.categoryId,
      memo: value.memo,
    };

    return pipe(
      Effect.promise(() => this.transactionRepository.create(payload)),
      Effect.mapError((cause) =>
        this.createUnexpectedError('取引の保存に失敗しました', cause),
      ),
    );
  }

  private createUnexpectedError(
    message: string,
    cause?: unknown,
  ): UnexpectedCreateTransactionError {
    const normalizedCause =
      cause instanceof Error
        ? cause
        : new Error(typeof cause === 'string' ? cause : '原因不明なエラー');
    return new UnexpectedCreateTransactionError({
      message,
      cause: normalizedCause,
    });
  }

  private unwrapExit(
    exit: Exit.Exit<TransactionRecord, CreateTransactionError>,
  ): TransactionRecord {
    return Exit.match(exit, {
      onSuccess: (value) => value,
      onFailure: (cause) =>
        pipe(
          Cause.failureOption(cause),
          Option.match({
            onNone: () => {
              throw new UnexpectedCreateTransactionError({
                message: '取引の作成に失敗しました',
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
