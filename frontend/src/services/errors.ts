import { ApiError, clearSession } from './api'
import { EMAIL_ERROR, USERNAME_ERROR } from './validation'

// El backend responde `{ error }` en inglés y la UI habla español. Las claves son
// literales de los controladores: si cambian allí, dejan de traducir aquí en silencio
// (por eso cada llamada pasa su propio texto de reserva).
const MESSAGES: Record<string, string> = {
  'email already registered': 'Ese email ya tiene una cuenta',
  'username already taken': 'Ese nombre de usuario ya está en uso',
  'email and password are required': 'Escribe tu email y tu contraseña',
  'Invalid credentials': 'Email o contraseña incorrectos',
  'Missing authorization token': 'Tu sesión ha caducado, vuelve a entrar',
  'Invalid or expired token': 'Tu sesión ha caducado, vuelve a entrar',
  'movie already in watchlist': 'Esa película ya está en tu lista',
  'watchlist item not found': 'Esa película ya no está en tu lista',
  'you already reviewed this movie': 'Ya has reseñado esta película',
  'review not found': 'Esa reseña ya no existe',
  'user not found': 'No encontramos tu cuenta',

  // Validación (Step 11). Las claves son el texto ya interpolado que producen
  // `backend/src/lib/password.ts` y `backend/src/lib/user.ts`: los workspaces no
  // comparten módulos, así que cambiar allí un límite obliga a copiarlo aquí.
  'email, password, firstName, lastName and username are required':
    'Rellena todos los campos',
  // Se importan de `validation.ts` en vez de copiarlos: son los dos casos que el
  // formulario también detecta por su cuenta, y el usuario ve uno u otro según si
  // el cliente llegó a validar antes de enviar.
  'email must be a valid email address': EMAIL_ERROR,
  'password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character':
    'La contraseña no cumple los requisitos',
  'password must be at most 72 characters': 'La contraseña es demasiado larga',
  'firstName and lastName are required and must be at most 50 characters':
    'Revisa el nombre y los apellidos',
  'username must be 3-30 characters and contain only letters, numbers or underscores':
    USERNAME_ERROR,
  'firstName, lastName or username is required': 'Cambia algún dato antes de guardar',
}

/**
 * `fallback` cubre lo que no está en el diccionario: fallos de red, un 500 o un
 * mensaje nuevo del backend. Nunca se enseña el texto crudo en inglés.
 */
export function translateError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && MESSAGES[err.message]) {
    return MESSAGES[err.message]
  }
  return fallback
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401
}

/**
 * Un 401 significa que la cookie de sesión ya no vale. Hay que borrar el usuario
 * guardado o `ProtectedRoute` sigue viéndolo y deja entrar a una sesión muerta.
 * La cookie no hace falta tocarla: el backend no la aceptará más.
 */
export function handleUnauthorized(): void {
  clearSession()
}
