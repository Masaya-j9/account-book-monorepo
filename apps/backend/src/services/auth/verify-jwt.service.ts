export type VerifiedTokenPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

export interface IVerifyJwtTokenProvider {
  verify(token: string): Promise<VerifiedTokenPayload>;
}
