import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Clapperboard, Film, ListVideo, LogIn, LogOut, Search } from 'lucide-react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
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
  const [searchParams] = useSearchParams()
  const authenticated = isAuthenticated()
  const queryParam = searchParams.get('q') ?? ''
  const [term, setTerm] = useState(queryParam)

  // La URL manda: al recargar /search o volver atrás, el input refleja el `?q`.
  useEffect(() => {
    setTerm(queryParam)
  }, [queryParam])

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = term.trim()
    if (!trimmed) return

    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight text-white">
          <Link to="/" className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-amber-400" aria-hidden="true" />
            CineTracker
          </Link>
        </h1>

        {/* El `mr-auto` vive aquí para que los enlaces sigan pegados a la derecha. */}
        <form role="search" onSubmit={handleSearch} className="mr-auto w-full max-w-3xs sm:max-w-xs">
          <label className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 focus-within:border-neutral-600">
            <Search className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Buscar películas"
              aria-label="Buscar películas"
              className="w-full bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
            />
          </label>
        </form>

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
