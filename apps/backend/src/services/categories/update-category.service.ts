// Application Layer: Update Category Use Case
// カテゴリ更新のビジネスロジックのオーケストレーション

import * as Cause from 'effect/Cause';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import { inject, injectable } from 'inversify';
import type { UserCategoryRecord } from '../../domain/entities/category.entity';
import type {
  ICategoryRepository,
  UpdateCategoryData,
} from '../../domain/repositories/category.repository.interface';
import { CategoryName } from '../../domain/values/category-name';
import { TOKENS } from '../../infrastructre/di/tokens';
import { Effect, Either, pipe } from '../../shared/result';
import {
  CategoryNotFoundError,
  DefaultCategoryUpdateForbiddenError,
  InvalidUpdateDataError,
  UnexpectedUpdateCategoryError,
  type UpdateCategoryError,
} from './update-category.errors';

export interface UpdateCategoryInput {
  categoryId: number;
  userId: number;
  isVisible?: boolean;
  customName?: string;
  displayOrder?: number;
}

type NormalizedInput = {
  categoryId: number;
  userId: number;
  updateData: UpdateCategoryData;
};

@injectable()
export class UpdateCategoryUseCase {
  @inject(TOKENS.CategoryRepository)
  private categoryRepository!: ICategoryRepository;

  async execute(input: UpdateCategoryInput): Promise<UserCategoryRecord> {
    const program = this.buildProgram(input);
    const exit = await Effect.runPromiseExit(program);
    return this.unwrapExit(exit);
  }

  private buildProgram(
    input: UpdateCategoryInput,
  ): Effect.Effect<UserCategoryRecord, UpdateCategoryError> {
    return pipe(
      this.normalizeInput(input),
      Effect.flatMap((value) => this.validateCategoryExists(value)),
      Effect.flatMap((value) => this.validateNotDefaultCategory(value)),
      Effect.flatMap((value) => this.updateCategory(value)),
    );
  }

  private normalizeInput(
    input: UpdateCategoryInput,
  ): Effect.Effect<NormalizedInput, UpdateCategoryError> {
    // customName の空文字を null に正規化
    const normalizedCustomName =
      input.customName !== undefined
        ? input.customName.trim() === ''
          ? null
          : input.customName
        : undefined;

    // カスタム名のバリデーション（設定する場合のみ）
    if (
      normalizedCustomName !== undefined &&
      normalizedCustomName !== null &&
      normalizedCustomName.length > 0
    ) {
      const nameValidation = CategoryName.create(normalizedCustomName);
      if (Either.isLeft(nameValidation)) {
        return Effect.fail(
          new InvalidUpdateDataError({
            message: `カスタム名が不正です: ${nameValidation.left.message}`,
          }),
        );
      }
    }

    const updateData: UpdateCategoryData = {};

    if (input.isVisible !== undefined) {
      updateData.isVisible = input.isVisible;
    }

    if (normalizedCustomName !== undefined) {
      updateData.customName = normalizedCustomName;
    }

    if (input.displayOrder !== undefined) {
      // displayOrder のバリデーション
      if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0) {
        return Effect.fail(
          new InvalidUpdateDataError({
            message: '表示順は0以上の整数である必要があります',
          }),
        );
      }
      updateData.displayOrder = input.displayOrder;
    }

    // 更新データが空の場合はエラー
    if (Object.keys(updateData).length === 0) {
      return Effect.fail(
        new InvalidUpdateDataError({
          message: '更新するデータが指定されていません',
        }),
      );
    }

    return Effect.succeed({
      categoryId: input.categoryId,
      userId: input.userId,
      updateData,
    });
  }

  private validateCategoryExists(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, UpdateCategoryError> {
    return pipe(
      Effect.promise(() =>
        this.categoryRepository.findByIdWithUser(
          value.categoryId,
          value.userId,
        ),
      ).pipe(
        Effect.mapError(
          (cause) =>
            new UnexpectedUpdateCategoryError({
              message: 'カテゴリの取得に失敗しました',
              cause: this.normalizeError(cause),
            }),
        ),
      ),
      Effect.flatMap((category) => {
        if (category === null) {
          return Effect.fail(
            new CategoryNotFoundError({
              message: `カテゴリ（ID: ${value.categoryId}）が見つかりません`,
              categoryId: value.categoryId,
            }),
          );
        }
        return Effect.succeed(value);
      }),
    );
  }

  private validateNotDefaultCategory(
    value: NormalizedInput,
  ): Effect.Effect<NormalizedInput, UpdateCategoryError> {
    return pipe(
      Effect.promise(() =>
        this.categoryRepository.findById(value.categoryId),
      ).pipe(
        Effect.mapError(
          (cause) =>
            new UnexpectedUpdateCategoryError({
              message: 'カテゴリの取得に失敗しました',
              cause: this.normalizeError(cause),
            }),
        ),
      ),
      Effect.flatMap(
        (
          category,
        ): Effect.Effect<NormalizedInput, UpdateCategoryError> => {
          if (category === null) {
            return Effect.fail(
              new CategoryNotFoundError({
                message: `カテゴリ（ID: ${value.categoryId}）が見つかりません`,
                categoryId: value.categoryId,
              }),
            );
          }

          // デフォルトカテゴリの更新を禁止（ドメインルール）
          if (category.isDefault) {
            return Effect.fail(
              new DefaultCategoryUpdateForbiddenError({
                message: 'デフォルトカテゴリは更新できません',
                categoryId: value.categoryId,
              }),
            );
          }

          return Effect.succeed(value);
        },
      ),
    );
  }

  private updateCategory(
    value: NormalizedInput,
  ): Effect.Effect<UserCategoryRecord, UpdateCategoryError> {
    return pipe(
      Effect.promise(() =>
        this.categoryRepository.update(
          value.categoryId,
          value.userId,
          value.updateData,
        ),
      ).pipe(
        Effect.mapError((cause) =>
          pipe(
            cause,
            (c) => this.normalizeError(c),
            (error) => this.mapUpdateCategoryError(value, error),
          ),
        ),
      ),
    );
  }

  private mapUpdateCategoryError(
    value: NormalizedInput,
    error: Error,
  ): UpdateCategoryError {
    const message = error.message;

    const rules = [
      {
        predicate: (m: string) => m.includes('not found'),
        mapToError: () =>
          new CategoryNotFoundError({
            message: `カテゴリ（ID: ${value.categoryId}）が見つかりません`,
            categoryId: value.categoryId,
          }),
      },
    ];

    return pipe(
      rules.find((rule) => rule.predicate(message)),
      Option.fromNullable,
      Option.map((rule) => rule.mapToError()),
      Option.getOrElse(
        () =>
          new UnexpectedUpdateCategoryError({
            message: 'カテゴリの更新に失敗しました',
            cause: error,
          }),
      ),
    );
  }

  private unwrapExit<A>(exit: Exit.Exit<A, UpdateCategoryError>): A {
    return Exit.match(exit, {
      onSuccess: (a) => a,
      onFailure: (cause) =>
        pipe(
          Cause.failureOption(cause),
          Option.match({
            onNone: () => {
              throw new UnexpectedUpdateCategoryError({
                message: 'カテゴリの更新に失敗しました',
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
