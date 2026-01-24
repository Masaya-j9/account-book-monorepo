import { Container } from 'inversify';
import { describe, expect, it, vi } from 'vitest';

import type { CategoryRecord } from '../../domain/entities/category.entity';
import type { TransactionRecord } from '../../domain/entities/transaction.entity';
import { Transaction } from '../../domain/entities/transaction.entity';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';
import { TOKENS } from '../di/tokens';
import {
  CategoryTypeMismatchError,
  FutureTransactionDateError,
  InvalidAmountError,
  InvalidDateFormatError,
  TransactionTitleRequiredError,
} from './create-transaction.errors';
import {
  CategoriesNotFoundError,
  InvalidCategoryIdsError,
  NotOwnerError,
  TransactionNotFoundError,
  UnexpectedUpdateTransactionError,
} from './update-transaction.errors';
import { UpdateTransactionUseCase } from './update-transaction.service';

describe('UpdateTransactionUseCase（取引更新）', () => {
  const fixedCreatedAt = new Date('2026-01-01T00:00:00.000Z');
  const fixedUpdatedAt = new Date('2026-01-02T00:00:00.000Z');

  const makeCategoryRecord = (
    override?: Partial<CategoryRecord>,
  ): CategoryRecord => ({
    id: 10,
    name: '食費',
    type: 'EXPENSE',
    isDefault: false,
    createdAt: fixedCreatedAt,
    updatedAt: fixedUpdatedAt,
    ...override,
  });

  const makeTransactionRecord = (
    override?: Partial<TransactionRecord>,
  ): TransactionRecord => ({
    id: 1,
    userId: 100,
    type: 'EXPENSE',
    title: 'ランチ',
    amount: 1000,
    currency: 'JPY',
    date: '2026-01-01',
    categoryId: 10,
    memo: 'メモ',
    createdAt: fixedCreatedAt,
    updatedAt: fixedUpdatedAt,
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
    container.bind(UpdateTransactionUseCase).toSelf();
    return container;
  };

  describe('正常系', () => {
    it('カテゴリ未指定の場合は既存カテゴリを引き継いで更新できる', async () => {
      const current = makeTransactionRecord({
        id: 1,
        userId: 100,
        type: 'EXPENSE',
        categoryId: 10,
        memo: '旧メモ',
      });

      const updated = makeTransactionRecord({
        id: 1,
        userId: 100,
        type: 'EXPENSE',
        title: '更新タイトル',
        amount: 1200,
        currency: 'JPY',
        date: '2026-01-01',
        categoryId: 10,
        memo: '',
        createdAt: fixedCreatedAt,
        updatedAt: fixedUpdatedAt,
      });

      const categories = [
        makeCategoryRecord({ id: 10, name: '食費', type: 'EXPENSE' }),
        makeCategoryRecord({ id: 11, name: '日用品', type: 'EXPENSE' }),
      ];

      const mockTransactionRepo = {
        findById: vi.fn().mockResolvedValue(current),
        findCategoryIdsByTransactionId: vi.fn().mockResolvedValue([10, 11]),
        update: vi.fn().mockResolvedValue(updated),
      };

      const mockCategoryRepo = {
        findByIds: vi.fn().mockResolvedValue(categories),
      };

      const container = createMockContainer(
        mockTransactionRepo,
        mockCategoryRepo,
      );
      const useCase = container.get(UpdateTransactionUseCase);

      const output = await useCase.execute({
        userId: 100,
        id: 1,
        title: '更新タイトル',
        amount: 1200,
        memo: '  ',
      });

      expect(mockTransactionRepo.findById).toHaveBeenCalledWith(1);
      expect(
        mockTransactionRepo.findCategoryIdsByTransactionId,
      ).toHaveBeenCalledWith(1);
      expect(mockCategoryRepo.findByIds).toHaveBeenCalledWith(100, [10, 11]);
      expect(mockTransactionRepo.update).toHaveBeenCalledWith(
        expect.any(Transaction),
        { categoryIds: undefined },
      );

      expect(output).toEqual({
        transaction: {
          id: 1,
          userId: 100,
          type: 'EXPENSE',
          title: '更新タイトル',
          amount: 1200,
          currencyCode: 'JPY',
          date: '2026-01-01',
          categories: [
            { id: 10, name: '食費', type: 'EXPENSE', isDefault: false },
            { id: 11, name: '日用品', type: 'EXPENSE', isDefault: false },
          ],
          memo: null,
          createdAt: fixedCreatedAt.toISOString(),
          updatedAt: fixedUpdatedAt.toISOString(),
        },
      });
    });
  });

  describe('異常系', () => {
    it('取引が見つからない場合は例外になる', async () => {
      const mockTransactionRepo = {
        findById: vi.fn().mockResolvedValue(null),
      };

      const container = createMockContainer(mockTransactionRepo, {});
      const useCase = container.get(UpdateTransactionUseCase);

      await expect(
        useCase.execute({ userId: 100, id: 999, title: '更新' }),
      ).rejects.toBeInstanceOf(TransactionNotFoundError);
    });

    it('所有者が一致しない場合は例外になる', async () => {
      const mockTransactionRepo = {
        findById: vi
          .fn()
          .mockResolvedValue(makeTransactionRecord({ userId: 999 })),
      };

      const container = createMockContainer(mockTransactionRepo, {});
      const useCase = container.get(UpdateTransactionUseCase);

      await expect(
        useCase.execute({ userId: 100, id: 1, title: '更新' }),
      ).rejects.toBeInstanceOf(NotOwnerError);
    });

    it('categoryIds が空配列の場合は例外になる', async () => {
      const container = createMockContainer({}, {});
      const useCase = container.get(UpdateTransactionUseCase);

      await expect(
        useCase.execute({ userId: 100, id: 1, categoryIds: [] }),
      ).rejects.toBeInstanceOf(InvalidCategoryIdsError);
    });

    it('カテゴリが不足している場合は例外になる', async () => {
      const mockTransactionRepo = {
        findById: vi.fn().mockResolvedValue(makeTransactionRecord()),
      };

      const mockCategoryRepo = {
        findByIds: vi
          .fn()
          .mockResolvedValue([makeCategoryRecord({ id: 10, type: 'EXPENSE' })]),
      };

      const container = createMockContainer(
        mockTransactionRepo,
        mockCategoryRepo,
      );
      const useCase = container.get(UpdateTransactionUseCase);

      await expect(
        useCase.execute({ userId: 100, id: 1, categoryIds: [10, 999] }),
      ).rejects.toBeInstanceOf(CategoriesNotFoundError);
    });

    it('取引タイプとカテゴリタイプが一致しない場合は例外になる', async () => {
      const mockTransactionRepo = {
        findById: vi
          .fn()
          .mockResolvedValue(makeTransactionRecord({ type: 'EXPENSE' })),
      };

      const mockCategoryRepo = {
        findByIds: vi
          .fn()
          .mockResolvedValue([makeCategoryRecord({ id: 10, type: 'INCOME' })]),
      };

      const container = createMockContainer(
        mockTransactionRepo,
        mockCategoryRepo,
      );
      const useCase = container.get(UpdateTransactionUseCase);

      await expect(
        useCase.execute({ userId: 100, id: 1, categoryIds: [10] }),
      ).rejects.toBeInstanceOf(CategoryTypeMismatchError);
    });

    it('バリデーションに失敗した場合は例外になる（タイトル/金額/日付）', async () => {
      const container = createMockContainer({}, {});
      const useCase = container.get(UpdateTransactionUseCase);

      await expect(
        useCase.execute({ userId: 100, id: 1, title: '' }),
      ).rejects.toBeInstanceOf(TransactionTitleRequiredError);

      await expect(
        useCase.execute({ userId: 100, id: 1, amount: -1 }),
      ).rejects.toBeInstanceOf(InvalidAmountError);

      await expect(
        useCase.execute({ userId: 100, id: 1, date: '2026/01/01' }),
      ).rejects.toBeInstanceOf(InvalidDateFormatError);

      await expect(
        useCase.execute({ userId: 100, id: 1, date: '2099-01-01' }),
      ).rejects.toBeInstanceOf(FutureTransactionDateError);
    });

    it('想定外例外は UnexpectedUpdateTransactionError にラップされる', async () => {
      const mockTransactionRepo = {
        findById: vi.fn().mockRejectedValue(new Error('boom')),
      };

      const container = createMockContainer(mockTransactionRepo, {});
      const useCase = container.get(UpdateTransactionUseCase);

      await expect(
        useCase.execute({ userId: 100, id: 1, title: '更新' }),
      ).rejects.toBeInstanceOf(UnexpectedUpdateTransactionError);
    });
  });
});
