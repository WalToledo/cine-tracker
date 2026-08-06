import { ApiError, clearToken } from './api'

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
 * Un 401 con token guardado significa que ese token ya no vale. Hay que borrarlo o
 * `ProtectedRoute` sigue viéndolo y deja entrar a una sesión muerta.
 */
export function handleUnauthorized(): void {
  clearToken()
}
