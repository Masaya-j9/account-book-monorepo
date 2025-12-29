// Domain Layer: TransactionType Entity
// 取引タイプ(収入/支出)のマスターデータを表現

import { DomainError } from '../values/domain-error';
import type { TransactionTypeId } from '../values/indentity';
import { createId } from '../values/indentity';

// =====================================
// エンティティエラー
// =====================================

export class TransactionTypeDomainError extends DomainError {
  constructor(message: string) {
    super(message, 'TransactionTypeDomainError');
  }
}

// =====================================
// TransactionType Entity
// =====================================

export class TransactionType {
  private static readonly INCOME_CODE = 'INCOME' as const;
  private static readonly EXPENSE_CODE = 'EXPENSE' as const;

  private constructor(
    private readonly _id: TransactionTypeId,
    private readonly _code: string,
    private readonly _name: string,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
  ) {}

  // =====================================
  // ファクトリメソッド
  // =====================================

  /**
   * 既存の取引タイプを再構築(永続化層から復元する際に使用)
   */
  static reconstruct(
    idValue: number,
    code: string,
    name: string,
    createdAt: Date,
    updatedAt: Date,
  ): TransactionType {
    const id = createId<TransactionTypeId>(idValue, 'TransactionTypeId');
    return new TransactionType(id, code, name, createdAt, updatedAt);
  }

  // =====================================
  // ゲッター
  // =====================================

  get id(): TransactionTypeId {
    return this._id;
  }

  get code(): string {
    return this._code;
  }

  get name(): string {
    return this._name;
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
   * 収入タイプかどうかを判定
   */
  isIncome(): boolean {
    return this._code === TransactionType.INCOME_CODE;
  }

  /**
   * 支出タイプかどうかを判定
   */
  isExpense(): boolean {
    return this._code === TransactionType.EXPENSE_CODE;
  }

  /**
   * 同一性チェック
   */
  equals(other: TransactionType): boolean {
    return this._id === other._id;
  }

  /**
   * コードで比較
   */
  hasSameCode(code: string): boolean {
    return this._code === code;
  }
}
