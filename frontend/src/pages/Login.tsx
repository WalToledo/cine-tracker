import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import { authApi, setToken } from '../services/api'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  // Quien nos redirigió aquí (ProtectedRoute o MovieDetail) deja la ruta de
  // origen en el state; sólo se acepta si es interna.
  const state = location.state as { from?: string } | null
  const from = state?.from?.startsWith('/') ? state.from : '/'

  async function handleLogin(email: string, password: string) {
    const { token } = await authApi.login(email, password)
    setToken(token)
    navigate(from, { replace: true })
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
