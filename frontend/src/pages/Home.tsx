import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import MovieCard from '../components/MovieCard'
import { useWatchlistSave } from '../hooks/useWatchlistSave'
import { getTrendingMovies } from '../services/tmdb'
import type { Movie } from '../services/tmdb'

function Home() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { saveStates, saveError, save } = useWatchlistSave()

  useEffect(() => {
    let active = true

    getTrendingMovies()
      .then((trending) => {
        if (active) setMovies(trending)
      })
      .catch((err: unknown) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar las películas')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const error = loadError ?? saveError

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-neutral-500">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" />
      </div>
    )
  }

  return (
    <section>
      <h2 className="mb-1 text-2xl font-bold text-white">Tendencias</h2>
      <p className="mb-6 text-sm text-neutral-400">
        Guarda películas en tu lista para verlas más tarde.
      </p>

      {error && (
        <p role="alert" className="mb-6 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

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
    </section>
  )
}

export default Home
