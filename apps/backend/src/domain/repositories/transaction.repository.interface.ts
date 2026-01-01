// Repository Interface: ITransactionRepository
// 取引の永続化に関する抽象インターフェース

import type {
  CreateTransactionData,
  Transaction,
  TransactionRecord,
} from '../entities/transaction.entity';

export interface ITransactionRepository {
  /**
   * 取引を作成する
   */
  create(data: CreateTransactionData): Promise<TransactionRecord>;

  /**
   * IDで取引を検索する
   */
  findById(id: number): Promise<TransactionRecord | null>;

  /**
   * ユーザーIDで取引一覧を取得する
   */
  findByUserId(userId: number): Promise<TransactionRecord[]>;

  /**
   * ユーザーIDと期間で取引一覧を取得する
   */
  findByUserIdAndPeriod(
    userId: number,
    startDate: string,
    endDate: string,
  ): Promise<TransactionRecord[]>;

  /**
   * 取引を更新する
   */
  update(transaction: Transaction): Promise<TransactionRecord>;

  /**
   * 取引を削除する
   */
  delete(id: number): Promise<void>;

  /**
   * カテゴリIDが使用されているかチェックする
   */
  existsByCategoryId(categoryId: number): Promise<boolean>;
}
