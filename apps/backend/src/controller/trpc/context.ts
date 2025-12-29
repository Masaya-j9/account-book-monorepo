// Presentation Layer: tRPC Context
// リクエストごとのコンテキスト設定

import type { NodePgDatabase } from '@account-book-app/db';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export interface Context extends Record<string, unknown> {
  db: NodePgDatabase;
  userId?: number; // 認証実装後に使用
}

export const createContext = (
  db: NodePgDatabase,
): ((opts: FetchCreateContextFnOptions) => Context) => {
  return (_opts: FetchCreateContextFnOptions) => ({
    db,
    // TODO: 認証実装後、JWTからuserIdを取得
    userId: 1, // 仮のユーザーID
  });
};
