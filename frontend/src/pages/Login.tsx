import { Link, useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import { authApi, setToken } from '../services/api'

function Login() {
  const navigate = useNavigate()

  async function handleLogin(email: string, password: string) {
    const { token } = await authApi.login(email, password)
    setToken(token)
    navigate('/')
  }

  return (
    <AuthForm
      title="Iniciar sesión"
      submitLabel="Entrar"
      onSubmit={handleLogin}
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-amber-400 hover:text-amber-300">
            Regístrate
          </Link>
        </>
      }
    />
  )
}

export default Login
