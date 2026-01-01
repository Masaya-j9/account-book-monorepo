// Domain Layer: Repository Interface
// インフラストラクチャ層への依存を抽象化

import type {
  CategoryRecord,
  CreateCategoryData,
  UserCategoryRecord,
} from '../entities/category.entity';

export type FindAllOptions = {
  userId: number;
  page: number;
  perPage: number;
  sortBy?: 'name' | 'createdAt' | 'displayOrder';
  sortOrder?: 'asc' | 'desc';
  type?: 'INCOME' | 'EXPENSE';
  includeHidden?: boolean;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type UpdateCategoryData = {
  isVisible?: boolean;
  customName?: string | null;
  displayOrder?: number;
};

export interface ICategoryRepository {
  /**
   * カテゴリを作成する
   */
  create(data: CreateCategoryData, userId: number): Promise<CategoryRecord>;

  /**
   * IDでカテゴリを取得する
   */
  findById(id: number): Promise<CategoryRecord | null>;

  /**
   * 名前でカテゴリを検索する（重複チェック用）
   */
  findByName(name: string): Promise<CategoryRecord | null>;

  /**
   * ユーザーのカテゴリ一覧を取得する
   */
  findByUserId(userId: number): Promise<CategoryRecord[]>;

  /**
   * ページネーション付きでカテゴリ一覧を取得する
   */
  findAllWithPagination(
    options: FindAllOptions,
  ): Promise<PaginatedResult<UserCategoryRecord>>;

  /**
   * IDでカテゴリを取得する（ユーザーカテゴリ情報付き）
   */
  findByIdWithUser(
    id: number,
    userId: number,
  ): Promise<UserCategoryRecord | null>;

  /**
   * カテゴリを更新する（user_categories情報のみ更新）
   */
  update(
    categoryId: number,
    userId: number,
    data: UpdateCategoryData,
  ): Promise<UserCategoryRecord>;
}
