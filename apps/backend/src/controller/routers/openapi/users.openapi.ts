import type { NodePgDatabase } from '@account-book-app/db';
import {
  usersLoginInputSchema,
  usersLoginOutputSchema,
  usersLogoutOutputSchema,
  usersRegisterInputSchema,
  usersRegisterOutputSchema,
} from '@account-book-app/shared';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute, z } from '@hono/zod-openapi';
import type { Context, Env } from 'hono';

import { createRequestContainer } from '../../../infrastructre/di/container';
import { TOKENS } from '../../../services/di/tokens';
import { InvalidCredentialsError } from '../../../services/users/login-user.errors';
import type { LoginUserUseCase } from '../../../services/users/login-user.service';
import { UnexpectedLogoutUserError } from '../../../services/users/logout-user.errors';
import type { LogoutUserUseCase } from '../../../services/users/logout-user.service';
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

const resolveLoginUserUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<LoginUserUseCase>(TOKENS.LoginUserUseCase);
};

const resolveLogoutUserUseCase = (db: NodePgDatabase) => {
  const container = createRequestContainer(db);
  return container.get<LogoutUserUseCase>(TOKENS.LogoutUserUseCase);
};

const errorResponseSchema = z.object({
  message: z.string(),
});

type RegisterErrorStatus = 400 | 409 | 500;
type LoginErrorStatus = 401 | 500;
type LogoutErrorStatus = 401 | 500;
type ErrorStatus = RegisterErrorStatus | LoginErrorStatus | LogoutErrorStatus;

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

const toRegisterUserHttpError = <T>(
  cause: T,
): HttpError<RegisterErrorStatus> => {
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

const toLoginUserHttpError = <T>(cause: T): HttpError<LoginErrorStatus> => {
  const error = normalizeError(cause);

  if (error instanceof InvalidCredentialsError) {
    return { status: 401, message: error.message };
  }

  return { status: 500, message: 'ログインに失敗しました' };
};

const toLogoutUserHttpError = <T>(cause: T): HttpError<LogoutErrorStatus> => {
  const error = normalizeError(cause);

  if (error instanceof UnexpectedLogoutUserError) {
    return { status: 500, message: error.message };
  }

  return { status: 500, message: 'ログアウトに失敗しました' };
};

const getBearerToken = (
  authorization: string | undefined,
): string | undefined => {
  if (!authorization) return undefined;
  const [scheme, token] = authorization.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
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

const logoutUserRoute = createRoute({
  method: 'post',
  path: '/users/logout',
  tags: ['users'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'ログアウト成功',
      content: {
        'application/json': {
          schema: usersLogoutOutputSchema,
        },
      },
    },
    401: {
      description: '未認証',
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

const loginUserRoute = createRoute({
  method: 'post',
  path: '/users/login',
  tags: ['users'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: usersLoginInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'ログイン成功',
      content: {
        'application/json': {
          schema: usersLoginOutputSchema,
        },
      },
    },
    401: {
      description: '認証情報が不正',
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

  app.openapi(loginUserRoute, async (c) => {
    const input = c.req.valid('json');
    const loginUserUseCase = resolveLoginUserUseCase(db);

    return Effect.runPromise(
      pipe(
        Effect.tryPromise({
          try: () =>
            loginUserUseCase.execute({
              email: input.email,
              name: input.name,
              password: input.password,
            }),
          catch: (cause) => toLoginUserHttpError(cause),
        }),
        Effect.match({
          onFailure: (error) => respondError(c, error),
          onSuccess: (result) => c.json(result, 200),
        }),
      ),
    );
  });

  app.openapi(logoutUserRoute, async (c) => {
    const token = getBearerToken(c.req.header('authorization'));

    if (!token) {
      return c.json({ message: '認証が必要です' }, 401);
    }

    const logoutUserUseCase = resolveLogoutUserUseCase(db);

    return Effect.runPromise(
      pipe(
        Effect.tryPromise({
          try: () => logoutUserUseCase.execute({ token }),
          catch: (cause) => toLogoutUserHttpError(cause),
        }),
        Effect.match({
          onFailure: (error) => respondError(c, error),
          onSuccess: (result) => c.json(result, 200),
        }),
      ),
    );
  });
};
