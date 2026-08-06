import { z } from "zod";

import { NAME_ERROR, USERNAME_ERROR, nameSchema, usernameSchema } from "../lib/user";

export const EMPTY_PATCH_ERROR = "firstName, lastName or username is required";

/**
 * Es un PATCH parcial: cada campo es opcional, pero un cuerpo sin ninguno es un
 * 400 y no un no-op. Zod omite del resultado las claves ausentes, así que el
 * objeto validado se le puede pasar tal cual a `prisma.user.update`.
 *
 * Aquí el mensaje de tipo ya no puede ser el agregado del registro: sin campos
 * obligatorios, lo que corresponde es el literal de cada uno.
 */
export const updateProfileSchema = z
  .strictObject({
    firstName: nameSchema(NAME_ERROR).optional(),
    lastName: nameSchema(NAME_ERROR).optional(),
    username: usernameSchema(USERNAME_ERROR).optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), EMPTY_PATCH_ERROR);

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
