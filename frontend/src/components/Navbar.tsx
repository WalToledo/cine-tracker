import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Clapperboard, Film, ListVideo, LogIn, LogOut, Search, UserRound } from 'lucide-react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import SearchSuggestions from './SearchSuggestions'
import type { SuggestionGroup } from './SearchSuggestions'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { authApi, clearSession, isAuthenticated } from '../services/api'
import { addRecentSearch, getRecentSearches } from '../services/recentSearches'
import type { RecentMovie } from '../services/recentSearches'
import { getTrendingMovies, searchMovies } from '../services/tmdb'
import type { Movie } from '../services/tmdb'

const linkBase =
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors'

/** Con una sola letra los resultados son ruido: se espera a la segunda. */
const MIN_QUERY_LENGTH = 2
const SUGGESTIONS_LIMIT = 7
const RECENT_LIMIT = 4
const TRENDING_LIMIT = 6
const DEBOUNCE_MS = 250
const LISTBOX_ID = 'search-suggestions'

function optionId(index: number): string {
  return `search-suggestion-${index}`
}

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

  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [recent, setRecent] = useState<RecentMovie[]>([])
  const [trending, setTrending] = useState<Movie[]>([])
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [trendingError, setTrendingError] = useState<string | null>(null)
  const [results, setResults] = useState<Movie[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)

  const formRef = useRef<HTMLFormElement>(null)
  // Las tendencias cambian por semana: basta con pedirlas una vez por sesión.
  const trendingRequested = useRef(false)

  const debounced = useDebouncedValue(term, DEBOUNCE_MS)
  const query = debounced.trim()
  const searching = query.length >= MIN_QUERY_LENGTH

  // La URL manda: al recargar /search o volver atrás, el input refleja el `?q`.
  useEffect(() => {
    setTerm(queryParam)
  }, [queryParam])

  useEffect(() => {
    if (!open || searching || trendingRequested.current) return

    trendingRequested.current = true
    let active = true
    let settled = false
    setTrendingLoading(true)

    getTrendingMovies()
      .then((movies) => {
        settled = true
        if (active) setTrending(movies)
      })
      .catch((err: unknown) => {
        // Un fallo no puede dejar el ref marcado: si no, el panel nunca reintenta.
        trendingRequested.current = false
        settled = true
        if (active) {
          setTrendingError(err instanceof Error ? err.message : 'No se pudieron cargar las películas')
        }
      })
      .finally(() => {
        if (active) setTrendingLoading(false)
      })

    return () => {
      active = false
      // Si el panel se cierra antes de que llegue la respuesta, el `.finally` ya no
      // apaga el spinner. Se apaga aquí y se libera el ref, o al reabrir queda un
      // "cargando" perpetuo que nada vuelve a resolver.
      if (!settled) {
        trendingRequested.current = false
        setTrendingLoading(false)
      }
    }
  }, [open, searching])

  useEffect(() => {
    if (!searching) {
      setResults([])
      setResultsError(null)
      return
    }

    let active = true
    setResultsLoading(true)
    setResultsError(null)

    searchMovies(query, 1)
      .then((result) => {
        if (active) setResults(result.movies.slice(0, SUGGESTIONS_LIMIT))
      })
      .catch((err: unknown) => {
        if (!active) return
        setResults([])
        setResultsError(err instanceof Error ? err.message : 'No se pudo completar la búsqueda')
      })
      .finally(() => {
        if (active) setResultsLoading(false)
      })

    // Descarta la respuesta si el usuario ya escribió otra cosa.
    return () => {
      active = false
    }
  }, [query, searching])

  const groups = useMemo<SuggestionGroup[]>(() => {
    if (searching) {
      return results.length > 0 ? [{ label: 'Resultados', movies: results }] : []
    }

    const recentTop = recent.slice(0, RECENT_LIMIT)
    const recentIds = new Set(recentTop.map((movie) => movie.id))
    // Sin repetir lo que ya sale arriba como reciente.
    const trendingTop = trending
      .filter((movie) => !recentIds.has(movie.id))
      .slice(0, TRENDING_LIMIT)

    const next: SuggestionGroup[] = []
    if (recentTop.length > 0) next.push({ label: 'Búsquedas recientes', movies: recentTop })
    if (trendingTop.length > 0) next.push({ label: 'Tendencias', movies: trendingTop })

    return next
  }, [searching, results, recent, trending])

  const flatMovies = useMemo(() => groups.flatMap((group) => group.movies), [groups])

  // Al cambiar lo que se ofrece, el resaltado anterior ya no señala a nada.
  useEffect(() => {
    setHighlighted(-1)
  }, [groups])

  useEffect(() => {
    if (!open) return

    function handleMouseDown(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    // `mousedown` y no `click`: el panel se cierra en cuanto el usuario empieza
    // a pulsar fuera, igual que haría el `blur` del input.
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [open])

  const loading = searching ? resultsLoading : trendingLoading
  const error = searching ? resultsError : trendingError
  const emptyMessage =
    searching && !resultsLoading && !resultsError && results.length === 0
      ? `No encontramos resultados para "${query}"`
      : null
  const showPanel =
    open && (loading || error !== null || emptyMessage !== null || groups.length > 0)

  function openPanel() {
    // El historial pudo cambiar desde la última apertura.
    setRecent(getRecentSearches())
    setOpen(true)
  }

  // El `finally` es lo importante: si la llamada falla (red caída, backend
  // apagado) el usuario tiene que salir igual del lado del cliente.
  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      // Sin nada que hacer: la cookie caducará sola.
    } finally {
      clearSession()
      navigate('/login')
    }
  }

  function handleSelect(movie: RecentMovie) {
    addRecentSearch(movie)
    setOpen(false)
    setHighlighted(-1)
    // La búsqueda terminó en la ficha: el término deja de tener sentido y así
    // la próxima apertura arranca en las recientes.
    setTerm('')
    navigate(`/movie/${movie.id}`)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      setHighlighted(-1)
      return
    }

    if (event.key === 'Tab') {
      setOpen(false)
      return
    }

    if (!showPanel || flatMovies.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((current) => (current + 1) % flatMovies.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((current) => (current <= 0 ? flatMovies.length - 1 : current - 1))
      return
    }

    // Sin sugerencia resaltada, Enter cae en el submit de siempre: /search?q=.
    if (event.key === 'Enter' && highlighted >= 0) {
      event.preventDefault()
      handleSelect(flatMovies[highlighted])
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = term.trim()
    if (!trimmed) return

    setOpen(false)
    setHighlighted(-1)
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

        {/* El `mr-auto` vive aquí para que los enlaces sigan pegados a la derecha;
            el `relative` ancla el panel de sugerencias. */}
        <form
          ref={formRef}
          role="search"
          onSubmit={handleSearch}
          className="relative mr-auto w-full max-w-3xs sm:max-w-xs"
        >
          <label className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 focus-within:border-neutral-600">
            <Search className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
            <input
              type="search"
              value={term}
              onChange={(event) => {
                setTerm(event.target.value)
                openPanel()
              }}
              onFocus={openPanel}
              // Tras elegir una sugerencia el input nunca perdió el foco, así que
              // un `focus` no volvería a dispararse: el clic también debe abrir.
              onClick={openPanel}
              onKeyDown={handleKeyDown}
              placeholder="Buscar películas"
              aria-label="Buscar películas"
              role="combobox"
              aria-expanded={showPanel}
              aria-controls={LISTBOX_ID}
              aria-autocomplete="list"
              aria-activedescendant={highlighted >= 0 ? optionId(highlighted) : undefined}
              autoComplete="off"
              className="w-full bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
            />
          </label>

          {showPanel && (
            <SearchSuggestions
              groups={groups}
              highlightedIndex={highlighted}
              loading={loading}
              error={error}
              emptyMessage={emptyMessage}
              listboxId={LISTBOX_ID}
              optionId={optionId}
              onSelect={handleSelect}
              onHighlight={setHighlighted}
            />
          )}
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
          <>
            {/* Con el buscador delante la barra va justa: en móvil queda sólo el
                icono, y el aria-label mantiene el nombre accesible. */}
            <NavLink to="/profile" className={navLinkClass} aria-label="Mi Perfil">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Mi Perfil</span>
            </NavLink>

            <button type="button" onClick={handleLogout} className={`${linkBase} text-neutral-400 hover:bg-neutral-800/60 hover:text-white`}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Cerrar sesión
            </button>
          </>
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
