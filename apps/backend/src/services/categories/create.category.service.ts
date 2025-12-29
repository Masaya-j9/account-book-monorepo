// Application Layer: Create Category Use Case
// ビジネスロジックのオーケストレーション

import * as Cause from 'effect/Cause';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import { inject, injectable } from 'inversify';
import type {
  CategoryRecord,
  CreateCategoryData,
} from '../../domain/entities/category.entity';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import { CategoryName } from '../../domain/values/category-name';
import { TOKENS } from '../../infrastructre/di/tokens';
import { Effect, Either, pipe } from '../../shared/result';
import {
  type CreateCategoryError,
  DuplicateCategoryError,
  InvalidCategoryNameError,
  InvalidTypeIdError,
  TransactionTypeNotFoundError,
  UnexpectedCreateCategoryError,
} from './create-category.errors';

export interface CreateCategoryInput {
  name: string;
  typeId: number;
  userId: number;
}

type NormalizedInput = {
  name: string;
  typeId: number;
  userId: number;
};

@injectable()
export class CreateCategoryUseCase {
  @inject(TOKENS.CategoryRepository)
  private categoryRepository!: ICategoryRepository;

  async execute(input: CreateCategoryInput): Promise<CategoryRecord> {
    const program = this.buildProgram(input);
    const exit = await Effect.runPromiseExit(program);
    return this.unwrapExit(exit);
  }

  private buildProgram(
    input: CreateCategoryInput,
  ): Effect.Effect<CategoryRecord, CreateCategoryError> {
    return pipe(
      this.normalizeInput(input),
      Effect.flatMap((value) => this.validateTypeId(value)),
      Effect.flatMap((value) => this.validateDuplicatedName(value)),
      Effect.flatMap((value) => this.createCategory(value)),
    );
  }

  private normalizeInput(
    input: CreateCategoryInput,
  ): Effect.Effect<NormalizedInput, CreateCategoryError> {
    return pipe(
      CategoryName.create(input.name),
      Either.map((name) => ({
        name: name.value,
        typeId: input.typeId,
        userId: input.userId,
      })),
      Either.mapLeft(
        (cause) => new InvalidCategoryNameError({ message: cause.message }),
      ),
      Either.match({
        onLeft: (e) => Effect.fail(e),
        onRight: (a) => Effect.succeed(a),
      }),
    );
  }

  private validateTypeId(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, CreateCategoryError> {
    return pipe(
      Effect.succeed(value),
      Effect.filterOrFail(
        ({ typeId }) => Number.isInteger(typeId) && typeId > 0,
        () =>
          new InvalidTypeIdError({
            message: '取引種別ID(typeId)は1以上の整数である必要があります',
          }),
      ),
    );
  }

  private validateDuplicatedName(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, CreateCategoryError> {
    return pipe(
      Effect.promise(() => this.categoryRepository.findByName(value.name)).pipe(
        Effect.mapError(
          (cause) =>
            new UnexpectedCreateCategoryError({
              message: 'カテゴリの作成に失敗しました',
              cause: this.normalizeError(cause),
            }),
        ),
      ),
      Effect.flatMap((existingCategory) =>
        pipe(
          Effect.succeed(value),
          Effect.filterOrFail(
            () => existingCategory === null,
            () =>
              new DuplicateCategoryError({
                message: `カテゴリ「${value.name}」は既に存在します`,
                name: value.name,
              }),
          ),
        ),
      ),
    );
  }

  private createCategory(
    value: NormalizedInput,
  ): Effect.Effect<CategoryRecord, CreateCategoryError> {
    const createData: CreateCategoryData = {
      name: value.name,
      typeId: value.typeId,
    };

    return pipe(
      Effect.promise(() =>
        this.categoryRepository.create(createData, value.userId),
      ).pipe(
        Effect.mapError((cause) =>
          pipe(
            cause,
            (c) => this.normalizeError(c),
            (error) => this.mapCreateCategoryError(value, error),
          ),
        ),
      ),
    );
  }

  private mapCreateCategoryError(
    value: NormalizedInput,
    error: Error,
  ): CreateCategoryError {
    const message = error.message;

    const rules = [
      {
        predicate: (m: string) =>
          m.includes('Transaction type') && m.includes('not found'),
        mapToError: () =>
          new TransactionTypeNotFoundError({
            message,
            typeId: value.typeId,
          }),
      },
      {
        predicate: (m: string) =>
          m.includes('duplicate') || m.includes('unique'),
        mapToError: () =>
          new DuplicateCategoryError({
            message: `カテゴリ「${value.name}」は既に存在します`,
            name: value.name,
          }),
      },
    ];

    return pipe(
      rules.find((rule) => rule.predicate(message)),
      Option.fromNullable,
      Option.map((rule) => rule.mapToError()),
      Option.getOrElse(
        () =>
          new UnexpectedCreateCategoryError({
            message: 'カテゴリの作成に失敗しました',
            cause: error,
          }),
      ),
    );
  }

  private unwrapExit<A>(exit: Exit.Exit<A, CreateCategoryError>): A {
    return Exit.match(exit, {
      onSuccess: (a) => a,
      onFailure: (cause) =>
        pipe(
          Cause.failureOption(cause),
          Option.match({
            onNone: () => {
              throw new UnexpectedCreateCategoryError({
                message: 'カテゴリの作成に失敗しました',
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
