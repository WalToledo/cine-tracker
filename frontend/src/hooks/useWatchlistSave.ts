import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { SaveState } from '../components/MovieCard'
import { ApiError, isAuthenticated, watchlistApi } from '../services/api'
import type { Movie } from '../services/tmdb'

interface WatchlistSave {
  /** Estado por `movieId`, tal y como lo espera `MovieCard`. */
  saveStates: Record<number, SaveState>
  saveError: string | null
  save: (movie: Movie) => void
}

/**
 * Comparten este guardado las páginas que listan películas (Inicio y Búsqueda):
 * marca al montar lo que ya está en la lista y trata el 409 del backend como
 * éxito, porque el resultado para el usuario es el mismo.
 */
export function useWatchlistSave(): WatchlistSave {
  const navigate = useNavigate()
  const location = useLocation()
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) return

    let active = true

    watchlistApi
      .list()
      .then((items) => {
        if (!active) return
        // Lo que el usuario acabe de guardar tiene prioridad sobre la respuesta.
        setSaveStates((current) => ({
          ...Object.fromEntries(items.map((item) => [item.movieId, 'saved' as const])),
          ...current,
        }))
      })
      .catch(() => {
        if (active) setSaveError('No se pudo comprobar tu lista')
      })

    return () => {
      active = false
    }
  }, [])

  const save = useCallback(
    async (movie: Movie) => {
      if (!isAuthenticated()) {
        navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
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
        setSaveError(err instanceof Error ? err.message : 'No se pudo guardar la película')
      }
    },
    [navigate, location.pathname, location.search],
  )

  return { saveStates, saveError, save }
}
