/**
 * Espejo de la política de `backend/src/lib/password.ts`. Si las reglas cambian
 * allí hay que cambiarlas aquí, o la barra se pondrá verde sobre una contraseña
 * que el servidor rechaza con un 400. El backend siempre manda: esto sólo existe
 * para poder avisar mientras se escribe.
 */
export const MIN_LENGTH = 8

/** A partir de aquí la contraseña se considera fuerte, más allá del mínimo. */
export const STRONG_LENGTH = 12

/** El tope de bcrypt; el backend lo rechaza por encima. */
export const MAX_LENGTH = 72

export type PasswordRequirement = 'length' | 'uppercase' | 'lowercase' | 'number' | 'special'

export type PasswordStrength = 'weak' | 'medium' | 'strong'

export interface PasswordCheck {
  /** Requisitos obligatorios sin cumplir. Vacío significa que se puede enviar. */
  missing: PasswordRequirement[]
  strength: PasswordStrength
  /** Atajo para el `disabled` del submit. Deriva de `missing`, así que no pueden contradecirse. */
  isValid: boolean
}

const RULES: Array<[PasswordRequirement, (password: string) => boolean]> = [
  ['length', (password) => password.length >= MIN_LENGTH && password.length <= MAX_LENGTH],
  ['uppercase', (password) => /[A-Z]/.test(password)],
  ['lowercase', (password) => /[a-z]/.test(password)],
  ['number', (password) => /[0-9]/.test(password)],
  ['special', (password) => /[^A-Za-z0-9]/.test(password)],
]

export function checkPassword(password: string): PasswordCheck {
  const missing = RULES.filter(([, passes]) => !passes(password)).map(([requirement]) => requirement)
  const isValid = missing.length === 0

  // Mientras falte un requisito la contraseña es débil por larga que sea: veinte
  // caracteres sin mayúscula no son fuertes, son inválidos.
  const strength: PasswordStrength = !isValid
    ? 'weak'
    : password.length >= STRONG_LENGTH
      ? 'strong'
      : 'medium'

  return { missing, strength, isValid }
}
