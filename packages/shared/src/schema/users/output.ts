import { z } from 'zod';

import { userPublicSchema } from './commonSchema';

export const usersRegisterOutputSchema = z.object({
  token: z.string().min(1),
  user: userPublicSchema,
});

export type UsersRegisterOutput = z.infer<typeof usersRegisterOutputSchema>;
