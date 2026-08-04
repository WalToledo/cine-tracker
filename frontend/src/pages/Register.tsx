import { Link, useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import { authApi, setToken } from '../services/api'

function Register() {
  const navigate = useNavigate()

  async function handleRegister(email: string, password: string) {
    const { token } = await authApi.register(email, password)
    setToken(token)
    navigate('/')
  }

  return (
    <AuthForm
      title="Crear cuenta"
      submitLabel="Registrarme"
      onSubmit={handleRegister}
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-amber-400 hover:text-amber-300">
            Inicia sesión
          </Link>
        </>
      }
    />
  )
}

export default Register
