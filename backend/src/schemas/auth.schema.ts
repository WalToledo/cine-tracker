import { z } from "zod";

import { passwordSchema } from "../lib/password";
import { nameSchema, usernameSchema } from "../lib/user";

/**
 * Todos los campos obligatorios comparten este mensaje cuando faltan o no son
 * texto. Así el 400 no depende de qué campo evalúe Zod primero, y el mensaje
 * sigue nombrando a todos, que es lo que espera `auth.test.ts`.
 */
export const REGISTER_REQUIRED_ERROR =
  "email, password, firstName, lastName and username are required";

export const LOGIN_REQUIRED_ERROR = "email and password are required";

export const EMAIL_ERROR = "email must be a valid email address";

/** Un `String` sin anotar es `VARCHAR(191)` en MySQL. */
const MAX_EMAIL_LENGTH = 191;

/**
 * Se normaliza a minúsculas antes de validar. Es inocuo para las cuentas ya
 * creadas porque el índice único hereda la collation `utf8mb4_unicode_ci`, que
 * tampoco distingue mayúsculas.
 */
function emailSchema(typeError: string) {
  return z
    .string(typeError)
    .min(1, typeError)
    .trim()
    .toLowerCase()
    .max(MAX_EMAIL_LENGTH, EMAIL_ERROR)
    .pipe(z.email(EMAIL_ERROR));
}

export const registerSchema = z.strictObject({
  email: emailSchema(REGISTER_REQUIRED_ERROR),
  password: passwordSchema(REGISTER_REQUIRED_ERROR),
  firstName: nameSchema(REGISTER_REQUIRED_ERROR),
  lastName: nameSchema(REGISTER_REQUIRED_ERROR),
  username: usernameSchema(REGISTER_REQUIRED_ERROR),
});

/**
 * El login **no** aplica la política de contraseñas: las cuentas creadas antes
 * del Step 11 tienen contraseñas que ya no pasarían el registro y tienen que
 * poder seguir entrando.
 */
export const loginSchema = z.strictObject({
  email: z.string(LOGIN_REQUIRED_ERROR).min(1, LOGIN_REQUIRED_ERROR).trim().toLowerCase(),
  password: z.string(LOGIN_REQUIRED_ERROR).min(1, LOGIN_REQUIRED_ERROR),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
