import type { NodePgDatabase } from '@account-book-app/db';
import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TransactionRecord } from '../../domain/entities/transaction.entity';
import { TOKENS } from '../../infrastructre/di/tokens';
import {
  CategoryNotFoundError,
  CategoryTypeMismatchError,
  InvalidAmountError,
  InvalidDateFormatError,
  InvalidTransactionTypeError,
  TransactionTitleRequiredError,
} from '../../services/transactions/create-transaction.errors';
import { InvalidPaginationError } from '../../services/transactions/list-transactions.errors';
import {
  CategoriesNotFoundError,
  InvalidCategoryIdsError,
  NotOwnerError,
  TransactionNotFoundError,
} from '../../services/transactions/update-transaction.errors';

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

vi.mock('../../infrastructre/di/container', () => ({
  createRequestContainer: createRequestContainerMock,
}));

import { transactionRouter } from './transaction.router';

const fixedNow = new Date('2025-01-01T00:00:00.000Z');

const makeTransactionRecord = (
  override?: Partial<TransactionRecord>,
): TransactionRecord => ({
  id: 1,
  userId: 1,
  type: 'EXPENSE',
  title: 'ランチ',
  amount: 1000,
  currency: 'JPY',
  date: '2025-01-01',
  categoryId: 10,
  memo: '',
  createdAt: fixedNow,
  updatedAt: fixedNow,
  ...override,
});

describe('transactionRouter（取引ルーター）', () => {
  const db = {} as unknown as NodePgDatabase;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('認証済みの場合、取引を作成できる（outputの整形が行われる）', async () => {
    executeMock.mockResolvedValueOnce(
      makeTransactionRecord({
        id: 99,
        userId: 1,
        type: 'EXPENSE',
        title: 'カフェ',
        amount: 450,
        currency: 'JPY',
        date: '2025-01-01',
        categoryId: 10,
        memo: 'テイクアウト',
      }),
    );

    const caller = transactionRouter.createCaller({ db, userId: 1 });
    const result = await caller.create({
      type: 'EXPENSE',
      title: 'カフェ',
      amount: 450,
      date: '2025-01-01',
      categoryId: 10,
      memo: 'テイクアウト',
    });

    expect(createRequestContainerMock).toHaveBeenCalledWith(db);
    expect(getMock).toHaveBeenCalledWith(TOKENS.CreateTransactionUseCase);
    expect(executeMock).toHaveBeenCalledWith({
      userId: 1,
      type: 'EXPENSE',
      title: 'カフェ',
      amount: 450,
      date: '2025-01-01',
      categoryId: 10,
      memo: 'テイクアウト',
    });

    // output schema により createdAt/updatedAt は落ちる（presentation層の責務）
    expect(result).toEqual({
      transaction: {
        id: 99,
        userId: 1,
        type: 'EXPENSE',
        title: 'カフェ',
        amount: 450,
        currency: 'JPY',
        date: '2025-01-01',
        categoryId: 10,
        memo: 'テイクアウト',
      },
    });
  });

  it('認証済みの場合、取引一覧を取得できる', async () => {
    executeMock.mockResolvedValueOnce({
      transactions: [
        {
          id: 1,
          userId: 1,
          type: 'EXPENSE',
          title: 'ランチ',
          amount: 1000,
          currencyCode: 'JPY',
          date: '2025-01-01',
          categories: [
            { id: 10, name: '食費', type: 'EXPENSE', isDefault: false },
          ],
          memo: null,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    const caller = transactionRouter.createCaller({ db, userId: 1 });
    const result = await caller.list({
      page: 1,
      limit: 20,
    });

    expect(createRequestContainerMock).toHaveBeenCalledWith(db);
    expect(getMock).toHaveBeenCalledWith(TOKENS.ListTransactionsUseCase);
    expect(executeMock).toHaveBeenCalledWith({
      userId: 1,
      startDate: undefined,
      endDate: undefined,
      type: undefined,
      categoryIds: undefined,
      order: 'desc',
      page: 1,
      limit: 20,
    });

    expect(result).toEqual({
      transactions: [
        {
          id: 1,
          userId: 1,
          type: 'EXPENSE',
          title: 'ランチ',
          amount: 1000,
          currencyCode: 'JPY',
          date: '2025-01-01',
          categories: [
            { id: 10, name: '食費', type: 'EXPENSE', isDefault: false },
          ],
          memo: null,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
  });

  describe('異常系', () => {
    it('未認証の場合は UNAUTHORIZED になる', async () => {
      const caller = transactionRouter.createCaller({ db });

      await expect(
        caller.create({
          type: 'EXPENSE',
          title: 'カフェ',
          amount: 450,
          date: '2025-01-01',
          categoryId: 10,
        }),
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });

      await expect(
        caller.list({
          page: 1,
          limit: 20,
        }),
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });

      await expect(
        caller.update({
          id: 1,
        }),
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('入力スキーマに違反する場合は usecase が呼ばれない', async () => {
      const caller = transactionRouter.createCaller({ db, userId: 1 });

      await expect(
        caller.create({
          type: 'EXPENSE',
          title: '',
          amount: 450,
          date: '2025-01-01',
          categoryId: 10,
        }),
      ).rejects.toBeInstanceOf(TRPCError);
      expect(executeMock).not.toHaveBeenCalled();

      await expect(
        caller.list({
          page: 0,
          limit: 20,
        }),
      ).rejects.toBeInstanceOf(TRPCError);
      expect(executeMock).not.toHaveBeenCalled();

      await expect(
        caller.update({
          id: 0,
        }),
      ).rejects.toBeInstanceOf(TRPCError);
      expect(executeMock).not.toHaveBeenCalled();
    });

    it('カテゴリが見つからない場合は NOT_FOUND に変換される', async () => {
      executeMock.mockRejectedValueOnce(new CategoryNotFoundError(999));

      const caller = transactionRouter.createCaller({ db, userId: 1 });

      await expect(
        caller.create({
          type: 'EXPENSE',
          title: 'カフェ',
          amount: 450,
          date: '2025-01-01',
          categoryId: 999,
        }),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('バリデーション系メッセージは BAD_REQUEST に変換される（種別/金額/日付）', async () => {
      executeMock.mockRejectedValueOnce(new InvalidTransactionTypeError('XXX'));

      const caller = transactionRouter.createCaller({ db, userId: 1 });

      await expect(
        caller.create({
          type: 'EXPENSE',
          title: 'カフェ',
          amount: 450,
          date: '2025-01-01',
          categoryId: 10,
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });

      executeMock.mockRejectedValueOnce(new InvalidAmountError(-1));
      await expect(
        caller.create({
          type: 'EXPENSE',
          title: 'カフェ',
          amount: 450,
          date: '2025-01-01',
          categoryId: 10,
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });

      executeMock.mockRejectedValueOnce(
        new InvalidDateFormatError('2025/01/01'),
      );
      await expect(
        caller.create({
          type: 'EXPENSE',
          title: 'カフェ',
          amount: 450,
          date: '2025-01-01',
          categoryId: 10,
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });

      executeMock.mockRejectedValueOnce(new TransactionTitleRequiredError());
      await expect(
        caller.create({
          type: 'EXPENSE',
          title: 'カフェ',
          amount: 450,
          date: '2025-01-01',
          categoryId: 10,
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('想定外の例外は INTERNAL_SERVER_ERROR に変換される', async () => {
      executeMock.mockRejectedValueOnce(new Error('boom'));

      const caller = transactionRouter.createCaller({ db, userId: 1 });
      const error = await caller
        .create({
          type: 'EXPENSE',
          title: 'カフェ',
          amount: 450,
          date: '2025-01-01',
          categoryId: 10,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(TRPCError);
      expect(error).toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: '取引の作成に失敗しました',
      });
    });

    it('update の想定外例外は INTERNAL_SERVER_ERROR に変換される', async () => {
      executeMock.mockRejectedValueOnce(new Error('boom'));

      const caller = transactionRouter.createCaller({ db, userId: 1 });
      const error = await caller
        .update({
          id: 1,
          title: '更新タイトル',
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(TRPCError);
      expect(error).toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: '取引の更新に失敗しました',
      });
    });

    it('ページネーションの不正は BAD_REQUEST に変換される', async () => {
      executeMock.mockRejectedValueOnce(
        new InvalidPaginationError('page は1以上'),
      );

      const caller = transactionRouter.createCaller({ db, userId: 1 });

      await expect(
        caller.list({
          page: 1,
          limit: 20,
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('list の想定外例外は INTERNAL_SERVER_ERROR に変換される', async () => {
      executeMock.mockRejectedValueOnce(new Error('boom'));

      const caller = transactionRouter.createCaller({ db, userId: 1 });
      const error = await caller
        .list({
          page: 1,
          limit: 20,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(TRPCError);
      expect(error).toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: '取引一覧の取得に失敗しました',
      });
    });
  });

  it('認証済みの場合、取引を更新できる', async () => {
    executeMock.mockResolvedValueOnce({
      transaction: {
        id: 1,
        userId: 1,
        type: 'EXPENSE',
        title: '更新タイトル',
        amount: 1200,
        currencyCode: 'JPY',
        date: '2025-01-01',
        categories: [
          { id: 10, name: '食費', type: 'EXPENSE', isDefault: false },
        ],
        memo: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    });

    const caller = transactionRouter.createCaller({ db, userId: 1 });
    const result = await caller.update({
      id: 1,
      title: '更新タイトル',
      categoryIds: [10],
    });

    expect(createRequestContainerMock).toHaveBeenCalledWith(db);
    expect(getMock).toHaveBeenCalledWith(TOKENS.UpdateTransactionUseCase);
    expect(executeMock).toHaveBeenCalledWith({
      userId: 1,
      id: 1,
      type: undefined,
      title: '更新タイトル',
      amount: undefined,
      date: undefined,
      categoryIds: [10],
      memo: undefined,
    });

    expect(result).toEqual({
      transaction: {
        id: 1,
        userId: 1,
        type: 'EXPENSE',
        title: '更新タイトル',
        amount: 1200,
        currencyCode: 'JPY',
        date: '2025-01-01',
        categories: [
          { id: 10, name: '食費', type: 'EXPENSE', isDefault: false },
        ],
        memo: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    });
  });

  describe('update（異常系）', () => {
    it('取引が見つからない場合は NOT_FOUND に変換される', async () => {
      executeMock.mockRejectedValueOnce(new TransactionNotFoundError(999));

      const caller = transactionRouter.createCaller({ db, userId: 1 });

      await expect(
        caller.update({
          id: 999,
          title: '更新タイトル',
        }),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('権限がない場合は FORBIDDEN に変換される', async () => {
      executeMock.mockRejectedValueOnce(new NotOwnerError());

      const caller = transactionRouter.createCaller({ db, userId: 1 });

      await expect(
        caller.update({
          id: 1,
          title: '更新タイトル',
        }),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('カテゴリが見つからない場合は NOT_FOUND に変換される', async () => {
      executeMock.mockRejectedValueOnce(new CategoriesNotFoundError([999]));

      const caller = transactionRouter.createCaller({ db, userId: 1 });

      await expect(
        caller.update({
          id: 1,
          categoryIds: [999],
        }),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('バリデーション系メッセージは BAD_REQUEST に変換される（カテゴリID/種別不一致）', async () => {
      executeMock.mockRejectedValueOnce(new InvalidCategoryIdsError());

      const caller = transactionRouter.createCaller({ db, userId: 1 });

      await expect(
        caller.update({
          id: 1,
          categoryIds: [10],
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });

      executeMock.mockRejectedValueOnce(
        new CategoryTypeMismatchError('INCOME', 'EXPENSE'),
      );

      await expect(
        caller.update({
          id: 1,
          type: 'INCOME',
          categoryIds: [10],
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });
  });
});
