// Presentation Layer: tRPC Context
// リクエストごとのコンテキスト設定

import { eq, type NodePgDatabase, tokenBlacklists } from '@account-book-app/db';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import {
  type JwtVerifyError,
  verifyAccessTokenEffect,
} from '../../infrastructre/auth/jwt';
import { Effect, pipe } from '../../shared/result';

export interface Context extends Record<string, unknown> {
  db: NodePgDatabase;
  userId?: number;
  token?: string; // logout 時に使用するオリジナルトークン文字列
}

export const createContext = (
  db: NodePgDatabase,
): ((opts: FetchCreateContextFnOptions) => Promise<Context>) => {
  return async (opts: FetchCreateContextFnOptions) => {
    const authorization = opts.req.headers.get('authorization');
    const token = getBearerToken(authorization);
    const userId = token ? await resolveUserId(token, db) : undefined;

    return {
      db,
      userId,
      token,
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

const resolveUserId = async (
  token: string,
  db: NodePgDatabase,
): Promise<number | undefined> => {
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
  if (!Number.isInteger(userId) || userId <= 0) {
    return undefined;
  }

  // ブラックリストチェック: ログアウト済みトークンは無効
  const tokenIdentifier = `${payload.sub}:${payload.iat}`;
  const [blacklisted] = await db
    .select({ id: tokenBlacklists.id })
    .from(tokenBlacklists)
    .where(eq(tokenBlacklists.tokenIdentifier, tokenIdentifier))
    .limit(1);

  if (blacklisted) {
    console.warn('[auth] ログアウト済みのトークンが使用されました', {
      tokenIdentifier,
    });
    return undefined;
  }

  return userId;
};

const logJwtVerifyError = (error: JwtVerifyError): void => {
  console.warn('[auth] JWT検証に失敗しました', {
    type: error._tag,
    message: error.message,
    cause: error.cause.message,
  });
};
