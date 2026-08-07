/**
 * Espejo de las reglas de los campos del registro, igual que `services/password.ts`
 * lo es de `backend/src/lib/password.ts`. Los workspaces no comparten módulos, así
 * que si una regla cambia en el backend hay que cambiarla aquí, o el formulario
 * dejará pasar algo que el servidor rechaza con un 400 (o al revés, y entonces
 * bloquea un valor perfectamente válido, que es peor).
 *
 * El backend siempre manda: esto sólo existe para poder avisar antes del viaje.
 */

export type AuthField = 'email' | 'password' | 'firstName' | 'lastName' | 'username'

export type AuthFieldErrors = Partial<Record<AuthField, string>>

/**
 * Es el patrón por defecto de `z.email()` en Zod 4, copiado literal. No conviene
 * escribir uno propio: el backend valida con éste (`schemas/auth.schema.ts`) y
 * cualquier variante crearía emails que un lado acepta y el otro no.
 */
const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i

/** Un `String` sin anotar es `VARCHAR(191)` en MySQL; el backend corta ahí. */
const MAX_EMAIL_LENGTH = 191

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/
const MIN_USERNAME_LENGTH = 3
const MAX_USERNAME_LENGTH = 30

const MAX_NAME_LENGTH = 50

/**
 * Los dos mensajes que también puede producir el backend se exportan para que
 * `services/errors.ts` traduzca su 400 con este mismo texto. El usuario lee uno u
 * otro según si el cliente llegó a validar antes de enviar, y dos redacciones
 * distintas para el mismo problema se notan.
 */
export const EMAIL_ERROR = 'Email no es válido'

export const USERNAME_ERROR = `El usuario necesita entre ${MIN_USERNAME_LENGTH} y ${MAX_USERNAME_LENGTH} caracteres y sólo admite letras, números y guion bajo`

const REQUIRED_ERRORS: Record<AuthField, string> = {
  email: 'Escribe tu email',
  password: 'Escribe tu contraseña',
  firstName: 'Escribe tu nombre',
  lastName: 'Escribe tus apellidos',
  username: 'Elige un nombre de usuario',
}

interface ValidateOptions {
  /** El registro pide nombre, apellidos y usuario; el login sólo email y contraseña. */
  withProfileFields?: boolean
  /**
   * En false sólo se comprueba que no falte nada, que es el modo del login. El
   * formato queda para el registro por la misma razón que la política de
   * contraseñas: una cuenta anterior al Step 11 tiene que poder seguir entrando
   * aunque su email no pasara hoy el patrón.
   */
  withFieldRules?: boolean
}

function validateName(value: string, field: 'firstName' | 'lastName'): string | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return REQUIRED_ERRORS[field]
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Máximo ${MAX_NAME_LENGTH} caracteres`
  }
  return undefined
}

/** Devuelve sólo los campos con problema; un objeto vacío significa que se puede enviar. */
export function validateAuthFields(
  values: Record<AuthField, string>,
  { withProfileFields, withFieldRules }: ValidateOptions = {},
): AuthFieldErrors {
  const errors: AuthFieldErrors = {}

  const email = values.email.trim()
  if (email === '') {
    errors.email = REQUIRED_ERRORS.email
  } else if (withFieldRules && (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email))) {
    errors.email = EMAIL_ERROR
  }

  // La política de contraseñas no se comprueba aquí: de eso ya se encarga
  // `PasswordStrength`, que además explica qué falta en vez de sólo negarlo.
  if (values.password === '') {
    errors.password = REQUIRED_ERRORS.password
  }

  if (withProfileFields) {
    const firstName = validateName(values.firstName, 'firstName')
    if (firstName) errors.firstName = firstName

    const lastName = validateName(values.lastName, 'lastName')
    if (lastName) errors.lastName = lastName

    const username = values.username.trim()
    if (username === '') {
      errors.username = REQUIRED_ERRORS.username
    } else if (
      withFieldRules &&
      (username.length < MIN_USERNAME_LENGTH ||
        username.length > MAX_USERNAME_LENGTH ||
        !USERNAME_PATTERN.test(username))
    ) {
      errors.username = USERNAME_ERROR
    }
  }

  return errors
}
