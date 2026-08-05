import { useEffect, useState } from 'react'
import { Loader2, SearchX } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import { useWatchlistSave } from '../hooks/useWatchlistSave'
import { searchMovies } from '../services/tmdb'
import type { Movie } from '../services/tmdb'

function Search() {
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') ?? '').trim()

  const [movies, setMovies] = useState<Movie[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { saveStates, saveError, save } = useWatchlistSave()

  // Depende de `query`: al escribir otra búsqueda hay que empezar de cero.
  useEffect(() => {
    if (!query) {
      setMovies([])
      return
    }

    let active = true
    setLoading(true)
    setLoadError(null)

    searchMovies(query, 1)
      .then((result) => {
        if (!active) return
        setMovies(result.movies)
        setPage(result.page)
        setTotalPages(result.totalPages)
      })
      .catch((err: unknown) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'No se pudo completar la búsqueda')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      // Descarta la respuesta si el usuario ya buscó otra cosa.
      active = false
    }
  }, [query])

  async function handleLoadMore() {
    setLoadingMore(true)
    setLoadError(null)

    try {
      const result = await searchMovies(query, page + 1)
      setMovies((current) => [...current, ...result.movies])
      setPage(result.page)
      setTotalPages(result.totalPages)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo completar la búsqueda')
    } finally {
      setLoadingMore(false)
    }
  }

  const error = loadError ?? saveError

  return (
    <section>
      <h2 className="mb-1 text-2xl font-bold text-white">Búsqueda</h2>
      <p className="mb-6 text-sm text-neutral-400">
        {query ? `Resultados para "${query}"` : 'Escribe un título en el buscador de arriba.'}
      </p>

      {error && (
        <p role="alert" className="mb-6 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-neutral-500">
          <Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" />
        </div>
      ) : (
        query &&
        (movies.length === 0 ? (
          <p className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-800 px-4 py-12 text-center text-sm text-neutral-500">
            <SearchX className="h-6 w-6" aria-hidden="true" />
            No encontramos resultados para "{query}".
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  state={saveStates[movie.id] ?? 'idle'}
                  onSave={save}
                />
              ))}
            </div>

            {page < totalPages && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Cargar más
                </button>
              </div>
            )}
          </>
        ))
      )}
    </section>
  )
}

export default Search
