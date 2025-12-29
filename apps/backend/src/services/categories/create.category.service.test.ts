import { Container } from 'inversify';
import { describe, expect, it, vi } from 'vitest';

import type {
  CategoryRecord,
  CreateCategoryData,
} from '../../domain/entities/category.entity';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import { TOKENS } from '../../infrastructre/di/tokens';
import { CreateCategoryUseCase } from './create.category.service';
import {
  DuplicateCategoryError,
  InvalidCategoryNameError,
  InvalidTypeIdError,
} from './create-category.errors';

describe('CreateCategoryUseCase（カテゴリ作成）', () => {
  const fixedNow = new Date('2025-01-01T00:00:00.000Z');

  const makeRecord = (override?: Partial<CategoryRecord>): CategoryRecord => ({
    id: 1,
    name: '光熱費',
    type: 'EXPENSE',
    isDefault: false,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...override,
  });

  const setup = (overrides?: Partial<ICategoryRepository>) => {
    const repo: ICategoryRepository = {
      create: vi.fn(async (_data: CreateCategoryData, _userId: number) =>
        makeRecord(),
      ),
      findById: vi.fn(async (_id: number) => null),
      findByName: vi.fn(async (_name: string) => null),
      findByUserId: vi.fn(async (_userId: number) => []),
      ...overrides,
    };

    const container = new Container();
    container
      .bind<ICategoryRepository>(TOKENS.CategoryRepository)
      .toConstantValue(repo);
    container.bind<CreateCategoryUseCase>(CreateCategoryUseCase).toSelf();

    const useCase = container.get(CreateCategoryUseCase);

    return { useCase, repo };
  };

  describe('正常系', () => {
    it('カテゴリを作成できる（nameはトリムされる）', async () => {
      const { useCase, repo } = setup({
        create: vi.fn(async (data: CreateCategoryData, _userId: number) =>
          makeRecord({ name: data.name }),
        ),
      });

      const result = await useCase.execute({
        name: '  サブスク費  ',
        typeId: 2,
        userId: 1,
      });

      expect(repo.findByName).toHaveBeenCalledWith('サブスク費');
      expect(repo.create).toHaveBeenCalledWith(
        { name: 'サブスク費', typeId: 2 },
        1,
      );
      expect(result.name).toBe('サブスク費');
    });
  });

  describe('異常系', () => {
    it('typeId が1以上の整数でない場合は例外になる（0）', async () => {
      const { useCase } = setup();

      await expect(
        useCase.execute({ name: '食費', typeId: 0, userId: 1 }),
      ).rejects.toBeInstanceOf(InvalidTypeIdError);

      await expect(
        useCase.execute({ name: '食費', typeId: 0, userId: 1 }),
      ).rejects.toThrow('取引種別ID(typeId)は1以上の整数である必要があります');
    });

    it('typeId が1以上の整数でない場合は例外になる（小数）', async () => {
      const { useCase } = setup();

      await expect(
        useCase.execute({ name: '食費', typeId: 1.1, userId: 1 }),
      ).rejects.toBeInstanceOf(InvalidTypeIdError);

      await expect(
        useCase.execute({ name: '食費', typeId: 1.1, userId: 1 }),
      ).rejects.toThrow('取引種別ID(typeId)は1以上の整数である必要があります');
    });

    it('同名カテゴリが既に存在する場合は例外になる', async () => {
      const { useCase } = setup({
        findByName: vi.fn(async () => makeRecord({ name: '食費' })),
      });

      await expect(
        useCase.execute({ name: '食費', typeId: 2, userId: 1 }),
      ).rejects.toBeInstanceOf(DuplicateCategoryError);

      await expect(
        useCase.execute({ name: '食費', typeId: 2, userId: 1 }),
      ).rejects.toThrow('既に存在します');
    });

    it('カテゴリ名が不正（空）な場合は例外になる', async () => {
      const { useCase } = setup();

      await expect(
        useCase.execute({ name: '   ', typeId: 2, userId: 1 }),
      ).rejects.toBeInstanceOf(InvalidCategoryNameError);

      await expect(
        useCase.execute({ name: '   ', typeId: 2, userId: 1 }),
      ).rejects.toThrow('カテゴリ名は必須です');
    });
  });
});
