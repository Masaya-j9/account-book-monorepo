import 'reflect-metadata';

import { db } from '@account-book-app/db';
import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { appRouter } from './controller/routers';
import { registerOpenApi } from './controller/routers/openapi';
import { createContext } from './controller/trpc/context';

const app = new OpenAPIHono();

// Health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Account Book API' });
});

registerOpenApi(app, db);

// tRPC endpoint
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: createContext(db),
  }),
);

const port = 4000;
serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`🚀 Server is running on http://localhost:${info.port}`);
    console.log(`📄 OpenAPI doc: http://localhost:${info.port}/doc`);
    console.log(`📡 tRPC endpoint: http://localhost:${info.port}/trpc`);
  },
);
