export type TransactionListOrderValue = 'asc' | 'desc';

type CompositeOrder = ReadonlyArray<{
  field: 'date' | 'id';
  direction: TransactionListOrderValue;
}>;

/**
 * 取引一覧の並び順を表す値オブジェクト。
 *
 * - ビジネス上の安定ソートとして、`date` を主キー、`id` を副キーにする
 * - direction（asc/desc）は両方のキーに同一方向で適用する
 */
export class TransactionListOrder {
  private constructor(public readonly direction: TransactionListOrderValue) {}

  static from(direction: TransactionListOrderValue): TransactionListOrder {
    return new TransactionListOrder(direction);
  }

  toCompositeOrder(): CompositeOrder {
    return [
      { field: 'date', direction: this.direction },
      { field: 'id', direction: this.direction },
    ] as const;
  }
}
