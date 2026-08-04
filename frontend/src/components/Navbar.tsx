import { Clapperboard, Film, ListVideo, LogIn, LogOut } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { clearToken, isAuthenticated } from '../services/api'

const linkBase =
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors'

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive
    ? `${linkBase} bg-neutral-800 text-white`
    : `${linkBase} text-neutral-400 hover:bg-neutral-800/60 hover:text-white`
}

function Navbar() {
  const navigate = useNavigate()
  const authenticated = isAuthenticated()

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <h1 className="mr-auto text-lg font-bold tracking-tight text-white">
          <Link to="/" className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-amber-400" aria-hidden="true" />
            CineTracker
          </Link>
        </h1>

        <NavLink to="/" end className={navLinkClass}>
          <Film className="h-4 w-4" aria-hidden="true" />
          Inicio
        </NavLink>

        <NavLink to="/watchlist" className={navLinkClass}>
          <ListVideo className="h-4 w-4" aria-hidden="true" />
          Mi Lista
        </NavLink>

        {authenticated ? (
          <button type="button" onClick={handleLogout} className={`${linkBase} text-neutral-400 hover:bg-neutral-800/60 hover:text-white`}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar sesión
          </button>
        ) : (
          <NavLink to="/login" className={navLinkClass}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Iniciar sesión
          </NavLink>
        )}
      </nav>
    </header>
  )
}

export default Navbar
