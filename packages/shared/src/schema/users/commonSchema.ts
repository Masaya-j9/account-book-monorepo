import { z } from 'zod';

import { USER_EMAIL_MAX_LENGTH, USER_NAME_MAX_LENGTH } from './constants';

export const userPublicSchema = z.object({
  id: z.number().int().positive(),
  email: z.email().max(USER_EMAIL_MAX_LENGTH),
  name: z.string().min(1).max(USER_NAME_MAX_LENGTH),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserPublic = z.infer<typeof userPublicSchema>;
