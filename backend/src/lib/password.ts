import { z } from "zod";

/**
 * Política de contraseñas del registro. Estas reglas están duplicadas en
 * `frontend/src/services/password.ts`, que alimenta la barra de fortaleza: si se
 * cambian aquí hay que cambiarlas allí, o la barra se pondrá verde sobre una
 * contraseña que el backend rechaza con un 400.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** A partir de aquí la barra del frontend marca "fuerte". El backend no lo exige. */
export const STRONG_PASSWORD_LENGTH = 12;

/**
 * bcrypt trunca la entrada a 72 bytes: por encima, dos contraseñas distintas
 * producirían el mismo hash. Se cuenta en caracteres, no en bytes, así que con
 * texto multibyte el límite real llega antes; basta para cerrar el agujero.
 */
export const MAX_PASSWORD_LENGTH = 72;

const UPPERCASE = /[A-Z]/;
const LOWERCASE = /[a-z]/;
const DIGIT = /[0-9]/;

/** "Especial" es todo lo que no sea letra ASCII ni dígito, incluidos espacios y tildes. */
const SPECIAL = /[^A-Za-z0-9]/;

/**
 * Un único mensaje para las cinco reglas. El frontend traduce por el texto
 * literal, así que cinco mensajes serían cinco entradas del diccionario que
 * mantener sincronizadas; y la checklist de la UI ya dice cuál falta.
 */
export const PASSWORD_ERROR = `password must be at least ${MIN_PASSWORD_LENGTH} characters and include an uppercase letter, a lowercase letter, a number and a special character`;

export const PASSWORD_TOO_LONG_ERROR = `password must be at most ${MAX_PASSWORD_LENGTH} characters`;

/**
 * `typeError` es el mensaje de "falta el campo o no es texto", que cambia según
 * el endpoint: en el registro es el agregado de todos los campos obligatorios.
 *
 * No lleva `.trim()` a propósito: recortar una contraseña la cambia en silencio
 * y el usuario la volvería a teclear igual sin poder entrar.
 */
export function passwordSchema(typeError: string) {
  return (
    z
      .string(typeError)
      .min(1, typeError)
      // El máximo va antes que el resto para que una contraseña larguísima
      // reciba su propio mensaje en vez del genérico de complejidad.
      .max(MAX_PASSWORD_LENGTH, PASSWORD_TOO_LONG_ERROR)
      .min(MIN_PASSWORD_LENGTH, PASSWORD_ERROR)
      .regex(UPPERCASE, PASSWORD_ERROR)
      .regex(LOWERCASE, PASSWORD_ERROR)
      .regex(DIGIT, PASSWORD_ERROR)
      .regex(SPECIAL, PASSWORD_ERROR)
  );
}
