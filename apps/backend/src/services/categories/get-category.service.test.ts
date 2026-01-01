import { Container } from 'inversify';
import { describe, expect, it, vi } from 'vitest';

import type { UserCategoryRecord } from '../../domain/entities/category.entity';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import { TOKENS } from '../../infrastructre/di/tokens';
import { GetCategoryUseCase } from './get-category.service';
import {
  CategoryNotFoundError,
  InvalidCategoryIdError,
} from './read-category.errors';

describe('GetCategoryUseCase（カテゴリ単体取得）', () => {
  const fixedNow = new Date('2025-01-01T00:00:00.000Z');

  const makeUserCategoryRecord = (
    override?: Partial<UserCategoryRecord>,
  ): UserCategoryRecord => ({
    id: 1,
    name: '食費',
    type: 'EXPENSE',
    isDefault: false,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    isVisible: true,
    customName: null,
    displayOrder: 0,
    ...override,
  });

  const setup = (overrides?: Partial<ICategoryRepository>) => {
    const repo: ICategoryRepository = {
      create: vi.fn(),
      findById: vi.fn(async (_id: number) => null),
      findByName: vi.fn(async (_name: string) => null),
      findByUserId: vi.fn(async (_userId: number) => []),
      findAllWithPagination: vi.fn(async () => ({
        items: [],
        total: 0,
        page: 1,
        perPage: 30,
        totalPages: 0,
      })),
      findByIdWithUser: vi.fn(async (_id: number, _userId: number) => null),
      update: vi.fn(),
      ...overrides,
    };

    const container = new Container();
    container
      .bind<ICategoryRepository>(TOKENS.CategoryRepository)
      .toConstantValue(repo);
    container.bind<GetCategoryUseCase>(GetCategoryUseCase).toSelf();

    const useCase = container.get(GetCategoryUseCase);

    return { useCase, repo };
  };

  describe('正常系', () => {
    it('カテゴリIDとユーザーIDでカテゴリを取得できる', async () => {
      const category = makeUserCategoryRecord({ id: 1, name: '食費' });
      const { useCase, repo } = setup({
        findByIdWithUser: vi.fn(async () => category),
      });

      const result = await useCase.execute({ id: 1, userId: 1 });

      expect(repo.findByIdWithUser).toHaveBeenCalledWith(1, 1);
      expect(result.item.id).toBe(1);
      expect(result.item.name).toBe('食費');
    });

    it('カスタム名が設定されているカテゴリを取得できる', async () => {
      const category = makeUserCategoryRecord({
        id: 2,
        name: '光熱費',
        customName: 'マイ光熱費',
      });
      const { useCase, repo } = setup({
        findByIdWithUser: vi.fn(async () => category),
      });

      const result = await useCase.execute({ id: 2, userId: 1 });

      expect(result.item.customName).toBe('マイ光熱費');
    });

    it('非表示カテゴリも取得できる（権限があれば）', async () => {
      const category = makeUserCategoryRecord({
        id: 3,
        name: '旧カテゴリ',
        isVisible: false,
      });
      const { useCase, repo } = setup({
        findByIdWithUser: vi.fn(async () => category),
      });

      const result = await useCase.execute({ id: 3, userId: 1 });

      expect(result.item.isVisible).toBe(false);
    });
  });

  describe('異常系', () => {
    it('カテゴリIDが1以上の整数でない場合は例外になる（0）', async () => {
      const { useCase } = setup();

      await expect(
        useCase.execute({ id: 0, userId: 1 }),
      ).rejects.toBeInstanceOf(InvalidCategoryIdError);

      await expect(useCase.execute({ id: 0, userId: 1 })).rejects.toThrow(
        'カテゴリIDは1以上の整数である必要があります',
      );
    });

    it('カテゴリIDが1以上の整数でない場合は例外になる（負数）', async () => {
      const { useCase } = setup();

      await expect(
        useCase.execute({ id: -1, userId: 1 }),
      ).rejects.toBeInstanceOf(InvalidCategoryIdError);
    });

    it('カテゴリIDが1以上の整数でない場合は例外になる（小数）', async () => {
      const { useCase } = setup();

      await expect(
        useCase.execute({ id: 1.5, userId: 1 }),
      ).rejects.toBeInstanceOf(InvalidCategoryIdError);
    });

    it('カテゴリが存在しない場合は例外になる', async () => {
      const { useCase, repo } = setup({
        findByIdWithUser: vi.fn(async () => null),
      });

      await expect(
        useCase.execute({ id: 999, userId: 1 }),
      ).rejects.toBeInstanceOf(CategoryNotFoundError);

      await expect(useCase.execute({ id: 999, userId: 1 })).rejects.toThrow(
        'カテゴリID 999 が見つかりません',
      );
    });

    it('他のユーザーのカテゴリは取得できない（リポジトリがnullを返す）', async () => {
      const { useCase, repo } = setup({
        findByIdWithUser: vi.fn(async () => null),
      });

      await expect(
        useCase.execute({ id: 1, userId: 999 }),
      ).rejects.toBeInstanceOf(CategoryNotFoundError);

      expect(repo.findByIdWithUser).toHaveBeenCalledWith(1, 999);
    });
  });
});
