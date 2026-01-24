// Application Layer: Get Category Use Case
// カテゴリ単体取得のビジネスロジックのオーケストレーション

import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { inject, injectable } from "inversify";
import type { UserCategoryRecord } from "../../domain/entities/category.entity";
import type { ICategoryRepository } from "../../domain/repositories/category.repository.interface";
import { Effect, pipe } from "../../shared/result";
import { TOKENS } from "../di/tokens";
import {
	CategoryNotFoundError,
	type GetCategoryError,
	InvalidCategoryIdError,
	UnexpectedGetCategoryError,
} from "./read-category.errors";

export type GetCategoryInput = {
	id: number;
	userId: number;
};

export type GetCategoryOutput = {
	item: UserCategoryRecord;
};

type NormalizedInput = {
	id: number;
	userId: number;
};

@injectable()
export class GetCategoryUseCase {
	@inject(TOKENS.CategoryRepository)
	private categoryRepository!: ICategoryRepository;

	async execute(input: GetCategoryInput): Promise<GetCategoryOutput> {
		const program = this.buildProgram(input);
		const exit = await Effect.runPromiseExit(program);
		return this.unwrapExit(exit);
	}

	private buildProgram(
		input: GetCategoryInput,
	): Effect.Effect<GetCategoryOutput, GetCategoryError> {
		return pipe(
			this.normalizeInput(input),
			Effect.flatMap((normalized) => this.fetchCategory(normalized)),
			Effect.map((item) => ({ item })),
		);
	}

	private normalizeInput(
		input: GetCategoryInput,
	): Effect.Effect<NormalizedInput, GetCategoryError> {
		return pipe(
			Effect.succeed({
				id: input.id,
				userId: input.userId,
			}),
			Effect.filterOrFail(
				({ id }) => Number.isInteger(id) && id > 0,
				() =>
					new InvalidCategoryIdError({
						message: "カテゴリIDは1以上の整数である必要があります",
					}),
			),
		);
	}

	private fetchCategory(
		normalized: NormalizedInput,
	): Effect.Effect<UserCategoryRecord, GetCategoryError> {
		return pipe(
			Effect.promise(() =>
				this.categoryRepository.findByIdWithUser(
					normalized.id,
					normalized.userId,
				),
			).pipe(
				Effect.mapError(
					(cause) =>
						new UnexpectedGetCategoryError({
							message: "カテゴリの取得に失敗しました",
							cause: this.normalizeError(cause),
						}),
				),
			),
			Effect.flatMap((category) =>
				category !== null
					? Effect.succeed(category)
					: Effect.fail(
							new CategoryNotFoundError({
								message: `カテゴリID ${normalized.id} が見つかりません`,
								categoryId: normalized.id,
							}),
						),
			),
		);
	}

	private unwrapExit<A>(exit: Exit.Exit<A, GetCategoryError>): A {
		return Exit.match(exit, {
			onSuccess: (a) => a,
			onFailure: (cause) =>
				pipe(
					Cause.failureOption(cause),
					Option.match({
						onNone: () => {
							throw new UnexpectedGetCategoryError({
								message: "カテゴリの取得に失敗しました",
								cause: new Error("Effectの実行が失敗しました"),
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
