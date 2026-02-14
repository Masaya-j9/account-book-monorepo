import type {
  UsersRegisterInput,
  UsersRegisterOutput,
} from '@account-book-app/shared';
import * as Cause from 'effect/Cause';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import { inject, injectable } from 'inversify';

import type { PublicUserRecord } from '../../domain/entities/user.entity';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { Password } from '../../domain/values/password';
import { PasswordHash } from '../../domain/values/password-hash';
import { Effect, Either, pipe } from '../../shared/result';
import type { ICreateJwtService } from '../auth/create-jwt.service';
import { TOKENS } from '../di/tokens';
import {
  EmailAlreadyExistsError,
  InvalidPasswordError,
  InvalidUserEmailError,
  InvalidUserNameError,
  type RegisterUserError,
  UnexpectedRegisterUserError,
} from './register-user.errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NormalizedInput = {
  email: string;
  name: string;
  password: string;
};

type PasswordValidatedInput = {
  email: string;
  name: string;
  password: Password;
};

type NewUserInput = {
  email: string;
  name: string;
  passwordHash: PasswordHash;
};

@injectable()
export class RegisterUserUseCase {
  @inject(TOKENS.UserRepository)
  private userRepository!: IUserRepository;

  @inject(TOKENS.CreateJwtService)
  private createJwtService!: ICreateJwtService;

  async execute(input: UsersRegisterInput): Promise<UsersRegisterOutput> {
    const program = this.buildProgram(input);
    const exit = await Effect.runPromiseExit(program);
    return this.unwrapExit(exit);
  }

  private buildProgram(
    input: UsersRegisterInput,
  ): Effect.Effect<UsersRegisterOutput, RegisterUserError> {
    return pipe(
      this.normalizeInput(input),
      Effect.flatMap((value) => this.validateEmail(value)),
      Effect.flatMap((value) => this.validateName(value)),
      Effect.flatMap((value) => this.validatePassword(value)),
      Effect.flatMap((value) => this.ensureEmailUnique(value)),
      Effect.flatMap((value) => this.createUser(value)),
      Effect.flatMap((user) => this.createToken(user)),
    );
  }

  private normalizeInput(
    input: UsersRegisterInput,
  ): Effect.Effect<NormalizedInput, RegisterUserError> {
    return Effect.succeed({
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      password: input.password,
    });
  }

  private validateEmail(
    input: NormalizedInput,
  ): Effect.Effect<NormalizedInput, RegisterUserError> {
    return pipe(
      Effect.succeed(input),
      Effect.filterOrFail(
        ({ email }) => EMAIL_REGEX.test(email),
        () => new InvalidUserEmailError(),
      ),
    );
  }

  private validateName(
    input: NormalizedInput,
  ): Effect.Effect<NormalizedInput, RegisterUserError> {
    return pipe(
      Effect.succeed(input),
      Effect.filterOrFail(
        ({ name }) => name.length > 0,
        () => new InvalidUserNameError(),
      ),
    );
  }

  private validatePassword(
    input: NormalizedInput,
  ): Effect.Effect<PasswordValidatedInput, RegisterUserError> {
    return pipe(
      Password.create(input.password),
      Either.map((password) => ({
        ...input,
        password,
      })),
      Either.mapLeft((error) => new InvalidPasswordError(error.message)),
      Either.match({
        onLeft: (error) => Effect.fail(error),
        onRight: (value) => Effect.succeed(value),
      }),
    );
  }

  private ensureEmailUnique(
    input: PasswordValidatedInput,
  ): Effect.Effect<PasswordValidatedInput, RegisterUserError> {
    return pipe(
      Effect.promise(() => this.userRepository.findByEmail(input.email)),
      Effect.mapError((cause) =>
        this.createUnexpectedError('ユーザー情報の取得に失敗しました', cause),
      ),
      Effect.flatMap((record) =>
        pipe(
          Effect.succeed(input),
          Effect.filterOrFail(
            () => record === null,
            () => new EmailAlreadyExistsError(input.email),
          ),
        ),
      ),
    );
  }

  private createUser(
    input: PasswordValidatedInput,
  ): Effect.Effect<PublicUserRecord, RegisterUserError> {
    return pipe(
      Effect.promise(() => this.toNewUserInput(input)),
      Effect.mapError((cause) =>
        this.createUnexpectedError(
          'パスワードのハッシュ化に失敗しました',
          cause,
        ),
      ),
      Effect.flatMap((newUser) =>
        pipe(
          Effect.promise(() => this.userRepository.create(newUser)),
          Effect.mapError((cause) =>
            this.createUnexpectedError('ユーザーの作成に失敗しました', cause),
          ),
        ),
      ),
      Effect.map((record) => ({
        id: record.id,
        email: record.email,
        name: record.name,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })),
    );
  }

  private createToken(
    user: PublicUserRecord,
  ): Effect.Effect<UsersRegisterOutput, RegisterUserError> {
    return pipe(
      Effect.promise(() =>
        this.createJwtService.create({
          userId: user.id,
          email: user.email,
        }),
      ),
      Effect.mapError((cause) =>
        this.createUnexpectedError(
          'アクセストークンの生成に失敗しました',
          cause,
        ),
      ),
      Effect.map((token) => ({ token, user })),
    );
  }

  private async toNewUserInput(
    input: PasswordValidatedInput,
  ): Promise<NewUserInput> {
    const passwordHash = await PasswordHash.create(input.password.value);

    return {
      email: input.email,
      name: input.name,
      passwordHash,
    };
  }

  private createUnexpectedError<T>(
    message: string,
    cause: T,
  ): UnexpectedRegisterUserError {
    const normalizedCause =
      cause instanceof Error
        ? cause
        : new Error(typeof cause === 'string' ? cause : '原因不明なエラー');

    return new UnexpectedRegisterUserError({
      message,
      cause: normalizedCause,
    });
  }

  private unwrapExit(
    exit: Exit.Exit<UsersRegisterOutput, RegisterUserError>,
  ): UsersRegisterOutput {
    return Exit.match(exit, {
      onSuccess: (value) => value,
      onFailure: (cause) =>
        pipe(
          Cause.failureOption(cause),
          Option.match({
            onNone: () => {
              throw new UnexpectedRegisterUserError({
                message: 'ユーザー登録に失敗しました',
                cause: new Error('Effectの実行が失敗しました'),
              });
            },
            onSome: (error) => {
              throw error;
            },
          }),
        ),
    });
  }
}
