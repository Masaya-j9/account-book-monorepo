export interface ITokenBlacklistRepository {
  add(params: {
    tokenIdentifier: string;
    userId: number;
    expiresAt: Date;
  }): Promise<void>;
  exists(tokenIdentifier: string): Promise<boolean>;
}
