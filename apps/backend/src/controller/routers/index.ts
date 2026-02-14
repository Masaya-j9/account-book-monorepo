// Presentation Layer: Root Router
// すべてのルーターを統合

import { router } from '../trpc/trpc';
import { categoryRouter } from './category.router';
import { transactionRouter } from './transaction.router';
import { userRouter } from './user.router';

export const appRouter = router({
  categories: categoryRouter,
  transactions: transactionRouter,
  users: userRouter,
});

export type AppRouter = typeof appRouter;
