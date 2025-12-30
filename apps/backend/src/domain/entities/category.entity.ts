// Domain Layer: Category Entity (集約ルート)
// ビジネスルールとライフサイクル管理を担当

import type { CategoryName } from '../values/category-name';
import { DomainError } from '../values/domain-error';
import type { CategoryId, UserId } from '../values/indentity';
import { createId } from '../values/indentity';
import type { TransactionType } from './transaction-type.entity';

// =====================================
// エンティティエラー
// =====================================

export class CategoryDomainError extends DomainError {
  constructor(message: string) {
    super(message, 'CategoryDomainError');
  }
}

// =====================================
// Category Entity (集約ルート)
// =====================================

export class Category {
  private constructor(
    private readonly _id: CategoryId,
    private _name: CategoryName,
    private readonly _type: TransactionType,
    private readonly _isDefault: boolean,
    private readonly _userId: UserId | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // =====================================
  // ファクトリメソッド
  // =====================================

  /**
   * 新規カテゴリを生成(IDは数値から生成)
   */
  static create(
    idValue: number,
    name: CategoryName,
    type: TransactionType,
    isDefault: boolean,
    userIdValue: number | null,
  ): Category {
    const id = createId<CategoryId>(idValue, 'CategoryId');
    const uid =
      userIdValue !== null ? createId<UserId>(userIdValue, 'UserId') : null;
    const now = new Date();
    return new Category(id, name, type, isDefault, uid, now, now);
  }

  /**
   * 既存カテゴリを再構築(永続化層から復元する際に使用)
   */
  static reconstruct(
    idValue: number,
    name: CategoryName,
    type: TransactionType,
    isDefault: boolean,
    userIdValue: number | null,
    createdAt: Date,
    updatedAt: Date,
  ): Category {
    const id = createId<CategoryId>(idValue, 'CategoryId');
    const uid =
      userIdValue !== null ? createId<UserId>(userIdValue, 'UserId') : null;
    return new Category(id, name, type, isDefault, uid, createdAt, updatedAt);
  }

  // =====================================
  // ゲッター
  // =====================================

  get id(): CategoryId {
    return this._id;
  }

  get name(): CategoryName {
    return this._name;
  }

  get type(): TransactionType {
    return this._type;
  }

  get isDefault(): boolean {
    return this._isDefault;
  }

  get userId(): UserId | null {
    return this._userId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // =====================================
  // ビジネスロジック
  // =====================================

  /**
   * カテゴリ名を更新する
   * ビジネスルール: デフォルトカテゴリは名前変更不可
   */
  updateName(newName: CategoryName): void {
    if (this._isDefault) {
      throw new CategoryDomainError('デフォルトカテゴリの名前は変更できません');
    }
    this._name = newName;
    this._updatedAt = new Date();
  }

  /**
   * カテゴリが削除可能かチェック
   * ビジネスルール: デフォルトカテゴリは削除不可
   */
  canDelete(): boolean {
    return !this._isDefault;
  }

  /**
   * 特定のユーザーがこのカテゴリを編集可能かチェック
   * ビジネスルール: カスタムカテゴリは作成ユーザーのみ編集可
   */
  canEditBy(userId: UserId): boolean {
    // デフォルトカテゴリは誰も編集不可
    if (this._isDefault) {
      return false;
    }
    // カスタムカテゴリは作成者のみ編集可
    return this._userId !== null && this._userId === userId;
  }

  /**
   * 特定のユーザーがこのカテゴリを利用可能かチェック
   * ビジネスルール:
   * - userId = null → 全ユーザーが利用可能(デフォルトカテゴリ)
   * - userId = 特定ID → そのユーザーのみ利用可能(カスタムカテゴリ)
   */
  isAvailableFor(userId: UserId): boolean {
    // デフォルトカテゴリ(userId = null)は全ユーザーが利用可能
    if (this._userId === null) {
      return true;
    }
    // カスタムカテゴリは作成者のみ利用可能
    return this._userId === userId;
  }

  /**
   * このカテゴリが共通カテゴリか判定
   */
  isCommonCategory(): boolean {
    return this._userId === null;
  }

  /**
   * このカテゴリがカスタムカテゴリか判定
   */
  isCustomCategory(): boolean {
    return this._userId !== null;
  }
}

// =====================================
// 永続化/ユースケース向けのDTO型
// =====================================

export type CategoryRecord = {
  id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UserCategoryRecord = CategoryRecord & {
  isVisible: boolean;
  customName: string | null;
  displayOrder: number;
};

export type CreateCategoryData = {
  name: string;
  typeId: number;
};
