import type { NodePgDatabase } from '@account-book-app/db';
import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TransactionRecord } from '../../domain/entities/transaction.entity';
import { TOKENS } from '../../infrastructre/di/tokens';
import {
  CategoryNotFoundError,
  InvalidAmountError,
  InvalidDateFormatError,
  InvalidTransactionTypeError,
  TransactionTitleRequiredError,
} from '../../services/transactions/create-transaction.errors';

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
  });
});
