import type { NodePgDatabase } from '@account-book-app/db';
import {
  usersRegisterInputSchema,
  usersRegisterOutputSchema,
} from '@account-book-app/shared';
import { TRPCError } from '@trpc/server';

import { createRequestContainer } from '../../infrastructre/di/container';
import { TOKENS } from '../../services/di/tokens';
import {
  EmailAlreadyExistsError,
  InvalidPasswordError,
  InvalidUserEmailError,
  InvalidUserNameError,
} from '../../services/users/register-user.errors';
import type { RegisterUserUseCase } from '../../services/users/register-user.service';
import { Effect } from '../../shared/result';
import { publicProcedure, router } from '../trpc/trpc';
import { runTrpcEffect } from './errors/trpc-effect';

const resolveRegisterUserUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<RegisterUserUseCase>(TOKENS.RegisterUserUseCase);
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
});
