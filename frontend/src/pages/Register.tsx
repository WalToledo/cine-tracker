import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import type { AuthFormValues } from '../components/AuthForm'
import { ApiError, authApi, setToken } from '../services/api'

// El backend responde en inglés; los mensajes de usuario van en español.
const ERRORS: Record<string, string> = {
  'email already registered': 'Ese email ya tiene una cuenta',
  'username already taken': 'Ese nombre de usuario ya está en uso',
}

function translateError(err: unknown): string {
  if (err instanceof ApiError && ERRORS[err.message]) {
    return ERRORS[err.message]
  }
  return 'No se pudo crear la cuenta'
}

function Register() {
  const navigate = useNavigate()
  const location = useLocation()

  // Se conserva la ruta de origen igual que en Login, para no perderla al
  // pasar de "Inicia sesión" a "Regístrate".
  const state = location.state as { from?: string } | null
  const from = state?.from?.startsWith('/') ? state.from : '/'

  async function handleRegister(values: AuthFormValues) {
    try {
      const { token } = await authApi.register(values)
      setToken(token)
      navigate(from, { replace: true })
    } catch (err) {
      throw new Error(translateError(err))
    }
  }

  return (
    <AuthForm
      title="Crear cuenta"
      submitLabel="Registrarme"
      withProfileFields
      onSubmit={handleRegister}
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            state={{ from }}
            className="font-medium text-amber-400 hover:text-amber-300"
          >
            Inicia sesión
          </Link>
        </>
      }
    />
  )
}

export default Register
