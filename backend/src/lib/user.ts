import { z } from "zod";

const MAX_NAME_LENGTH = 50;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;

// El username viaja en URLs y se muestra como autor de las reseñas, así que se
// limita a caracteres sin ambigüedad visual ni necesidad de escapado.
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export const NAME_ERROR = `firstName and lastName are required and must be at most ${MAX_NAME_LENGTH} characters`;

export const USERNAME_ERROR = `username must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters and contain only letters, numbers or underscores`;

/** Campos del usuario que pueden salir del backend: nunca incluye `password`. */
export const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  createdAt: true,
} as const;

/**
 * Son factories y no schemas ya montados porque el mensaje de "falta el campo"
 * cambia según el endpoint: en el registro es el agregado de todos los campos
 * obligatorios, y en el PATCH del perfil es el literal del propio campo.
 *
 * No se restringe el juego de caracteres: los nombres reales llevan tildes,
 * apóstrofos, guiones y espacios, y filtrarlos excluiría a gente de verdad.
 */
export function nameSchema(typeError: string) {
  return (
    z
      .string(typeError)
      .min(1, typeError)
      .trim()
      // Tras el `trim`, esto es lo que rechaza un nombre de sólo espacios.
      .min(1, NAME_ERROR)
      .max(MAX_NAME_LENGTH, NAME_ERROR)
  );
}

/**
 * Se conserva la capitalización que escribió el usuario, aunque la unicidad la
 * decida la collation `utf8mb4_unicode_ci` de MySQL, que es insensible a
 * mayúsculas: "Walter" y "walter" son el mismo usuario a propósito.
 */
export function usernameSchema(typeError: string) {
  return z
    .string(typeError)
    .min(1, typeError)
    .trim()
    .min(MIN_USERNAME_LENGTH, USERNAME_ERROR)
    .max(MAX_USERNAME_LENGTH, USERNAME_ERROR)
    .regex(USERNAME_PATTERN, USERNAME_ERROR);
}

/**
 * Traduce la violación de índice único de Prisma (P2002) al 409 que corresponda.
 * Se lee el error con casts en vez de importar las clases del cliente generado
 * para no acoplar los controladores a `src/generated`.
 */
export function uniqueConflictError(err: unknown): string | null {
  const code = (err as { code?: string }).code;
  if (code !== "P2002") return null;

  const target = String((err as { meta?: { target?: unknown } }).meta?.target ?? "");
  return target.includes("username") ? "username already taken" : "email already registered";
}
