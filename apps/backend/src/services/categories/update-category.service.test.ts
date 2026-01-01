import { Container } from 'inversify';
import { describe, expect, it, vi } from 'vitest';

import type { UserCategoryRecord } from '../../domain/entities/category.entity';
import type {
  ICategoryRepository,
  UpdateCategoryData,
} from '../../domain/repositories/category.repository.interface';
import { TOKENS } from '../../infrastructre/di/tokens';
import {
  CategoryNotFoundError,
  DefaultCategoryUpdateForbiddenError,
  InvalidUpdateDataError,
} from './update-category.errors';
import { UpdateCategoryUseCase } from './update-category.service';

describe('UpdateCategoryUseCase（カテゴリ更新）', () => {
  const fixedNow = new Date('2025-01-01T00:00:00.000Z');

  const makeUserCategoryRecord = (
    override?: Partial<UserCategoryRecord>,
  ): UserCategoryRecord => ({
    id: 1,
    name: '光熱費',
    type: 'EXPENSE',
    isDefault: false,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    isVisible: true,
    customName: null,
    displayOrder: 0,
    ...override,
  });

  const makeCategoryRecord = (override?: Partial<UserCategoryRecord>) => ({
    id: 1,
    name: '光熱費',
    type: 'EXPENSE' as const,
    isDefault: false,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...override,
  });

  const setup = (overrides?: Partial<ICategoryRepository>) => {
    const repo: ICategoryRepository = {
      create: vi.fn(),
      findById: vi.fn(async (_id: number) => makeCategoryRecord()),
      findByName: vi.fn(async (_name: string) => null),
      findByUserId: vi.fn(async (_userId: number) => []),
      findAllWithPagination: vi.fn(async () => ({
        items: [],
        total: 0,
        page: 1,
        perPage: 30,
        totalPages: 0,
      })),
      findByIdWithUser: vi.fn(async (_id: number, _userId: number) =>
        makeUserCategoryRecord(),
      ),
      update: vi.fn(
        async (
          _categoryId: number,
          _userId: number,
          data: UpdateCategoryData,
        ) => makeUserCategoryRecord(data),
      ),
      ...overrides,
    };

    const container = new Container();
    container
      .bind<ICategoryRepository>(TOKENS.CategoryRepository)
      .toConstantValue(repo);
    container.bind<UpdateCategoryUseCase>(UpdateCategoryUseCase).toSelf();

    const useCase = container.get(UpdateCategoryUseCase);

    return { useCase, repo };
  };

  describe('正常系', () => {
    it('isVisible を更新できる', async () => {
      const { useCase, repo } = setup({
        update: vi.fn(async (_categoryId, _userId, data) =>
          makeUserCategoryRecord({ isVisible: data.isVisible }),
        ),
      });

      const result = await useCase.execute({
        categoryId: 1,
        userId: 1,
        isVisible: false,
      });

      expect(repo.findByIdWithUser).toHaveBeenCalledWith(1, 1);
      expect(repo.findById).toHaveBeenCalledWith(1);
      expect(repo.update).toHaveBeenCalledWith(1, 1, { isVisible: false });
      expect(result.isVisible).toBe(false);
    });

    it('customName を設定できる', async () => {
      const { useCase, repo } = setup({
        update: vi.fn(async (_categoryId, _userId, data) =>
          makeUserCategoryRecord({ customName: data.customName ?? null }),
        ),
      });

      const result = await useCase.execute({
        categoryId: 1,
        userId: 1,
        customName: 'マイカスタム',
      });

      expect(repo.update).toHaveBeenCalledWith(1, 1, {
        customName: 'マイカスタム',
      });
      expect(result.customName).toBe('マイカスタム');
    });

    it('customName の空文字は null に正規化される', async () => {
      const { useCase, repo } = setup({
        update: vi.fn(async (_categoryId, _userId, data) =>
          makeUserCategoryRecord({ customName: data.customName ?? null }),
        ),
      });

      await useCase.execute({
        categoryId: 1,
        userId: 1,
        customName: '   ',
      });

      expect(repo.update).toHaveBeenCalledWith(1, 1, { customName: null });
    });

    it('displayOrder を更新できる', async () => {
      const { useCase, repo } = setup({
        update: vi.fn(async (_categoryId, _userId, data) =>
          makeUserCategoryRecord({ displayOrder: data.displayOrder ?? 0 }),
        ),
      });

      const result = await useCase.execute({
        categoryId: 1,
        userId: 1,
        displayOrder: 5,
      });

      expect(repo.update).toHaveBeenCalledWith(1, 1, { displayOrder: 5 });
      expect(result.displayOrder).toBe(5);
    });

    it('複数フィールドを同時に更新できる', async () => {
      const { useCase, repo } = setup({
        update: vi.fn(async (_categoryId, _userId, data) =>
          makeUserCategoryRecord({
            isVisible: data.isVisible,
            customName: data.customName ?? null,
            displayOrder: data.displayOrder ?? 0,
          }),
        ),
      });

      const result = await useCase.execute({
        categoryId: 1,
        userId: 1,
        isVisible: false,
        customName: 'カスタム名',
        displayOrder: 10,
      });

      expect(repo.update).toHaveBeenCalledWith(1, 1, {
        isVisible: false,
        customName: 'カスタム名',
        displayOrder: 10,
      });
      expect(result.isVisible).toBe(false);
      expect(result.customName).toBe('カスタム名');
      expect(result.displayOrder).toBe(10);
    });
  });

  describe('異常系', () => {
    it('存在しないカテゴリIDの場合は例外になる', async () => {
      const { useCase } = setup({
        findByIdWithUser: vi.fn(async () => null),
      });

      await expect(
        useCase.execute({
          categoryId: 999,
          userId: 1,
          isVisible: false,
        }),
      ).rejects.toBeInstanceOf(CategoryNotFoundError);

      await expect(
        useCase.execute({
          categoryId: 999,
          userId: 1,
          isVisible: false,
        }),
      ).rejects.toThrow('カテゴリ（ID: 999）が見つかりません');
    });

    it('デフォルトカテゴリの更新は禁止される', async () => {
      const { useCase } = setup({
        findById: vi.fn(async () => makeCategoryRecord({ isDefault: true })),
      });

      await expect(
        useCase.execute({
          categoryId: 1,
          userId: 1,
          isVisible: false,
        }),
      ).rejects.toBeInstanceOf(DefaultCategoryUpdateForbiddenError);

      await expect(
        useCase.execute({
          categoryId: 1,
          userId: 1,
          isVisible: false,
        }),
      ).rejects.toThrow('デフォルトカテゴリは更新できません');
    });

    it('更新データが空の場合は例外になる', async () => {
      const { useCase } = setup();

      await expect(
        useCase.execute({
          categoryId: 1,
          userId: 1,
        }),
      ).rejects.toBeInstanceOf(InvalidUpdateDataError);

      await expect(
        useCase.execute({
          categoryId: 1,
          userId: 1,
        }),
      ).rejects.toThrow('更新するデータが指定されていません');
    });

    it('displayOrder が負の数の場合は例外になる', async () => {
      const { useCase } = setup();

      await expect(
        useCase.execute({
          categoryId: 1,
          userId: 1,
          displayOrder: -1,
        }),
      ).rejects.toBeInstanceOf(InvalidUpdateDataError);

      await expect(
        useCase.execute({
          categoryId: 1,
          userId: 1,
          displayOrder: -1,
        }),
      ).rejects.toThrow('表示順は0以上の整数である必要があります');
    });

    it('displayOrder が整数でない場合は例外になる', async () => {
      const { useCase } = setup();

      await expect(
        useCase.execute({
          categoryId: 1,
          userId: 1,
          displayOrder: 1.5,
        }),
      ).rejects.toBeInstanceOf(InvalidUpdateDataError);

      await expect(
        useCase.execute({
          categoryId: 1,
          userId: 1,
          displayOrder: 1.5,
        }),
      ).rejects.toThrow('表示順は0以上の整数である必要があります');
    });
  });
});
