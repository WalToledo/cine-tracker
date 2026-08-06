import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import type { AuthFormValues } from '../components/AuthForm'
import { authApi, setToken } from '../services/api'
import { translateError } from '../services/errors'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  // Quien nos redirigió aquí (ProtectedRoute o MovieDetail) deja la ruta de
  // origen en el state; sólo se acepta si es interna.
  const state = location.state as { from?: string } | null
  const from = state?.from?.startsWith('/') ? state.from : '/'

  async function handleLogin({ email, password }: AuthFormValues) {
    try {
      const { token } = await authApi.login(email, password)
      setToken(token)
      navigate(from, { replace: true })
    } catch (err) {
      // `AuthForm` pinta lo que se lance; sin esto llegaba el inglés del backend.
      throw new Error(translateError(err, 'No se pudo iniciar sesión'))
    }
  }

  return (
    <AuthForm
      title="Iniciar sesión"
      submitLabel="Entrar"
      onSubmit={handleLogin}
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link
            to="/register"
            state={{ from }}
            className="font-medium text-amber-400 hover:text-amber-300"
          >
            Regístrate
          </Link>
        </>
      }
    />
  )
}

export default Login
