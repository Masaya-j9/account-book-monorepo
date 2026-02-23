import { sign, verify } from 'hono/jwt';
import { injectable } from 'inversify';

import type { ICreateJwtTokenProvider } from '../../services/auth/create-jwt.service';
import type {
  IVerifyJwtTokenProvider,
  VerifiedTokenPayload,
} from '../../services/auth/verify-jwt.service';
import { VerifyJwtAuthError } from '../../services/auth/verify-jwt.service';
import { Data, Effect } from '../../shared/result';

const JWT_SECRET_ENV_KEY = 'JWT_SECRET';
const JWT_EXPIRES_IN_SECONDS_ENV_KEY = 'JWT_EXPIRES_IN_SECONDS';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

export class JwtTokenExpiredError extends Data.TaggedError(
  'JwtTokenExpiredError',
)<{
  message: string;
  cause: Error;
}> {}

export class JwtTokenInvalidError extends Data.TaggedError(
  'JwtTokenInvalidError',
)<{
  message: string;
  cause: Error;
}> {}

export class JwtTokenMalformedError extends Data.TaggedError(
  'JwtTokenMalformedError',
)<{
  message: string;
  cause: Error;
}> {}

export class JwtTokenVerificationUnexpectedError extends Data.TaggedError(
  'JwtTokenVerificationUnexpectedError',
)<{
  message: string;
  cause: Error;
}> {}

export type JwtVerifyError =
  | JwtTokenExpiredError
  | JwtTokenInvalidError
  | JwtTokenMalformedError
  | JwtTokenVerificationUnexpectedError;

const resolveJwtSecret = (): string => {
  const value = process.env[JWT_SECRET_ENV_KEY];

  if (!value) {
    throw new Error('JWT_SECRET が設定されていません');
  }

  return value;
};

const resolveJwtExpiresInSeconds = (): number => {
  const value = process.env[JWT_EXPIRES_IN_SECONDS_ENV_KEY];

  if (!value) {
    throw new Error('JWT_EXPIRES_IN_SECONDS が設定されていません');
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('JWT_EXPIRES_IN_SECONDS は正の整数で設定してください');
  }

  return parsed;
};

export const createAccessToken = async (params: {
  userId: number;
  email: string;
}): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = resolveJwtExpiresInSeconds();
  const payload: AccessTokenPayload = {
    sub: String(params.userId),
    email: params.email,
    iat: now,
    exp: now + expiresInSeconds,
  };

  return sign(payload, resolveJwtSecret());
};

export const verifyAccessToken = async (
  token: string,
): Promise<AccessTokenPayload> => {
  const payload = await verify(token, resolveJwtSecret());

  return {
    sub: String(payload.sub ?? ''),
    email: String(payload.email ?? ''),
    iat: Number(payload.iat ?? 0),
    exp: Number(payload.exp ?? 0),
  };
};

const toJwtVerifyError = <T>(cause: T): JwtVerifyError => {
  const normalizedCause =
    cause instanceof Error
      ? cause
      : new Error(typeof cause === 'string' ? cause : '不明なJWT検証エラー');
  const message = normalizedCause.message.toLowerCase();

  if (message.includes('expired')) {
    return new JwtTokenExpiredError({
      message: 'JWTの有効期限が切れています',
      cause: normalizedCause,
    });
  }

  if (
    message.includes('signature') ||
    message.includes('invalid') ||
    message.includes('unauthorized')
  ) {
    return new JwtTokenInvalidError({
      message: 'JWTの署名または内容が不正です',
      cause: normalizedCause,
    });
  }

  if (message.includes('malformed') || message.includes('format')) {
    return new JwtTokenMalformedError({
      message: 'JWTの形式が不正です',
      cause: normalizedCause,
    });
  }

  return new JwtTokenVerificationUnexpectedError({
    message: 'JWT検証中に予期しないエラーが発生しました',
    cause: normalizedCause,
  });
};

export const verifyAccessTokenEffect = (
  token: string,
): Effect.Effect<AccessTokenPayload, JwtVerifyError> => {
  return Effect.tryPromise({
    try: () => verifyAccessToken(token),
    catch: (cause) => toJwtVerifyError(cause),
  });
};

@injectable()
export class CreateJwtProvider implements ICreateJwtTokenProvider {
  create(params: { userId: number; email: string }): Promise<string> {
    return createAccessToken(params);
  }
}

@injectable()
export class VerifyJwtProvider implements IVerifyJwtTokenProvider {
  async verify(token: string): Promise<VerifiedTokenPayload> {
    try {
      return await verifyAccessToken(token);
    } catch (cause) {
      const error = toJwtVerifyError(cause);
      if (error instanceof JwtTokenVerificationUnexpectedError) {
        // サーバー設定起因などの予期しないエラーはそのまま伝播させる（500 扱い）
        throw new Error(error.message, { cause: error.cause });
      }
      // Expired / Invalid / Malformed はすべて認証失敗（401 扱い）
      throw new VerifyJwtAuthError(error.message, { cause: error.cause });
    }
  }
}
