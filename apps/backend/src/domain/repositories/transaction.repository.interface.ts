// Repository Interface: ITransactionRepository
// 取引の永続化に関する抽象インターフェース

import type {
  CreateTransactionData,
  Transaction,
  TransactionListItemRecord,
  TransactionRecord,
} from '../entities/transaction.entity';

export type ListTransactionsQuery = {
  userId: number;
  startDate?: string;
  endDate?: string;
  type?: 'INCOME' | 'EXPENSE';
  categoryIds?: number[];
  order: 'asc' | 'desc';
  limit: number;
  offset: number;
};

export type ListTransactionsResult = {
  items: TransactionListItemRecord[];
  total: number;
};

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
   * 取引に紐づくカテゴリID一覧を取得する
   */
  findCategoryIdsByTransactionId(transactionId: number): Promise<number[]>;

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
   * ユーザーIDで取引一覧を取得する（ページネーション/フィルタ付き）
   */
  listByUserId(query: ListTransactionsQuery): Promise<ListTransactionsResult>;

  /**
   * 取引を更新する
   */
  update(
    transaction: Transaction,
    options?: { categoryIds?: number[] },
  ): Promise<TransactionRecord>;

  /**
   * 取引を削除する
   */
  delete(transaction: Transaction): Promise<void>;

  /**
   * カテゴリIDが使用されているかチェックする
   */
  existsByCategoryId(categoryId: number): Promise<boolean>;
}
