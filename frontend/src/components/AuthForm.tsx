import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import PasswordStrength from './PasswordStrength'
import { MAX_LENGTH, checkPassword } from '../services/password'
import { validateAuthFields } from '../services/validation'
import type { AuthField, AuthFieldErrors } from '../services/validation'

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
  /**
   * Ídem para el formato de email y usuario: el login sólo comprueba que los
   * campos no estén vacíos. Una cuenta vieja cuyo email no pasara el patrón de
   * hoy quedaría fuera para siempre si aquí se validara el formato.
   */
  withFieldRules?: boolean
  onSubmit: (values: AuthFormValues) => Promise<void>
  footer: ReactNode
}

/** Orden visual de los campos; decide a cuál salta el foco al fallar el envío. */
const FIELD_ORDER: AuthField[] = ['firstName', 'lastName', 'username', 'email', 'password']

/**
 * No lleva `role="alert"`: el aviso ya viaja por el `aria-describedby` del input,
 * y varias regiones `alert` a la vez se pisarían entre ellas y con el banner del
 * servidor, que sí es un `alert`.
 */
function FieldError({ field, message }: { field: AuthField; message?: string }) {
  if (!message) return null

  return (
    <p id={`${field}-error`} className="flex items-start gap-1.5 text-xs text-red-400">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

function AuthForm({
  title,
  submitLabel,
  withProfileFields,
  withPasswordRules,
  withFieldRules,
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
  /**
   * Contiene exactamente los avisos que se están pintando, no todos los campos
   * inválidos: un campo a medio escribir aún no ha fallado nada a ojos del
   * usuario. Se llena al salir del campo y al enviar.
   */
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const blockedByPassword = Boolean(withPasswordRules) && !checkPassword(values.password).isValid

  const options = { withProfileFields, withFieldRules }

  function update(field: keyof AuthFormValues, value: string) {
    const next = { ...values, [field]: value }
    setValues(next)

    // Sólo se revalida lo que ya estaba en rojo, para que el aviso se borre en
    // cuanto el campo se corrige sin empezar a acusar a los demás.
    if (fieldErrors[field]) {
      const message = validateAuthFields(next, options)[field]
      setFieldErrors((current) => ({ ...current, [field]: message }))
    }
  }

  function handleBlur(field: keyof AuthFormValues) {
    const message = validateAuthFields(values, options)[field]
    setFieldErrors((current) => ({ ...current, [field]: message }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const found = validateAuthFields(values, options)
    if (Object.keys(found).length > 0) {
      setFieldErrors(found)
      setError(null)
      // Sin esto el usuario tendría que buscar a ojo cuál de los cinco campos
      // se queja, que es justo lo que hacía bien el globo del navegador.
      const first = FIELD_ORDER.find((field) => found[field])
      if (first) document.getElementById(first)?.focus()
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      await onSubmit(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal, inténtalo de nuevo')
      setSubmitting(false)
    }
  }

  // Las clases van literales enteras porque Tailwind analiza el código como texto
  // y no ve las que se construyen interpolando.
  const baseInputClass =
    'w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600'
  const labelClass = 'text-sm font-medium text-neutral-300'

  function inputClass(field: keyof AuthFormValues) {
    return fieldErrors[field]
      ? `${baseInputClass} border-red-800 focus:border-red-500`
      : `${baseInputClass} border-neutral-800 focus:border-amber-500`
  }

  /** `undefined` y no `''`: un `aria-describedby` vacío apunta a ninguna parte. */
  function describedBy(field: keyof AuthFormValues, extra?: string) {
    const ids = [fieldErrors[field] ? `${field}-error` : null, extra].filter(Boolean)
    return ids.length > 0 ? ids.join(' ') : undefined
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-6 text-2xl font-bold text-white">{title}</h2>

      {/* `noValidate` es lo que apaga los globos nativos del navegador: sin él
          intercepta el envío antes de que React llegue a validar nada. */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
                  maxLength={50}
                  autoComplete="given-name"
                  aria-invalid={Boolean(fieldErrors.firstName)}
                  aria-describedby={describedBy('firstName')}
                  value={values.firstName}
                  onChange={(event) => update('firstName', event.target.value)}
                  onBlur={() => handleBlur('firstName')}
                  placeholder="Walter"
                  className={inputClass('firstName')}
                />
                <FieldError field="firstName" message={fieldErrors.firstName} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="lastName" className={labelClass}>
                  Apellidos
                </label>
                <input
                  id="lastName"
                  type="text"
                  maxLength={50}
                  autoComplete="family-name"
                  aria-invalid={Boolean(fieldErrors.lastName)}
                  aria-describedby={describedBy('lastName')}
                  value={values.lastName}
                  onChange={(event) => update('lastName', event.target.value)}
                  onBlur={() => handleBlur('lastName')}
                  placeholder="Toledo"
                  className={inputClass('lastName')}
                />
                <FieldError field="lastName" message={fieldErrors.lastName} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className={labelClass}>
                Nombre de usuario
              </label>
              <input
                id="username"
                type="text"
                maxLength={30}
                autoComplete="username"
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={describedBy('username')}
                value={values.username}
                onChange={(event) => update('username', event.target.value)}
                onBlur={() => handleBlur('username')}
                placeholder="cinefila"
                className={inputClass('username')}
              />
              <FieldError field="username" message={fieldErrors.username} />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          {/* `type="email"` se queda por el teclado del móvil; con `noValidate`
              ya no valida nada por su cuenta. */}
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={describedBy('email')}
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
            onBlur={() => handleBlur('email')}
            placeholder="tu@email.com"
            className={inputClass('email')}
          />
          <FieldError field="email" message={fieldErrors.email} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelClass}>
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              maxLength={MAX_LENGTH}
              autoComplete={withProfileFields ? 'new-password' : 'current-password'}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={describedBy(
                'password',
                withPasswordRules ? 'password-strength' : undefined,
              )}
              value={values.password}
              onChange={(event) => update('password', event.target.value)}
              onBlur={() => handleBlur('password')}
              placeholder="••••••••"
              className={`${inputClass('password')} pr-10`}
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

          <FieldError field="password" message={fieldErrors.password} />

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
