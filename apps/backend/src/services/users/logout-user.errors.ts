import { DomainError } from '../../domain/values/domain-error';

export class LogoutUserAuthError extends DomainError {
  public readonly cause?: Error;

  constructor(params: { message: string; cause?: Error }) {
    super(params.message, 'LogoutUserAuthError');
    if (params.cause) {
      this.cause = params.cause;
    }
  }
}

export class UnexpectedLogoutUserError extends DomainError {
  public readonly cause?: Error;

  constructor(params: { message: string; cause?: Error }) {
    super(params.message, 'UnexpectedLogoutUserError');
    if (params.cause) {
      this.cause = params.cause;
    }
  }
}

export type LogoutUserError = LogoutUserAuthError | UnexpectedLogoutUserError;
