import type { NodePgDatabase } from '@account-book-app/db';
import {
  usersLoginInputSchema,
  usersLoginOutputSchema,
  usersLogoutOutputSchema,
  usersRegisterInputSchema,
  usersRegisterOutputSchema,
} from '@account-book-app/shared';
import { TRPCError } from '@trpc/server';

import { createRequestContainer } from '../../infrastructre/di/container';
import { TOKENS } from '../../services/di/tokens';
import { InvalidCredentialsError } from '../../services/users/login-user.errors';
import type { LoginUserUseCase } from '../../services/users/login-user.service';
import { UnexpectedLogoutUserError } from '../../services/users/logout-user.errors';
import type { LogoutUserUseCase } from '../../services/users/logout-user.service';
import {
  EmailAlreadyExistsError,
  InvalidPasswordError,
  InvalidUserEmailError,
  InvalidUserNameError,
} from '../../services/users/register-user.errors';
import type { RegisterUserUseCase } from '../../services/users/register-user.service';
import { Effect } from '../../shared/result';
import { protectedProcedure, publicProcedure, router } from '../trpc/trpc';
import { runTrpcEffect } from './errors/trpc-effect';

const resolveRegisterUserUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<RegisterUserUseCase>(TOKENS.RegisterUserUseCase);
};

const resolveLoginUserUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<LoginUserUseCase>(TOKENS.LoginUserUseCase);
};

const resolveLogoutUserUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<LogoutUserUseCase>(TOKENS.LogoutUserUseCase);
};

const toRegisterUserTrpcError = <T>(cause: T) => {
  const error = cause instanceof Error ? cause : new Error(String(cause));

  if (process.env.NODE_ENV !== 'production') {
    console.error('[users.register] error:', error);
  }

  if (
    error instanceof InvalidUserEmailError ||
    error instanceof InvalidUserNameError ||
    error instanceof InvalidPasswordError
  ) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
    });
  }

  if (error instanceof EmailAlreadyExistsError) {
    return new TRPCError({
      code: 'CONFLICT',
      message: error.message,
    });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'ユーザー登録に失敗しました',
  });
};

const toLoginUserTrpcError = <T>(cause: T) => {
  const error = cause instanceof Error ? cause : new Error(String(cause));

  if (process.env.NODE_ENV !== 'production') {
    console.error('[users.login] error:', error);
  }

  if (error instanceof InvalidCredentialsError) {
    return new TRPCError({
      code: 'UNAUTHORIZED',
      message: error.message,
    });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'ログインに失敗しました',
  });
};

const toLogoutUserTrpcError = <T>(cause: T) => {
  const error = cause instanceof Error ? cause : new Error(String(cause));

  if (process.env.NODE_ENV !== 'production') {
    console.error('[users.logout] error:', error);
  }

  if (error instanceof UnexpectedLogoutUserError) {
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'ログアウトに失敗しました',
  });
};

export const userRouter = router({
  register: publicProcedure
    .input(usersRegisterInputSchema)
    .output(usersRegisterOutputSchema)
    .mutation(({ input, ctx }) =>
      runTrpcEffect(
        Effect.tryPromise({
          try: () =>
            resolveRegisterUserUseCase(ctx.db).execute({
              email: input.email,
              name: input.name,
              password: input.password,
            }),
          catch: (cause) => toRegisterUserTrpcError(cause),
        }),
      ),
    ),
  login: publicProcedure
    .input(usersLoginInputSchema)
    .output(usersLoginOutputSchema)
    .mutation(({ input, ctx }) =>
      runTrpcEffect(
        Effect.tryPromise({
          try: () =>
            resolveLoginUserUseCase(ctx.db).execute({
              email: input.email,
              name: input.name,
              password: input.password,
            }),
          catch: (cause) => toLoginUserTrpcError(cause),
        }),
      ),
    ),

  logout: protectedProcedure
    .output(usersLogoutOutputSchema)
    .mutation(({ ctx }) =>
      runTrpcEffect(
        Effect.tryPromise({
          try: () =>
            resolveLogoutUserUseCase(ctx.db).execute({
              // protectedProcedure を通過した時点で token は必ず存在する
              token: ctx.token ?? '',
            }),
          catch: (cause) => toLogoutUserTrpcError(cause),
        }),
      ),
    ),
});
