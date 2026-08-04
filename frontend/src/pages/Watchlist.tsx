import { useEffect, useState } from 'react'
import { Eye, ImageOff, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { watchlistApi } from '../services/api'
import type { WatchlistItem } from '../services/api'
import { posterUrl } from '../services/tmdb'

function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    watchlistApi
      .list()
      .then((result) => {
        if (active) setItems(result)
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar tu lista')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleToggleStatus(item: WatchlistItem) {
    const nextStatus = item.status === 'PENDING' ? 'WATCHED' : 'PENDING'
    setBusyId(item.id)
    setError(null)

    try {
      const updated = await watchlistApi.updateStatus(item.id, nextStatus)
      setItems((current) => current.map((it) => (it.id === updated.id ? updated : it)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(item: WatchlistItem) {
    setBusyId(item.id)
    setError(null)

    try {
      await watchlistApi.remove(item.id)
      setItems((current) => current.filter((it) => it.id !== item.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la película')
    } finally {
      setBusyId(null)
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
      <h2 className="mb-1 text-2xl font-bold text-white">Mi Lista</h2>
      <p className="mb-6 text-sm text-neutral-400">
        {items.length} {items.length === 1 ? 'película guardada' : 'películas guardadas'}
      </p>

      {error && (
        <p role="alert" className="mb-6 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-800 px-4 py-12 text-center text-sm text-neutral-500">
          Todavía no has guardado ninguna película.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const poster = posterUrl(item.posterPath)
            const watched = item.status === 'WATCHED'
            const busy = busyId === item.id

            return (
              <li
                key={item.id}
                className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-3"
              >
                <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                  {poster ? (
                    <img src={poster} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-600">
                      <ImageOff className="h-5 w-5" aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-white">{item.title}</h3>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      watched ? 'bg-emerald-950 text-emerald-300' : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {watched ? 'Vista' : 'Pendiente'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(item)}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {watched ? (
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                  {watched ? 'Marcar pendiente' : 'Marcar vista'}
                </button>

                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  disabled={busy}
                  aria-label={`Eliminar ${item.title}`}
                  className="rounded-lg border border-neutral-700 p-2 text-neutral-400 transition-colors hover:border-red-800 hover:bg-red-950 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default Watchlist
