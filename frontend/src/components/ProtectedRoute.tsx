import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../services/api'

/** Deja pasar sólo si hay sesión guardada; si no, redirige a /login. */
function ProtectedRoute() {
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export default ProtectedRoute
