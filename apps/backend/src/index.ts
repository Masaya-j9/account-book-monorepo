import 'reflect-metadata';

import { db } from '@account-book-app/db';
import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { appRouter } from './controller/routers';
import { createContext } from './controller/trpc/context';

const app = new Hono();

// Health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Account Book API' });
});

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
    console.log(`📡 tRPC endpoint: http://localhost:${info.port}/trpc`);
  },
);
