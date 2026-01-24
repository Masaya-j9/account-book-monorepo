import { Container } from "inversify";
import { describe, expect, it, vi } from "vitest";

import type { UserCategoryRecord } from "../../domain/entities/category.entity";
import type {
	FindAllOptions,
	ICategoryRepository,
	PaginatedResult,
} from "../../domain/repositories/category.repository.interface";
import { TOKENS } from "../di/tokens";
import { ListCategoriesUseCase } from "./list-categories.service";
import {
	InvalidPaginationError,
	InvalidSortParameterError,
} from "./read-category.errors";

describe("ListCategoriesUseCase（カテゴリ一覧取得）", () => {
	const fixedNow = new Date("2025-01-01T00:00:00.000Z");

	const makeUserCategoryRecord = (
		override?: Partial<UserCategoryRecord>,
	): UserCategoryRecord => ({
		id: 1,
		name: "食費",
		type: "EXPENSE",
		isDefault: false,
		createdAt: fixedNow,
		updatedAt: fixedNow,
		isVisible: true,
		customName: null,
		displayOrder: 0,
		...override,
	});

	const makePaginatedResult = (
		items: UserCategoryRecord[] = [],
		overrides?: Partial<PaginatedResult<UserCategoryRecord>>,
	): PaginatedResult<UserCategoryRecord> => ({
		items,
		total: items.length,
		page: 1,
		perPage: 30,
		totalPages: items.length > 0 ? 1 : 0,
		...overrides,
	});

	const setup = (overrides?: Partial<ICategoryRepository>) => {
		const repo: ICategoryRepository = {
			create: vi.fn(),
			findById: vi.fn(async (_id: number) => null),
			findByName: vi.fn(async (_name: string) => null),
			findByUserId: vi.fn(async (_userId: number) => []),
			findByIds: vi.fn(async (_userId: number, _ids: number[]) => []),
			findAllWithPagination: vi.fn(async (_options: FindAllOptions) =>
				makePaginatedResult(),
			),
			findByIdWithUser: vi.fn(async (_id: number, _userId: number) => null),
			update: vi.fn(),
			...overrides,
		};

		const container = new Container();
		container
			.bind<ICategoryRepository>(TOKENS.CategoryRepository)
			.toConstantValue(repo);
		container.bind<ListCategoriesUseCase>(ListCategoriesUseCase).toSelf();

		const useCase = container.get(ListCategoriesUseCase);

		return { useCase, repo };
	};

	describe("正常系", () => {
		it("デフォルト値でカテゴリ一覧を取得できる", async () => {
			const items = [
				makeUserCategoryRecord({ id: 1, name: "食費", displayOrder: 1 }),
				makeUserCategoryRecord({ id: 2, name: "交通費", displayOrder: 2 }),
			];
			const { useCase, repo } = setup({
				findAllWithPagination: vi.fn(async () =>
					makePaginatedResult(items, { total: 2 }),
				),
			});

			const result = await useCase.execute({ userId: 1 });

			expect(repo.findAllWithPagination).toHaveBeenCalledWith({
				userId: 1,
				page: 1,
				perPage: 30,
				sortBy: "displayOrder",
				sortOrder: "asc",
				includeHidden: false,
			});

			expect(result.items).toHaveLength(2);
			expect(result.total).toBe(2);
			expect(result.pageInfo.page).toBe(1);
			expect(result.pageInfo.perPage).toBe(30);
		});

		it("ページネーションパラメータを指定してカテゴリ一覧を取得できる", async () => {
			const items = [makeUserCategoryRecord({ id: 3, name: "交際費" })];
			const { useCase, repo } = setup({
				findAllWithPagination: vi.fn(async () =>
					makePaginatedResult(items, {
						page: 2,
						perPage: 10,
						total: 15,
						totalPages: 2,
					}),
				),
			});

			const result = await useCase.execute({
				userId: 1,
				page: 2,
				perPage: 10,
			});

			expect(repo.findAllWithPagination).toHaveBeenCalledWith({
				userId: 1,
				page: 2,
				perPage: 10,
				sortBy: "displayOrder",
				sortOrder: "asc",
				includeHidden: false,
			});

			expect(result.pageInfo.page).toBe(2);
			expect(result.pageInfo.perPage).toBe(10);
			expect(result.total).toBe(15);
			expect(result.pageInfo.totalPages).toBe(2);
		});

		it("ソートパラメータを指定してカテゴリ一覧を取得できる", async () => {
			const items = [
				makeUserCategoryRecord({ id: 1, name: "A食費" }),
				makeUserCategoryRecord({ id: 2, name: "B交通費" }),
			];
			const { useCase, repo } = setup({
				findAllWithPagination: vi.fn(async () => makePaginatedResult(items)),
			});

			await useCase.execute({
				userId: 1,
				sortBy: "name",
				sortOrder: "desc",
			});

			expect(repo.findAllWithPagination).toHaveBeenCalledWith({
				userId: 1,
				page: 1,
				perPage: 30,
				sortBy: "name",
				sortOrder: "desc",
				includeHidden: false,
			});
		});

		it("タイプを指定してフィルタリングできる", async () => {
			const items = [
				makeUserCategoryRecord({ id: 1, name: "給料", type: "INCOME" }),
			];
			const { useCase, repo } = setup({
				findAllWithPagination: vi.fn(async () => makePaginatedResult(items)),
			});

			await useCase.execute({
				userId: 1,
				type: "INCOME",
			});

			expect(repo.findAllWithPagination).toHaveBeenCalledWith({
				userId: 1,
				page: 1,
				perPage: 30,
				sortBy: "displayOrder",
				sortOrder: "asc",
				type: "INCOME",
				includeHidden: false,
			});
		});

		it("非表示カテゴリを含めて取得できる", async () => {
			const items = [
				makeUserCategoryRecord({ id: 1, name: "食費", isVisible: true }),
				makeUserCategoryRecord({ id: 2, name: "旧カテゴリ", isVisible: false }),
			];
			const { useCase, repo } = setup({
				findAllWithPagination: vi.fn(async () => makePaginatedResult(items)),
			});

			await useCase.execute({
				userId: 1,
				includeHidden: true,
			});

			expect(repo.findAllWithPagination).toHaveBeenCalledWith({
				userId: 1,
				page: 1,
				perPage: 30,
				sortBy: "displayOrder",
				sortOrder: "asc",
				includeHidden: true,
			});
		});
	});

	describe("異常系", () => {
		it("page が1未満の場合は例外になる", async () => {
			const { useCase } = setup();

			await expect(
				useCase.execute({ userId: 1, page: 0 }),
			).rejects.toBeInstanceOf(InvalidPaginationError);

			await expect(useCase.execute({ userId: 1, page: 0 })).rejects.toThrow(
				"ページネーションパラメータが不正です",
			);
		});

		it("page が整数でない場合は例外になる", async () => {
			const { useCase } = setup();

			await expect(
				useCase.execute({ userId: 1, page: 1.5 }),
			).rejects.toBeInstanceOf(InvalidPaginationError);
		});

		it("perPage が1未満の場合は例外になる", async () => {
			const { useCase } = setup();

			await expect(
				useCase.execute({ userId: 1, perPage: 0 }),
			).rejects.toBeInstanceOf(InvalidPaginationError);
		});

		it("perPage が100を超える場合は例外になる", async () => {
			const { useCase } = setup();

			await expect(
				useCase.execute({ userId: 1, perPage: 101 }),
			).rejects.toBeInstanceOf(InvalidPaginationError);
		});

		it("sortBy が不正な場合は例外になる", async () => {
			const { useCase } = setup();

			const invalidSortBy = "invalid" as unknown as
				| "name"
				| "createdAt"
				| "displayOrder";

			await expect(
				useCase.execute({ userId: 1, sortBy: invalidSortBy }),
			).rejects.toBeInstanceOf(InvalidSortParameterError);

			await expect(
				useCase.execute({ userId: 1, sortBy: invalidSortBy }),
			).rejects.toThrow(
				"sortBy は name, createdAt, displayOrder のいずれかである必要があります",
			);
		});
	});
});
