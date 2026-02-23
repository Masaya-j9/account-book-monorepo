import type {
  UsersLoginInput,
  UsersLoginOutput,
} from '@account-book-app/shared';
import * as Cause from 'effect/Cause';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import { inject, injectable } from 'inversify';
import type { PublicUserRecord, User } from '../../domain/entities/user.entity';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserName } from '../../domain/values/user-name';
import { Effect, Either, pipe } from '../../shared/result';
import type { ICreateJwtService } from '../auth/create-jwt.service';
import { TOKENS } from '../di/tokens';
import {
  InvalidCredentialsError,
  type LoginUserError,
  UnexpectedLoginUserError,
} from './login-user.errors';

type NormalizedInput = {
  email: string;
  name: UserName;
  password: string;
};

type UserFoundInput = {
  user: User;
  name: UserName;
  password: string;
};

@injectable()
export class LoginUserUseCase {
  @inject(TOKENS.UserRepository)
  private userRepository!: IUserRepository;

  @inject(TOKENS.CreateJwtService)
  private createJwtService!: ICreateJwtService;

  async execute(input: UsersLoginInput): Promise<UsersLoginOutput> {
    const program = this.buildProgram(input);
    const exit = await Effect.runPromiseExit(program);
    return this.unwrapExit(exit);
  }

  private buildProgram(
    input: UsersLoginInput,
  ): Effect.Effect<UsersLoginOutput, LoginUserError> {
    return pipe(
      this.normalizeInput(input),
      Effect.flatMap((value) => this.findUser(value)),
      Effect.flatMap((value) => this.verifyName(value)),
      Effect.flatMap((value) => this.verifyPassword(value)),
      Effect.flatMap((user) => this.createToken(user)),
    );
  }

  private normalizeInput(
    input: UsersLoginInput,
  ): Effect.Effect<NormalizedInput, LoginUserError> {
    return pipe(
      UserName.create(input.name),
      Either.mapLeft(() => new InvalidCredentialsError()),
      Either.match({
        onLeft: (error) => Effect.fail(error),
        onRight: (name) =>
          Effect.succeed({
            email: input.email.trim().toLowerCase(),
            name,
            password: input.password,
          }),
      }),
    );
  }

  private findUser(
    input: NormalizedInput,
  ): Effect.Effect<UserFoundInput, LoginUserError> {
    return pipe(
      Effect.promise(() => this.userRepository.findByEmail(input.email)),
      Effect.mapError((cause) =>
        this.createUnexpectedError('ユーザー情報の取得に失敗しました', cause),
      ),
      Effect.flatMap((user) =>
        user === null
          ? Effect.fail(new InvalidCredentialsError())
          : Effect.succeed({
              user,
              name: input.name,
              password: input.password,
            }),
      ),
    );
  }

  private verifyName(
    input: UserFoundInput,
  ): Effect.Effect<UserFoundInput, LoginUserError> {
    return input.user.name === input.name.value
      ? Effect.succeed(input)
      : Effect.fail(new InvalidCredentialsError());
  }

  private verifyPassword(
    input: UserFoundInput,
  ): Effect.Effect<PublicUserRecord, LoginUserError> {
    return pipe(
      Effect.promise(() => input.user.verifyPassword(input.password)),
      Effect.mapError((cause) =>
        this.createUnexpectedError('パスワードの検証に失敗しました', cause),
      ),
      Effect.flatMap((isValid) =>
        isValid
          ? Effect.succeed({
              id: Number(input.user.id),
              email: input.user.email,
              name: input.user.name,
              createdAt: input.user.createdAt,
              updatedAt: input.user.updatedAt,
            })
          : Effect.fail(new InvalidCredentialsError()),
      ),
    );
  }

  private createToken(
    user: PublicUserRecord,
  ): Effect.Effect<UsersLoginOutput, LoginUserError> {
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

  private createUnexpectedError<T>(
    message: string,
    cause: T,
  ): UnexpectedLoginUserError {
    const normalizedCause =
      cause instanceof Error
        ? cause
        : new Error(typeof cause === 'string' ? cause : '原因不明なエラー');

    return new UnexpectedLoginUserError({
      message,
      cause: normalizedCause,
    });
  }

  private unwrapExit(
    exit: Exit.Exit<UsersLoginOutput, LoginUserError>,
  ): UsersLoginOutput {
    return Exit.match(exit, {
      onSuccess: (value) => value,
      onFailure: (cause) =>
        pipe(
          Cause.failureOption(cause),
          Option.match({
            onNone: () => {
              throw new UnexpectedLoginUserError({
                message: 'ログインに失敗しました',
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
