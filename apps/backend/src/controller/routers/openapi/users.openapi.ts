import type { NodePgDatabase } from '@account-book-app/db';
import {
  usersRegisterInputSchema,
  usersRegisterOutputSchema,
} from '@account-book-app/shared';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute, z } from '@hono/zod-openapi';
import type { Context, Env } from 'hono';

import { createRequestContainer } from '../../../infrastructre/di/container';
import { TOKENS } from '../../../services/di/tokens';
import {
  EmailAlreadyExistsError,
  InvalidPasswordError,
  InvalidUserEmailError,
  InvalidUserNameError,
} from '../../../services/users/register-user.errors';
import type { RegisterUserUseCase } from '../../../services/users/register-user.service';
import { Effect, pipe } from '../../../shared/result';

const resolveRegisterUserUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<RegisterUserUseCase>(TOKENS.RegisterUserUseCase);
};

const errorResponseSchema = z.object({
  message: z.string(),
});

type ErrorStatus = 400 | 409 | 500;

type HttpError<S extends ErrorStatus = ErrorStatus> = {
  status: S;
  message: string;
};

const respondError = <S extends ErrorStatus, E extends Env, P extends string>(
  c: Context<E, P>,
  error: HttpError<S>,
) => c.json({ message: error.message }, error.status);

const normalizeError = <T>(cause: T) =>
  cause instanceof Error ? cause : new Error(String(cause));

const toRegisterUserHttpError = <T>(cause: T): HttpError => {
  const error = normalizeError(cause);

  if (
    error instanceof InvalidUserEmailError ||
    error instanceof InvalidUserNameError ||
    error instanceof InvalidPasswordError
  ) {
    return { status: 400, message: error.message };
  }

  if (error instanceof EmailAlreadyExistsError) {
    return { status: 409, message: error.message };
  }

  return { status: 500, message: 'ユーザー登録に失敗しました' };
};

const registerUserRoute = createRoute({
  method: 'post',
  path: '/users/register',
  tags: ['users'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: usersRegisterInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'ユーザー登録',
      content: {
        'application/json': {
          schema: usersRegisterOutputSchema,
        },
      },
    },
    400: {
      description: '不正なリクエスト',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    409: {
      description: 'メールアドレス重複',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: 'サーバーエラー',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

export const registerUsersOpenApi = (app: OpenAPIHono, db: NodePgDatabase) => {
  app.openapi(registerUserRoute, async (c) => {
    const input = c.req.valid('json');
    const registerUserUseCase = resolveRegisterUserUseCase(db);

    return Effect.runPromise(
      pipe(
        Effect.tryPromise({
          try: () =>
            registerUserUseCase.execute({
              email: input.email,
              name: input.name,
              password: input.password,
            }),
          catch: (cause) => toRegisterUserHttpError(cause),
        }),
        Effect.match({
          onFailure: (error) => respondError(c, error),
          onSuccess: (result) => c.json(result, 201),
        }),
      ),
    );
  });
};
