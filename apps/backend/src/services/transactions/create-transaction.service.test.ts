import { Container } from "inversify";
import { describe, expect, it, vi } from "vitest";

import type { CategoryRecord } from "../../domain/entities/category.entity";
import type { TransactionRecord } from "../../domain/entities/transaction.entity";
import type { ICategoryRepository } from "../../domain/repositories/category.repository.interface";
import type { ITransactionRepository } from "../../domain/repositories/transaction.repository.interface";
import { TOKENS } from "../di/tokens";
import {
	CategoryNotFoundError,
	CategoryTypeMismatchError,
	FutureTransactionDateError,
	InvalidAmountError,
	InvalidDateFormatError,
	InvalidTransactionTypeError,
	TransactionMemoTooLongError,
	TransactionTitleRequiredError,
} from "./create-transaction.errors";
import { CreateTransactionUseCase } from "./create-transaction.service";

describe("CreateTransactionUseCase（取引作成）", () => {
	const fixedNow = new Date("2025-01-01T00:00:00.000Z");

	const makeCategoryRecord = (
		override?: Partial<CategoryRecord>,
	): CategoryRecord => ({
		id: 1,
		name: "食費",
		type: "EXPENSE",
		isDefault: true,
		createdAt: fixedNow,
		updatedAt: fixedNow,
		...override,
	});

	const makeTransactionRecord = (
		override?: Partial<TransactionRecord>,
	): TransactionRecord => ({
		id: 1,
		userId: 100,
		type: "EXPENSE",
		title: "ランチ",
		amount: 1000,
		currency: "JPY",
		date: "2025-01-15",
		categoryId: 1,
		memo: "カフェでランチ",
		createdAt: fixedNow,
		updatedAt: fixedNow,
		...override,
	});

	const createMockContainer = (
		mockTransactionRepo: Partial<ITransactionRepository>,
		mockCategoryRepo: Partial<ICategoryRepository>,
	) => {
		const container = new Container();
		container
			.bind<ITransactionRepository>(TOKENS.TransactionRepository)
			.toConstantValue(mockTransactionRepo as ITransactionRepository);
		container
			.bind<ICategoryRepository>(TOKENS.CategoryRepository)
			.toConstantValue(mockCategoryRepo as ICategoryRepository);
		container.bind(CreateTransactionUseCase).toSelf();
		return container;
	};

	describe("正常系", () => {
		it("支出取引を作成できる", async () => {
			const category = makeCategoryRecord({ id: 1, type: "EXPENSE" });
			const transaction = makeTransactionRecord({
				id: 1,
				type: "EXPENSE",
				categoryId: 1,
			});

			const mockCategoryRepo = {
				findById: vi.fn().mockResolvedValue(category),
			};

			const mockTransactionRepo = {
				create: vi.fn().mockResolvedValue(transaction),
			};

			const container = createMockContainer(
				mockTransactionRepo,
				mockCategoryRepo,
			);
			const useCase = container.get(CreateTransactionUseCase);

			const input = {
				userId: 100,
				type: "EXPENSE",
				title: "ランチ",
				amount: 1000,
				date: "2024-01-15",
				categoryId: 1,
				memo: "カフェでランチ",
			} as const;

			await expect(useCase.execute(input)).resolves.toEqual(transaction);
			expect(mockCategoryRepo.findById).toHaveBeenCalledWith(1);
			expect(mockTransactionRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					...input,
					title: "ランチ",
					memo: "カフェでランチ",
				}),
			);
		});

		it("収入取引を作成できる", async () => {
			const category = makeCategoryRecord({ id: 2, type: "INCOME" });
			const transaction = makeTransactionRecord({
				id: 1,
				type: "INCOME",
				categoryId: 2,
				title: "給与",
				amount: 300000,
			});

			const mockCategoryRepo = {
				findById: vi.fn().mockResolvedValue(category),
			};

			const mockTransactionRepo = {
				create: vi.fn().mockResolvedValue(transaction),
			};

			const container = createMockContainer(
				mockTransactionRepo,
				mockCategoryRepo,
			);
			const useCase = container.get(CreateTransactionUseCase);

			await expect(
				useCase.execute({
					userId: 100,
					type: "INCOME",
					title: "給与",
					amount: 300000,
					date: "2024-01-25",
					categoryId: 2,
					memo: "1月分給与",
				}),
			).resolves.toEqual(transaction);
		});
	});

	describe("異常系", () => {
		it("不正な取引タイプの場合は例外になる", async () => {
			const container = createMockContainer({}, {});
			const useCase = container.get(CreateTransactionUseCase);

			await expect(
				useCase.execute({
					userId: 100,
					type: "INVALID" as "INCOME",
					title: "ランチ",
					amount: 1000,
					date: "2024-01-15",
					categoryId: 1,
					memo: "",
				}),
			).rejects.toBeInstanceOf(InvalidTransactionTypeError);
		});

		it("不正な金額の場合は例外になる", async () => {
			const container = createMockContainer({}, {});
			const useCase = container.get(CreateTransactionUseCase);

			await expect(
				useCase.execute({
					userId: 100,
					type: "EXPENSE",
					title: "ランチ",
					amount: -1000,
					date: "2024-01-15",
					categoryId: 1,
					memo: "",
				}),
			).rejects.toBeInstanceOf(InvalidAmountError);

			await expect(
				useCase.execute({
					userId: 100,
					type: "EXPENSE",
					title: "ランチ",
					amount: 0,
					date: "2024-01-15",
					categoryId: 1,
					memo: "",
				}),
			).rejects.toBeInstanceOf(InvalidAmountError);
		});

		it("不正な日付形式の場合は例外になる", async () => {
			const container = createMockContainer({}, {});
			const useCase = container.get(CreateTransactionUseCase);

			await expect(
				useCase.execute({
					userId: 100,
					type: "EXPENSE",
					title: "ランチ",
					amount: 1000,
					date: "2025/01/15",
					categoryId: 1,
					memo: "",
				}),
			).rejects.toBeInstanceOf(InvalidDateFormatError);
		});

		it("カテゴリが存在しない場合は例外になる", async () => {
			const mockCategoryRepo = {
				findById: vi.fn().mockResolvedValue(null),
			};

			const container = createMockContainer({}, mockCategoryRepo);
			const useCase = container.get(CreateTransactionUseCase);

			await expect(
				useCase.execute({
					userId: 100,
					type: "EXPENSE",
					title: "ランチ",
					amount: 1000,
					date: "2024-01-15",
					categoryId: 999,
					memo: "",
				}),
			).rejects.toBeInstanceOf(CategoryNotFoundError);
		});

		it("カテゴリタイプが一致しない場合は例外になる", async () => {
			const category = makeCategoryRecord({ id: 1, type: "INCOME" });
			const mockCategoryRepo = {
				findById: vi.fn().mockResolvedValue(category),
			};

			const container = createMockContainer({}, mockCategoryRepo);
			const useCase = container.get(CreateTransactionUseCase);

			await expect(
				useCase.execute({
					userId: 100,
					type: "EXPENSE",
					title: "ランチ",
					amount: 1000,
					date: "2024-01-15",
					categoryId: 1,
					memo: "",
				}),
			).rejects.toBeInstanceOf(CategoryTypeMismatchError);
		});

		it("タイトルが空の場合は例外になる", async () => {
			const container = createMockContainer({}, {});
			const useCase = container.get(CreateTransactionUseCase);

			await expect(
				useCase.execute({
					userId: 100,
					type: "EXPENSE",
					title: "   ",
					amount: 1000,
					date: "2024-01-15",
					categoryId: 1,
					memo: "",
				}),
			).rejects.toBeInstanceOf(TransactionTitleRequiredError);
		});

		it("メモが長すぎる場合は例外になる", async () => {
			const container = createMockContainer({}, {});
			const useCase = container.get(CreateTransactionUseCase);
			const longMemo = "あ".repeat(501);

			await expect(
				useCase.execute({
					userId: 100,
					type: "EXPENSE",
					title: "ランチ",
					amount: 1000,
					date: "2024-01-15",
					categoryId: 1,
					memo: longMemo,
				}),
			).rejects.toBeInstanceOf(TransactionMemoTooLongError);
		});

		it("未来日付は例外になる", async () => {
			const container = createMockContainer({}, {});
			const useCase = container.get(CreateTransactionUseCase);

			await expect(
				useCase.execute({
					userId: 100,
					type: "EXPENSE",
					title: "ランチ",
					amount: 1000,
					date: "2099-01-01",
					categoryId: 1,
					memo: "",
				}),
			).rejects.toBeInstanceOf(FutureTransactionDateError);
		});
	});
});
