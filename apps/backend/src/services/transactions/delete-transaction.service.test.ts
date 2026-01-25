import { Container } from 'inversify';
import { describe, expect, it, vi } from 'vitest';

import type { TransactionRecord } from '../../domain/entities/transaction.entity';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';
import { TOKENS } from '../di/tokens';
import {
  NotOwnerError,
  TransactionNotFoundError,
  UnexpectedDeleteTransactionError,
} from './delete-transaction.errors';
import { DeleteTransactionUseCase } from './delete-transaction.service';

describe('DeleteTransactionUseCase（取引削除）', () => {
  const fixedCreatedAt = new Date('2026-01-01T00:00:00.000Z');
  const fixedUpdatedAt = new Date('2026-01-02T00:00:00.000Z');

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
  ) => {
    const container = new Container();
    container
      .bind<ITransactionRepository>(TOKENS.TransactionRepository)
      .toConstantValue(mockTransactionRepo as ITransactionRepository);
    container.bind(DeleteTransactionUseCase).toSelf();
    return container;
  };

  describe('正常系', () => {
    it('所有者が一致する場合は論理削除できる', async () => {
      const mockTransactionRepo = {
        findById: vi.fn().mockResolvedValue(makeTransactionRecord()),
        delete: vi.fn().mockResolvedValue(undefined),
      };

      const container = createMockContainer(mockTransactionRepo);
      const useCase = container.get(DeleteTransactionUseCase);

      const output = await useCase.execute({ userId: 100, id: 1 });

      expect(mockTransactionRepo.findById).toHaveBeenCalledWith(1);
      expect(mockTransactionRepo.delete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
      );
      expect(output).toEqual({ deleted: true });
    });
  });

  describe('異常系', () => {
    it('取引が見つからない場合は例外になる', async () => {
      const mockTransactionRepo = {
        findById: vi.fn().mockResolvedValue(null),
      };

      const container = createMockContainer(mockTransactionRepo);
      const useCase = container.get(DeleteTransactionUseCase);

      await expect(
        useCase.execute({ userId: 100, id: 999 }),
      ).rejects.toBeInstanceOf(TransactionNotFoundError);
    });

    it('所有者が一致しない場合は例外になる', async () => {
      const mockTransactionRepo = {
        findById: vi
          .fn()
          .mockResolvedValue(makeTransactionRecord({ userId: 999 })),
      };

      const container = createMockContainer(mockTransactionRepo);
      const useCase = container.get(DeleteTransactionUseCase);

      await expect(
        useCase.execute({ userId: 100, id: 1 }),
      ).rejects.toBeInstanceOf(NotOwnerError);
    });

    it('削除処理が失敗した場合は例外になる', async () => {
      const mockTransactionRepo = {
        findById: vi.fn().mockResolvedValue(makeTransactionRecord()),
        delete: vi.fn().mockRejectedValue(new Error('boom')),
      };

      const container = createMockContainer(mockTransactionRepo);
      const useCase = container.get(DeleteTransactionUseCase);

      await expect(
        useCase.execute({ userId: 100, id: 1 }),
      ).rejects.toBeInstanceOf(UnexpectedDeleteTransactionError);
    });
  });
});
