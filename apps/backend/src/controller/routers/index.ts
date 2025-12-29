// Presentation Layer: Root Router
// すべてのルーターを統合

import { router } from '../trpc/trpc';
import { categoryRouter } from './category.router';

export const appRouter = router({
  categories: categoryRouter,
});

export type AppRouter = typeof appRouter;
