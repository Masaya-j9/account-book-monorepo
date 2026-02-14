import { z } from 'zod';

import {
  USER_EMAIL_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
} from './constants';

const PASSWORD_SYMBOL_REGEX = /[^A-Za-z0-9]/;

export const usersRegisterInputSchema = z.object({
  email: z
    .email('メールアドレスの形式が不正です')
    .max(
      USER_EMAIL_MAX_LENGTH,
      `メールアドレスは${USER_EMAIL_MAX_LENGTH}文字以内である必要があります`,
    ),
  name: z
    .string()
    .min(1, 'ユーザー名は必須です')
    .max(
      USER_NAME_MAX_LENGTH,
      `ユーザー名は${USER_NAME_MAX_LENGTH}文字以内である必要があります`,
    ),
  password: z
    .string()
    .min(
      USER_PASSWORD_MIN_LENGTH,
      `パスワードは${USER_PASSWORD_MIN_LENGTH}文字以上である必要があります`,
    )
    .regex(
      PASSWORD_SYMBOL_REGEX,
      'パスワードには記号を1文字以上含めてください',
    ),
});

export type UsersRegisterInput = z.infer<typeof usersRegisterInputSchema>;
