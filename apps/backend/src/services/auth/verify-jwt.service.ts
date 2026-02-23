export type VerifiedTokenPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

/**
 * JWT の検証が認証失敗（期限切れ・無効・不正形式）によって失敗した場合に
 * IVerifyJwtTokenProvider の実装がスローするエラー。
 * これを受け取った上位層は 401 としてマップする。
 */
export class VerifyJwtAuthError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'VerifyJwtAuthError';
  }
}

export interface IVerifyJwtTokenProvider {
  /** @throws {VerifyJwtAuthError} JWT が無効・期限切れ・不正形式のとき */
  verify(token: string): Promise<VerifiedTokenPayload>;
}
