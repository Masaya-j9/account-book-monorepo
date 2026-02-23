import { z } from 'zod';

import { userPublicSchema } from './commonSchema';

const authOutputSchema = z.object({
  token: z.string().min(1),
  user: userPublicSchema,
});

export const usersRegisterOutputSchema = authOutputSchema;
export type UsersRegisterOutput = z.infer<typeof usersRegisterOutputSchema>;

export const usersLoginOutputSchema = authOutputSchema;
export type UsersLoginOutput = z.infer<typeof usersLoginOutputSchema>;
