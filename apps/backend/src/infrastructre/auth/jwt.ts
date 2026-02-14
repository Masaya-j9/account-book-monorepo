import { sign, verify } from 'hono/jwt';
import { injectable } from 'inversify';

import type { ICreateJwtTokenProvider } from '../../services/auth/create-jwt.service';

const JWT_SECRET_ENV_KEY = 'JWT_SECRET';
const JWT_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

export type AccessTokenPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

const resolveJwtSecret = (): string => {
  const value = process.env[JWT_SECRET_ENV_KEY];

  if (!value) {
    throw new Error('JWT_SECRET が設定されていません');
  }

  return value;
};

export const createAccessToken = async (params: {
  userId: number;
  email: string;
}): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sub: String(params.userId),
    email: params.email,
    iat: now,
    exp: now + JWT_EXPIRES_IN_SECONDS,
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

@injectable()
export class CreateJwtProvider implements ICreateJwtTokenProvider {
  create(params: { userId: number; email: string }): Promise<string> {
    return createAccessToken(params);
  }
}
