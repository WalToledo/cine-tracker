import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import PasswordStrength from './PasswordStrength'
import { MAX_LENGTH, MIN_LENGTH, checkPassword } from '../services/password'

export interface AuthFormValues {
  email: string
  password: string
  firstName: string
  lastName: string
  username: string
}

interface AuthFormProps {
  title: string
  submitLabel: string
  /** El registro pide nombre, apellidos y usuario; el login sólo email y contraseña. */
  withProfileFields?: boolean
  /**
   * Sólo el registro impone la política de contraseñas. Va aparte de
   * `withProfileFields` porque son cosas distintas, y sobre todo porque el login
   * debe seguir dejando entrar a las cuentas anteriores al Step 11.
   */
  withPasswordRules?: boolean
  onSubmit: (values: AuthFormValues) => Promise<void>
  footer: ReactNode
}

function AuthForm({
  title,
  submitLabel,
  withProfileFields,
  withPasswordRules,
  onSubmit,
  footer,
}: AuthFormProps) {
  const [values, setValues] = useState<AuthFormValues>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    username: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const blockedByPassword = Boolean(withPasswordRules) && !checkPassword(values.password).isValid

  function update(field: keyof AuthFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await onSubmit(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal, inténtalo de nuevo')
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-amber-500'
  const labelClass = 'text-sm font-medium text-neutral-300'

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-6 text-2xl font-bold text-white">{title}</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {withProfileFields && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="firstName" className={labelClass}>
                  Nombre
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  maxLength={50}
                  autoComplete="given-name"
                  value={values.firstName}
                  onChange={(event) => update('firstName', event.target.value)}
                  placeholder="Walter"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="lastName" className={labelClass}>
                  Apellidos
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  maxLength={50}
                  autoComplete="family-name"
                  value={values.lastName}
                  onChange={(event) => update('lastName', event.target.value)}
                  placeholder="Toledo"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className={labelClass}>
                Nombre de usuario
              </label>
              <input
                id="username"
                type="text"
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_]+"
                // Sin `title` el navegador muestra un aviso de patrón indescifrable.
                title="Sólo letras, números y guion bajo"
                autoComplete="username"
                value={values.username}
                onChange={(event) => update('username', event.target.value)}
                placeholder="cinefila"
                className={inputClass}
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="tu@email.com"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelClass}>
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={MIN_LENGTH}
              maxLength={MAX_LENGTH}
              autoComplete={withProfileFields ? 'new-password' : 'current-password'}
              aria-describedby={withPasswordRules ? 'password-strength' : undefined}
              value={values.password}
              onChange={(event) => update('password', event.target.value)}
              placeholder="••••••••"
              className={`${inputClass} pr-10`}
            />
            {/* `type="button"` es obligatorio: dentro de un form, un botón sin tipo lo envía. */}
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500 transition-colors hover:text-neutral-300"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Con el campo vacío no se pinta: recibir cinco cruces rojas al abrir
              el formulario es acusatorio y no ayuda a nadie. */}
          {withPasswordRules && values.password !== '' && (
            <PasswordStrength id="password-strength" password={values.password} />
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || blockedByPassword}
          className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-400"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitLabel}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-400">{footer}</p>
    </div>
  )
}

export default AuthForm
