import { z } from 'zod';

// =====================================
// Pagination Input Schema
// =====================================

export const paginationInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(30),
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;

// =====================================
// Pagination Info Schema
// =====================================

export const pageInfoSchema = z.object({
  page: z.number().int().min(1),
  perPage: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

export type PageInfo = z.infer<typeof pageInfoSchema>;

// =====================================
// Sort Order Schema
// =====================================

export const sortOrderSchema = z.enum(['asc', 'desc']);

export type SortOrder = z.infer<typeof sortOrderSchema>;
