import { inject, injectable } from 'inversify';

import { TOKENS } from '../di/tokens';

export interface ICreateJwtService {
  create(params: { userId: number; email: string }): Promise<string>;
}

export interface ICreateJwtTokenProvider {
  create(params: { userId: number; email: string }): Promise<string>;
}

@injectable()
export class CreateJwtService implements ICreateJwtService {
  @inject(TOKENS.CreateJwtTokenProvider)
  private createJwtTokenProvider!: ICreateJwtTokenProvider;

  create(params: { userId: number; email: string }): Promise<string> {
    return this.createJwtTokenProvider.create(params);
  }
}
