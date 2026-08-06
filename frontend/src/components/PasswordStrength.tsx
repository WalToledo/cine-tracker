import { Check, X } from 'lucide-react'
import { MIN_LENGTH, checkPassword } from '../services/password'
import type { PasswordRequirement } from '../services/password'

/**
 * Las clases van literales enteras: Tailwind analiza el código como texto y no ve
 * las que se construyen interpolando (`bg-${color}-500` nunca se compila).
 */
const LEVELS = {
  weak: { label: 'Débil', value: 1, bar: 'w-1/3 bg-red-500', text: 'text-red-300' },
  medium: { label: 'Normal', value: 2, bar: 'w-2/3 bg-amber-500', text: 'text-amber-400' },
  strong: { label: 'Fuerte', value: 3, bar: 'w-full bg-emerald-500', text: 'text-emerald-300' },
} as const

const REQUIREMENTS: Array<{ id: PasswordRequirement; label: string }> = [
  { id: 'length', label: `Al menos ${MIN_LENGTH} caracteres` },
  { id: 'uppercase', label: 'Una letra mayúscula' },
  { id: 'lowercase', label: 'Una letra minúscula' },
  { id: 'number', label: 'Un número' },
  { id: 'special', label: 'Un carácter especial' },
]

interface PasswordStrengthProps {
  password: string
  /** Para engancharlo al `aria-describedby` del input. */
  id?: string
}

function PasswordStrength({ password, id }: PasswordStrengthProps) {
  const { missing, strength } = checkPassword(password)
  const level = LEVELS[strength]

  return (
    <div id={id} className="flex flex-col gap-2 pt-1">
      <div className="flex items-center gap-2">
        {/*
          El `progressbar` ya anuncia el nivel por `aria-valuetext`; una región
          `aria-live` encima lo repetiría en cada pulsación de tecla.
        */}
        <div
          role="progressbar"
          aria-label="Seguridad de la contraseña"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={level.value}
          aria-valuetext={level.label}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800"
        >
          <div className={`h-full rounded-full transition-all ${level.bar}`} />
        </div>
        <span className={`text-xs font-medium ${level.text}`}>{level.label}</span>
      </div>

      <ul className="flex flex-col gap-1">
        {REQUIREMENTS.map(({ id: requirement, label }) => {
          const done = !missing.includes(requirement)

          return (
            <li key={requirement} className="flex items-center gap-1.5 text-xs">
              {done ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 text-neutral-600" aria-hidden="true" />
              )}
              <span className={done ? 'text-neutral-400' : 'text-neutral-500'}>{label}</span>
              {/* Los iconos son decorativos: sin esto el estado sólo se percibiría por el color. */}
              <span className="sr-only">{done ? 'cumplido' : 'pendiente'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default PasswordStrength
