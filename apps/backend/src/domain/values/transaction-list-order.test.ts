import { describe, expect, it } from 'vitest';

import { TransactionListOrder } from './transaction-list-order';

describe('TransactionListOrder（取引一覧の並び順）', () => {
  describe('正常系', () => {
    it('date→id の安定ソート順序を返す（asc）', () => {
      const order = TransactionListOrder.from('asc');
      expect(order.toCompositeOrder()).toEqual([
        { field: 'date', direction: 'asc' },
        { field: 'id', direction: 'asc' },
      ]);
    });

    it('date→id の安定ソート順序を返す（desc）', () => {
      const order = TransactionListOrder.from('desc');
      expect(order.toCompositeOrder()).toEqual([
        { field: 'date', direction: 'desc' },
        { field: 'id', direction: 'desc' },
      ]);
    });
  });
});
