import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import { authApi, setToken } from '../services/api'

function Register() {
  const navigate = useNavigate()
  const location = useLocation()

  // Se conserva la ruta de origen igual que en Login, para no perderla al
  // pasar de "Inicia sesión" a "Regístrate".
  const state = location.state as { from?: string } | null
  const from = state?.from?.startsWith('/') ? state.from : '/'

  async function handleRegister(email: string, password: string) {
    const { token } = await authApi.register(email, password)
    setToken(token)
    navigate(from, { replace: true })
  }

  return (
    <AuthForm
      title="Crear cuenta"
      submitLabel="Registrarme"
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
