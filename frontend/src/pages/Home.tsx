import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import type { SaveState } from '../components/MovieCard'
import { ApiError, isAuthenticated, watchlistApi } from '../services/api'
import { getTrendingMovies } from '../services/tmdb'
import type { Movie } from '../services/tmdb'

function Home() {
  const navigate = useNavigate()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({})

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const trending = await getTrendingMovies()
        if (!active) return
        setMovies(trending)

        // Marca las que ya están guardadas para no ofrecer duplicados.
        if (isAuthenticated()) {
          const items = await watchlistApi.list()
          if (!active) return
          setSaveStates(Object.fromEntries(items.map((item) => [item.movieId, 'saved' as const])))
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las películas')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  async function handleSave(movie: Movie) {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    setSaveStates((current) => ({ ...current, [movie.id]: 'saving' }))

    try {
      await watchlistApi.add({
        movieId: movie.id,
        title: movie.title,
        posterPath: movie.posterPath,
      })
      setSaveStates((current) => ({ ...current, [movie.id]: 'saved' }))
    } catch (err) {
      // 409 significa que ya estaba en la lista: el resultado es el mismo.
      if (err instanceof ApiError && err.status === 409) {
        setSaveStates((current) => ({ ...current, [movie.id]: 'saved' }))
        return
      }
      setSaveStates((current) => ({ ...current, [movie.id]: 'idle' }))
      setError(err instanceof Error ? err.message : 'No se pudo guardar la película')
    }
  }

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
            onSave={handleSave}
          />
        ))}
      </div>
    </section>
  )
}

export default Home
