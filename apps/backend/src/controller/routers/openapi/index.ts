import type { NodePgDatabase } from '@account-book-app/db';
import { swaggerUI } from '@hono/swagger-ui';
import type { OpenAPIHono } from '@hono/zod-openapi';

import { registerCategoriesOpenApi } from './categories.openapi';
import { registerTransactionsOpenApi } from './transactions.openapi';
import { registerUsersOpenApi } from './users.openapi';

export const registerOpenApi = (app: OpenAPIHono, db: NodePgDatabase) => {
  app.doc('/openapi.json', (c) => ({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Account Book API',
    },
    servers: [
      {
        url: new URL(c.req.url).origin,
        description: 'Current environment',
      },
    ],
  }));

  app.get('/doc', swaggerUI({ url: '/openapi.json' }));

  registerCategoriesOpenApi(app, db);
  registerTransactionsOpenApi(app, db);
  registerUsersOpenApi(app, db);
};
