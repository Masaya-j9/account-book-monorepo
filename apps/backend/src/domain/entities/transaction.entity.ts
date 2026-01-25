// Domain Layer: Transaction Entity (集約ルート)
// 取引のビジネスルールとライフサイクル管理を担当

import { DomainError } from '../values/domain-error';
import type { CategoryId, TransactionId, UserId } from '../values/indentity';
import { createId } from '../values/indentity';
import type { Money } from '../values/money';
import type { TransactionDate } from '../values/transaction-date';

// =====================================
// エンティティエラー
// =====================================

export class TransactionDomainError extends DomainError {
  constructor(message: string) {
    super(message, 'TransactionDomainError');
  }
}

// =====================================
// Transaction Entity (集約ルート)
// =====================================

export class Transaction {
  private constructor(
    private readonly _id: TransactionId,
    private readonly _userId: UserId,
    private readonly _type: 'INCOME' | 'EXPENSE',
    private _title: string,
    private _amount: Money,
    private _date: TransactionDate,
    private _categoryId: CategoryId,
    private _memo: string,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // =====================================
  // ファクトリメソッド
  // =====================================

  /**
   * 新規取引を生成
   */
  static create(
    idValue: number,
    userIdValue: number,
    type: 'INCOME' | 'EXPENSE',
    title: string,
    amount: Money,
    date: TransactionDate,
    categoryIdValue: number,
    memo: string,
  ): Transaction {
    // タイトルのバリデーション
    if (!title || title.trim().length === 0) {
      throw new TransactionDomainError('タイトルは必須です');
    }
    if (title.length > 100) {
      throw new TransactionDomainError(
        'タイトルは100文字以内である必要があります',
      );
    }

    // 金額のバリデーション
    if (amount.isZero()) {
      throw new TransactionDomainError('金額は0より大きい必要があります');
    }

    // 日付のバリデーション（未来日を許可しない）
    if (date.isFuture()) {
      throw new TransactionDomainError('未来日の取引は登録できません');
    }

    // メモのバリデーション
    if (memo.length > 500) {
      throw new TransactionDomainError('メモは500文字以内である必要があります');
    }

    const id = createId<TransactionId>(idValue, 'TransactionId');
    const userId = createId<UserId>(userIdValue, 'UserId');
    const categoryId = createId<CategoryId>(categoryIdValue, 'CategoryId');
    const now = new Date();

    return new Transaction(
      id,
      userId,
      type,
      title.trim(),
      amount,
      date,
      categoryId,
      memo.trim(),
      now,
      now,
    );
  }

  /**
   * 既存取引を再構築(永続化層から復元する際に使用)
   */
  static reconstruct(
    idValue: number,
    userIdValue: number,
    type: 'INCOME' | 'EXPENSE',
    title: string,
    amount: Money,
    date: TransactionDate,
    categoryIdValue: number,
    memo: string,
    createdAt: Date,
    updatedAt: Date,
  ): Transaction {
    const id = createId<TransactionId>(idValue, 'TransactionId');
    const userId = createId<UserId>(userIdValue, 'UserId');
    const categoryId = createId<CategoryId>(categoryIdValue, 'CategoryId');

    return new Transaction(
      id,
      userId,
      type,
      title,
      amount,
      date,
      categoryId,
      memo,
      createdAt,
      updatedAt,
    );
  }

  // =====================================
  // ゲッター
  // =====================================

  get id(): TransactionId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get type(): 'INCOME' | 'EXPENSE' {
    return this._type;
  }

  get title(): string {
    return this._title;
  }

  get amount(): Money {
    return this._amount;
  }

  get date(): TransactionDate {
    return this._date;
  }

  get categoryId(): CategoryId {
    return this._categoryId;
  }

  get memo(): string {
    return this._memo;
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
   * タイトルを更新する
   */
  updateTitle(newTitle: string): void {
    if (!newTitle || newTitle.trim().length === 0) {
      throw new TransactionDomainError('タイトルは必須です');
    }
    if (newTitle.length > 100) {
      throw new TransactionDomainError(
        'タイトルは100文字以内である必要があります',
      );
    }

    this._title = newTitle.trim();
    this._updatedAt = new Date();
  }

  /**
   * 金額を更新する
   */
  updateAmount(newAmount: Money): void {
    if (newAmount.isZero()) {
      throw new TransactionDomainError('金額は0より大きい必要があります');
    }

    this._amount = newAmount;
    this._updatedAt = new Date();
  }

  /**
   * 日付を更新する
   */
  updateDate(newDate: TransactionDate): void {
    if (newDate.isFuture()) {
      throw new TransactionDomainError('未来日の取引は登録できません');
    }

    this._date = newDate;
    this._updatedAt = new Date();
  }

  /**
   * カテゴリを更新する
   */
  updateCategory(newCategoryIdValue: number): void {
    const newCategoryId = createId<CategoryId>(
      newCategoryIdValue,
      'CategoryId',
    );

    this._categoryId = newCategoryId;
    this._updatedAt = new Date();
  }

  /**
   * メモを更新する
   */
  updateMemo(newMemo: string): void {
    if (newMemo.length > 500) {
      throw new TransactionDomainError('メモは500文字以内である必要があります');
    }

    this._memo = newMemo.trim();
    this._updatedAt = new Date();
  }

  /**
   * 取引を論理削除する
   */
  delete(): void {
    this._updatedAt = new Date();
  }

  /**
   * 収入取引かどうかを判定
   */
  isIncome(): boolean {
    return this._type === 'INCOME';
  }

  /**
   * 支出取引かどうかを判定
   */
  isExpense(): boolean {
    return this._type === 'EXPENSE';
  }

  /**
   * 指定された月の取引かどうかを判定
   */
  isInMonth(targetDate: TransactionDate): boolean {
    return this._date.isSameMonth(targetDate);
  }

  /**
   * 指定された年の取引かどうかを判定
   */
  isInYear(targetDate: TransactionDate): boolean {
    return this._date.isSameYear(targetDate);
  }
}

// =====================================
// 永続化/ユースケース向けのDTO型
// =====================================

export type TransactionRecord = {
  id: number;
  userId: number;
  type: 'INCOME' | 'EXPENSE';
  title: string;
  amount: number;
  currency: string;
  date: string; // ISO8601形式
  categoryId: number;
  memo: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TransactionCategoryRecord = {
  id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  isDefault: boolean;
};

export type TransactionListItemRecord = {
  id: number;
  userId: number;
  type: 'INCOME' | 'EXPENSE';
  title: string;
  amount: number;
  currencyCode: string;
  date: string; // YYYY-MM-DD
  categoryIds: number[];
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTransactionData = {
  userId: number;
  type: 'INCOME' | 'EXPENSE';
  title: string;
  amount: number;
  date: string; // ISO8601形式
  categoryId: number;
  memo: string;
};
