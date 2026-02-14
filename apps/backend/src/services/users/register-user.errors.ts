import { DomainError } from '../../domain/values/domain-error';

export class InvalidUserEmailError extends DomainError {
  constructor() {
    super('メールアドレスの形式が不正です', 'InvalidUserEmailError');
  }
}

export class InvalidUserNameError extends DomainError {
  constructor() {
    super('ユーザー名は必須です', 'InvalidUserNameError');
  }
}

export class InvalidPasswordError extends DomainError {
  constructor(message: string) {
    super(message, 'InvalidPasswordError');
  }
}

export class EmailAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(
      `メールアドレスは既に登録されています: ${email}`,
      'EmailAlreadyExistsError',
    );
  }
}

type UnexpectedRegisterUserErrorParams = {
  message: string;
  cause?: Error;
};

export class UnexpectedRegisterUserError extends DomainError {
  public readonly cause?: Error;

  constructor(params: UnexpectedRegisterUserErrorParams) {
    super(params.message, 'UnexpectedRegisterUserError');
    if (params.cause) {
      this.cause = params.cause;
    }
  }
}

export type RegisterUserError =
  | InvalidUserEmailError
  | InvalidUserNameError
  | InvalidPasswordError
  | EmailAlreadyExistsError
  | UnexpectedRegisterUserError;
