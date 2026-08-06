import { describe, expect, it } from 'vitest'
import { MAX_LENGTH, checkPassword } from './password'

/**
 * La misma tabla vive en `backend/src/__tests__/password.test.ts`: son dos
 * implementaciones de la misma política en runtimes que no comparten módulos, y
 * si una cambia hay que editar las dos.
 */
const CASES: Array<{ password: string; valid: boolean; reason: string }> = [
  { password: 'abc', valid: false, reason: 'demasiado corta' },
  { password: 'abcdefgh', valid: false, reason: 'sin mayúscula, número ni símbolo' },
  { password: 'Abcdefgh', valid: false, reason: 'sin número ni símbolo' },
  { password: 'Abcdefg1', valid: false, reason: 'sin símbolo' },
  { password: 'ABC12345!', valid: false, reason: 'sin minúscula' },
  { password: 'abc12345!', valid: false, reason: 'sin mayúscula' },
  { password: 'Abcdefg!', valid: false, reason: 'sin número' },
  { password: 'Abc1234!', valid: true, reason: 'el mínimo exacto de 8' },
  { password: 'Abc12345!', valid: true, reason: 'cumple el mínimo' },
  { password: 'Abc12345!xyzQ', valid: true, reason: 'cumple y es larga' },
]

describe('checkPassword', () => {
  for (const { password, valid, reason } of CASES) {
    it(`${valid ? 'accepts' : 'rejects'} ${JSON.stringify(password)} (${reason})`, () => {
      expect(checkPassword(password).isValid).toBe(valid)
    })
  }

  it('reports every requirement as missing for an empty password', () => {
    const { missing, strength, isValid } = checkPassword('')

    expect(missing).toEqual(['length', 'uppercase', 'lowercase', 'number', 'special'])
    expect(strength).toBe('weak')
    expect(isValid).toBe(false)
  })

  it('names only the requirement that is actually missing', () => {
    expect(checkPassword('Abcdefg1').missing).toEqual(['special'])
    expect(checkPassword('abc12345!').missing).toEqual(['uppercase'])
  })

  it('grades a password that just meets the minimum as medium', () => {
    expect(checkPassword('Abc12345!').strength).toBe('medium')
  })

  it('grades a long compliant password as strong', () => {
    expect(checkPassword('Abc12345!xyzQ').strength).toBe('strong')
  })

  // Longitud no es fortaleza: sin los cuatro tipos de carácter sigue siendo débil.
  it('keeps a long password weak while a requirement is missing', () => {
    expect(checkPassword('abcdefghijklm').strength).toBe('weak')
  })

  it('rejects a password over the bcrypt limit', () => {
    expect(checkPassword(`Aa1!${'x'.repeat(MAX_LENGTH)}`).isValid).toBe(false)
  })
})
