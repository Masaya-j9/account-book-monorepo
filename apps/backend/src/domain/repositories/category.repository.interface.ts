// Domain Layer: Repository Interface
// インフラストラクチャ層への依存を抽象化

import type {
  CategoryRecord,
  CreateCategoryData,
} from '../entities/category.entity';

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
}
