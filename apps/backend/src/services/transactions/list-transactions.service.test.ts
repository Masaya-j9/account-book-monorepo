import { describe, expect, it } from 'vitest';

import type { CategoryRecord } from '../../domain/entities/category.entity';
import type {
  CreateTransactionData,
  Transaction,
  TransactionListItemRecord,
  TransactionRecord,
} from '../../domain/entities/transaction.entity';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import type {
  ITransactionRepository,
  ListTransactionsQuery,
  ListTransactionsResult,
} from '../../domain/repositories/transaction.repository.interface';
import {
  InvalidPaginationError,
  UnexpectedListTransactionsError,
} from './list-transactions.errors';
import { ListTransactionsUseCase } from './list-transactions.service';

describe('ListTransactionsUseCase（取引一覧取得）', () => {
  const USER_ID = 1;
  const LIMIT = 20;

  const fixedCreatedAt = new Date('2026-01-01T00:00:00.000Z');
  const fixedUpdatedAt = new Date('2026-01-02T00:00:00.000Z');

  const makeItem = (
    override?: Partial<TransactionListItemRecord>,
  ): TransactionListItemRecord => ({
    id: 1,
    userId: USER_ID,
    type: 'EXPENSE',
    title: 'ランチ',
    amount: 1000,
    currencyCode: 'JPY',
    date: '2025-01-01',
    categoryIds: [10],
    memo: null,
    createdAt: fixedCreatedAt,
    updatedAt: fixedUpdatedAt,
    ...override,
  });

  const makeCategory = (override?: Partial<CategoryRecord>): CategoryRecord => {
    const createdAt = override?.createdAt ?? fixedCreatedAt;
    const updatedAt = override?.updatedAt ?? fixedUpdatedAt;
    const {
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...rest
    } = override ?? {};

    return {
      id: 10,
      name: '食費',
      type: 'EXPENSE',
      isDefault: false,
      createdAt,
      updatedAt,
      ...rest,
    };
  };

  const createTransactionRepo = (params: {
    listByUserIdImpl: (
      query: ListTransactionsQuery,
    ) => Promise<ListTransactionsResult>;
  }): ITransactionRepository => {
    const notUsedCreate = async (
      _data: CreateTransactionData,
    ): Promise<TransactionRecord> => {
      throw new Error('not used');
    };

    const notUsedFindById = async (
      _id: number,
    ): Promise<TransactionRecord | null> => {
      throw new Error('not used');
    };

    const notUsedFindByUserId = async (
      _userId: number,
    ): Promise<TransactionRecord[]> => {
      throw new Error('not used');
    };

    const notUsedFindByUserIdAndPeriod = async (
      _userId: number,
      _startDate: string,
      _endDate: string,
    ): Promise<TransactionRecord[]> => {
      throw new Error('not used');
    };

    const notUsedUpdate = async (
      _transaction: Transaction,
    ): Promise<TransactionRecord> => {
      throw new Error('not used');
    };

    const notUsedDelete = async (_id: number): Promise<void> => {
      throw new Error('not used');
    };

    const notUsedExistsByCategoryId = async (
      _categoryId: number,
    ): Promise<boolean> => {
      throw new Error('not used');
    };

    return {
      create: notUsedCreate,
      findById: notUsedFindById,
      findByUserId: notUsedFindByUserId,
      findByUserIdAndPeriod: notUsedFindByUserIdAndPeriod,
      listByUserId: params.listByUserIdImpl,
      update: notUsedUpdate,
      delete: notUsedDelete,
      existsByCategoryId: notUsedExistsByCategoryId,
    };
  };

  const createCategoryRepo = (params: {
    findByIdsImpl: (userId: number, ids: number[]) => Promise<CategoryRecord[]>;
  }): ICategoryRepository => {
    const notUsedCreate = async (
      _data: { name: string; typeId: number },
      _userId: number,
    ): Promise<CategoryRecord> => {
      throw new Error('not used');
    };

    const notUsedFindById = async (
      _id: number,
    ): Promise<CategoryRecord | null> => {
      throw new Error('not used');
    };

    const notUsedFindByName = async (
      _name: string,
    ): Promise<CategoryRecord | null> => {
      throw new Error('not used');
    };

    const notUsedFindByUserId = async (
      _userId: number,
    ): Promise<CategoryRecord[]> => {
      throw new Error('not used');
    };

    const notUsedFindAllWithPagination: ICategoryRepository['findAllWithPagination'] =
      async (_options) => {
        throw new Error('not used');
      };

    const notUsedFindByIdWithUser: ICategoryRepository['findByIdWithUser'] =
      async (_id, _userId) => {
        throw new Error('not used');
      };

    const notUsedUpdate: ICategoryRepository['update'] = async (
      _categoryId,
      _userId,
      _data,
    ) => {
      throw new Error('not used');
    };

    return {
      create: notUsedCreate,
      findById: notUsedFindById,
      findByName: notUsedFindByName,
      findByUserId: notUsedFindByUserId,
      findByIds: params.findByIdsImpl,
      findAllWithPagination: notUsedFindAllWithPagination,
      findByIdWithUser: notUsedFindByIdWithUser,
      update: notUsedUpdate,
    };
  };

  const createUseCase = (deps: {
    transactionRepository: ITransactionRepository;
    categoryRepository: ICategoryRepository;
  }): ListTransactionsUseCase => {
    const useCase = new ListTransactionsUseCase();

    Object.assign(useCase as object, {
      transactionRepository: deps.transactionRepository,
      categoryRepository: deps.categoryRepository,
    });

    return useCase;
  };

  describe('正常系', () => {
    it('取引取得→カテゴリ取得を実行し、カテゴリIDは重複排除して渡す', async () => {
      let receivedQuery: ListTransactionsQuery | undefined;
      let receivedCategoryUserId: number | undefined;
      let receivedCategoryIds: number[] | undefined;

      const transactionRepository = createTransactionRepo({
        listByUserIdImpl: async (query) => {
          receivedQuery = query;
          return {
            items: [
              makeItem({ id: 1, categoryIds: [10, 11] }),
              makeItem({ id: 2, categoryIds: [11, 10] }),
            ],
            total: 2,
          };
        },
      });

      const categoryRepository = createCategoryRepo({
        findByIdsImpl: async (userId, ids) => {
          receivedCategoryUserId = userId;
          receivedCategoryIds = ids;
          return [
            makeCategory({ id: 10, name: '食費' }),
            makeCategory({ id: 11, name: '交通費' }),
          ];
        },
      });

      const useCase = createUseCase({
        transactionRepository,
        categoryRepository,
      });

      const output = await useCase.execute({
        userId: USER_ID,
        order: 'desc',
        page: 2,
        limit: LIMIT,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        type: 'EXPENSE',
        categoryIds: [10],
      });

      expect(receivedQuery).toEqual({
        userId: USER_ID,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        type: 'EXPENSE',
        categoryIds: [10],
        order: 'desc',
        limit: LIMIT,
        offset: LIMIT,
      });

      expect(receivedCategoryUserId).toBe(USER_ID);
      expect(receivedCategoryIds).toEqual([10, 11]);

      expect(output.transactions).toHaveLength(2);
      expect(output.transactions[0]?.categories).toEqual([
        { id: 10, name: '食費', type: 'EXPENSE', isDefault: false },
        { id: 11, name: '交通費', type: 'EXPENSE', isDefault: false },
      ]);
    });
  });

  describe('異常系', () => {
    it('page が不正な場合は InvalidPaginationError になる', async () => {
      const useCase = createUseCase({
        transactionRepository: createTransactionRepo({
          listByUserIdImpl: async () => ({ items: [], total: 0 }),
        }),
        categoryRepository: createCategoryRepo({
          findByIdsImpl: async () => [],
        }),
      });

      await expect(
        useCase.execute({
          userId: USER_ID,
          order: 'desc',
          page: 0,
          limit: LIMIT,
        }),
      ).rejects.toBeInstanceOf(InvalidPaginationError);
    });

    it('取引一覧の取得に失敗した場合は UnexpectedListTransactionsError になる', async () => {
      const useCase = createUseCase({
        transactionRepository: createTransactionRepo({
          listByUserIdImpl: async () => {
            throw new Error('db error');
          },
        }),
        categoryRepository: createCategoryRepo({
          findByIdsImpl: async () => [],
        }),
      });

      await expect(
        useCase.execute({
          userId: USER_ID,
          order: 'desc',
          page: 1,
          limit: LIMIT,
        }),
      ).rejects.toBeInstanceOf(UnexpectedListTransactionsError);
    });

    it('カテゴリの取得に失敗した場合は UnexpectedListTransactionsError になる', async () => {
      const useCase = createUseCase({
        transactionRepository: createTransactionRepo({
          listByUserIdImpl: async () => ({
            items: [makeItem({ categoryIds: [10] })],
            total: 1,
          }),
        }),
        categoryRepository: createCategoryRepo({
          findByIdsImpl: async () => {
            throw new Error('db error');
          },
        }),
      });

      await expect(
        useCase.execute({
          userId: USER_ID,
          order: 'desc',
          page: 1,
          limit: LIMIT,
        }),
      ).rejects.toBeInstanceOf(UnexpectedListTransactionsError);
    });
  });
});
