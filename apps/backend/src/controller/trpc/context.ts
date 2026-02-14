// Presentation Layer: tRPC Context
// リクエストごとのコンテキスト設定

import type { NodePgDatabase } from '@account-book-app/db';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import {
  type JwtVerifyError,
  verifyAccessTokenEffect,
} from '../../infrastructre/auth/jwt';
import { Effect, pipe } from '../../shared/result';

export interface Context extends Record<string, unknown> {
  db: NodePgDatabase;
  userId?: number; // 認証実装後に使用
}

export const createContext = (
  db: NodePgDatabase,
): ((opts: FetchCreateContextFnOptions) => Promise<Context>) => {
  return async (opts: FetchCreateContextFnOptions) => {
    const authorization = opts.req.headers.get('authorization');
    const token = getBearerToken(authorization);
    const userId = token ? await resolveUserId(token) : undefined;

    return {
      db,
      userId,
    };
  };
};

const getBearerToken = (authorization: string | null): string | undefined => {
  if (!authorization) {
    return undefined;
  }

  const [scheme, token] = authorization.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
};

const resolveUserId = async (token: string): Promise<number | undefined> => {
  const payload = await Effect.runPromise(
    pipe(
      verifyAccessTokenEffect(token),
      Effect.tapError((error) => Effect.sync(() => logJwtVerifyError(error))),
      Effect.match({
        onFailure: () => undefined,
        onSuccess: (value) => value,
      }),
    ),
  );

  if (!payload) {
    return undefined;
  }

  const userId = Number(payload.sub);
  return Number.isInteger(userId) && userId > 0 ? userId : undefined;
};

const logJwtVerifyError = (error: JwtVerifyError): void => {
  console.warn('[auth] JWT検証に失敗しました', {
    type: error._tag,
    message: error.message,
    cause: error.cause.message,
  });
};
