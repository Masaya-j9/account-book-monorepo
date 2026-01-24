import type { NodePgDatabase } from "@account-book-app/db";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CategoryRecord } from "../../domain/entities/category.entity";
import {
	DuplicateCategoryError,
	InvalidCategoryNameError,
	TransactionTypeNotFoundError,
} from "../../services/categories/create-category.errors";
import { TOKENS } from "../../services/di/tokens";

const { createRequestContainerMock, executeMock, getMock } = vi.hoisted(() => {
	const execute = vi.fn();
	const get = vi.fn(() => ({ execute }));
	const createRequestContainer = vi.fn(() => ({ get }));
	return {
		createRequestContainerMock: createRequestContainer,
		executeMock: execute,
		getMock: get,
	};
});

vi.mock("../../infrastructre/di/container", () => ({
	createRequestContainer: createRequestContainerMock,
}));

import { categoryRouter } from "./category.router";

const fixedNow = new Date("2025-01-01T00:00:00.000Z");

const makeCategoryRecord = (
	override?: Partial<CategoryRecord>,
): CategoryRecord => ({
	id: 1,
	name: "食費",
	type: "EXPENSE",
	isDefault: false,
	createdAt: fixedNow,
	updatedAt: fixedNow,
	...override,
});

describe("categoryRouter（カテゴリルーター）", () => {
	const db = {} as unknown as NodePgDatabase;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("認証済みの場合、カテゴリを作成できる（outputの整形が行われる）", async () => {
		executeMock.mockResolvedValueOnce(
			makeCategoryRecord({
				id: 10,
				name: "サブスク費",
				type: "EXPENSE",
				isDefault: false,
			}),
		);

		const caller = categoryRouter.createCaller({ db, userId: 1 });
		const result = await caller.create({ name: "サブスク費", typeId: 2 });

		expect(createRequestContainerMock).toHaveBeenCalledWith(db);
		expect(getMock).toHaveBeenCalledWith(TOKENS.CreateCategoryUseCase);
		expect(executeMock).toHaveBeenCalledWith({
			name: "サブスク費",
			typeId: 2,
			userId: 1,
		});

		// output schema により createdAt/updatedAt は落ちる（presentation層の責務）
		expect(result).toEqual({
			category: {
				id: 10,
				name: "サブスク費",
				type: "EXPENSE",
				isDefault: false,
			},
		});
	});

	describe("異常系", () => {
		it("未認証の場合は UNAUTHORIZED になる", async () => {
			const caller = categoryRouter.createCaller({ db });

			await expect(
				caller.create({ name: "食費", typeId: 2 }),
			).rejects.toMatchObject({
				code: "UNAUTHORIZED",
			});
		});

		it("取引種別が未登録の場合は BAD_REQUEST に変換される", async () => {
			executeMock.mockRejectedValueOnce(
				new TransactionTypeNotFoundError({
					message: "Transaction type 999 not found",
					typeId: 999,
				}),
			);

			const caller = categoryRouter.createCaller({ db, userId: 1 });

			await expect(
				caller.create({ name: "食費", typeId: 999 }),
			).rejects.toMatchObject({
				code: "BAD_REQUEST",
				message:
					"取引種別(INCOME/EXPENSE)がDBに未登録です。packages/db の seed を実行してください。",
			});
		});

		it("同名カテゴリが既に存在する場合は CONFLICT に変換される", async () => {
			executeMock.mockRejectedValueOnce(
				new DuplicateCategoryError({
					message: "既に存在します",
					name: "食費",
				}),
			);

			const caller = categoryRouter.createCaller({ db, userId: 1 });

			await expect(
				caller.create({ name: "食費", typeId: 2 }),
			).rejects.toMatchObject({
				code: "CONFLICT",
				message: "既に存在します",
			});
		});

		it("バリデーション系メッセージは BAD_REQUEST に変換される（必須/以内）", async () => {
			executeMock.mockRejectedValueOnce(
				new InvalidCategoryNameError({ message: "カテゴリ名は必須です" }),
			);

			const caller = categoryRouter.createCaller({ db, userId: 1 });

			await expect(
				caller.create({ name: "食費", typeId: 2 }),
			).rejects.toMatchObject({
				code: "BAD_REQUEST",
				message: "カテゴリ名は必須です",
			});
		});

		it("想定外の例外は INTERNAL_SERVER_ERROR に変換される", async () => {
			executeMock.mockRejectedValueOnce(new Error("boom"));

			const caller = categoryRouter.createCaller({ db, userId: 1 });
			const error = await caller
				.create({ name: "食費", typeId: 2 })
				.catch((e) => e);

			expect(error).toBeInstanceOf(TRPCError);
			expect(error).toMatchObject({
				code: "INTERNAL_SERVER_ERROR",
				message: "カテゴリの作成に失敗しました",
			});
		});

		it("入力スキーマに違反する場合は usecase が呼ばれない", async () => {
			const caller = categoryRouter.createCaller({ db, userId: 1 });

			await expect(
				caller.create({ name: "", typeId: 2 }),
			).rejects.toBeInstanceOf(TRPCError);
			expect(executeMock).not.toHaveBeenCalled();
		});
	});
});
