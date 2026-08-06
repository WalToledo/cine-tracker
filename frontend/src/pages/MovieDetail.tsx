import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Bookmark, Check, Clapperboard, ImageOff, Loader2, Star, UserRound } from 'lucide-react'
import type { SaveState } from '../components/MovieCard'
import ReviewForm from '../components/ReviewForm'
import ReviewList from '../components/ReviewList'
import {
  ApiError,
  clearSession,
  getCurrentUserId,
  isAuthenticated,
  reviewsApi,
  watchlistApi,
} from '../services/api'
import type { Review } from '../services/api'
import { backdropUrl, getMovieDetails, posterUrl, profileUrl } from '../services/tmdb'
import type { MovieDetails } from '../services/tmdb'

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`
}

function MovieDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const movieId = Number(id)
  const currentUserId = getCurrentUserId()

  const [movie, setMovie] = useState<MovieDetails | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewsError, setReviewsError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [editingId, setEditingId] = useState<string | null>(null)

  /** Lleva al login recordando esta película para volver tras autenticarse. */
  function goToLogin() {
    navigate('/login', { state: { from: location.pathname } })
  }

  /**
   * Un 401 significa que no hay sesión utilizable (falta la cookie o caducó):
   * en lugar de mostrar el mensaje del backend, se descarta y se pide login.
   */
  function handleUnauthorized(err: unknown): boolean {
    if (err instanceof ApiError && err.status === 401) {
      clearSession()
      goToLogin()
      return true
    }

    return false
  }

  useEffect(() => {
    if (!Number.isInteger(movieId)) {
      setError('No encontramos esa película')
      setLoading(false)
      return
    }

    let active = true

    async function load() {
      // Las reseñas y la watchlist no deben tumbar la ficha si fallan.
      const [details, reviewList] = await Promise.allSettled([
        getMovieDetails(movieId),
        reviewsApi.listByMovie(movieId),
      ])

      if (!active) return

      if (details.status === 'fulfilled') {
        setMovie(details.value)
      } else {
        setError(
          details.reason instanceof Error
            ? details.reason.message
            : 'No se pudo cargar la película',
        )
      }

      if (reviewList.status === 'fulfilled') {
        setReviews(reviewList.value)
      } else {
        setReviewsError('No se pudieron cargar las reseñas')
      }

      if (isAuthenticated()) {
        try {
          const items = await watchlistApi.list()
          if (active && items.some((item) => item.movieId === movieId)) {
            setSaveState('saved')
          }
        } catch {
          // Un fallo aquí sólo significa que el botón se queda en "Guardar".
        }
      }

      if (active) setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [movieId])

  async function handleSave() {
    if (!movie) return

    // Sin sesión no se intenta la petición: se pide login directamente.
    if (!isAuthenticated()) {
      goToLogin()
      return
    }

    setSaveError(null)
    setSaveState('saving')

    try {
      await watchlistApi.add({
        movieId: movie.id,
        title: movie.title,
        posterPath: movie.posterPath,
      })
      setSaveState('saved')
    } catch (err) {
      // 409 significa que ya estaba en la lista: el resultado es el mismo.
      if (err instanceof ApiError && err.status === 409) {
        setSaveState('saved')
        return
      }

      setSaveState('idle')

      if (handleUnauthorized(err)) return

      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar la película')
    }
  }

  async function handleCreateReview(rating: number, content: string) {
    try {
      const created = await reviewsApi.create({ movieId, rating, content })
      setReviews((current) => [created, ...current])
    } catch (err) {
      // Al redirigir, la página se desmonta y no hay error que mostrar.
      if (handleUnauthorized(err)) return
      throw err
    }
  }

  async function handleUpdateReview(reviewId: string, rating: number, content: string) {
    try {
      const updated = await reviewsApi.update(reviewId, { rating, content })
      setReviews((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setEditingId(null)
    } catch (err) {
      if (handleUnauthorized(err)) return
      throw err
    }
  }

  async function handleDeleteReview(reviewId: string) {
    setReviewsError(null)

    try {
      await reviewsApi.remove(reviewId)
      setReviews((current) => current.filter((item) => item.id !== reviewId))
    } catch (err) {
      if (handleUnauthorized(err)) return
      setReviewsError(err instanceof Error ? err.message : 'No se pudo eliminar la reseña')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-neutral-500">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" />
      </div>
    )
  }

  if (error || !movie) {
    return (
      <section className="py-20 text-center">
        <p role="alert" className="text-sm text-neutral-400">
          {error ?? 'No encontramos esa película'}
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400"
        >
          Volver a Tendencias
        </Link>
      </section>
    )
  }

  const poster = posterUrl(movie.posterPath)
  const backdrop = backdropUrl(movie.backdropPath)
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : '—'
  const hasOwnReview =
    currentUserId !== null && reviews.some((review) => review.author.id === currentUserId)

  return (
    <article className="flex flex-col gap-10">
      <header className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        {backdrop && (
          <img
            src={backdrop}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
        )}

        <div className="relative flex flex-col gap-6 p-6 sm:flex-row">
          <div className="h-72 w-48 shrink-0 overflow-hidden rounded-xl bg-neutral-800">
            {poster ? (
              <img src={poster} alt={movie.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-600">
                <ImageOff className="h-8 w-8" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white">{movie.title}</h2>
              {movie.tagline && (
                <p className="mt-1 text-sm italic text-neutral-400">{movie.tagline}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-400">
              <span>{year}</span>
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-400" aria-hidden="true" />
                {movie.voteAverage.toFixed(1)}
              </span>
              {movie.runtime > 0 && <span>{formatRuntime(movie.runtime)}</span>}
              {movie.genres.length > 0 && <span>{movie.genres.join(' · ')}</span>}
            </div>

            {movie.director && (
              <p className="text-sm text-neutral-300">
                <span className="text-neutral-500">Dirección: </span>
                {movie.director}
              </p>
            )}

            {movie.overview && (
              <p className="text-sm leading-relaxed text-neutral-300">{movie.overview}</p>
            )}

            <div className="mt-auto flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState !== 'idle'}
                className="flex w-fit items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-400"
              >
                {saveState === 'saving' && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {saveState === 'saved' && <Check className="h-4 w-4" aria-hidden="true" />}
                {saveState === 'idle' && <Bookmark className="h-4 w-4" aria-hidden="true" />}
                {saveState === 'saved' ? 'En tu lista' : 'Guardar en mi lista'}
              </button>

              {saveError && (
                <p role="alert" className="w-fit rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
                  {saveError}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {movie.trailerKey && (
        <section>
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
            <Clapperboard className="h-5 w-5 text-amber-400" aria-hidden="true" />
            Trailer
          </h3>
          <div className="aspect-video overflow-hidden rounded-xl border border-neutral-800 bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${movie.trailerKey}`}
              title={`Trailer de ${movie.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </section>
      )}

      {movie.cast.length > 0 && (
        <section>
          <h3 className="mb-4 text-xl font-bold text-white">Reparto</h3>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {movie.cast.map((member) => {
              const profile = profileUrl(member.profilePath)

              return (
                <li
                  key={member.id}
                  className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900"
                >
                  <div className="aspect-2/3 bg-neutral-800">
                    {profile ? (
                      <img
                        src={profile}
                        alt={member.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-600">
                        <UserRound className="h-8 w-8" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                    <p className="truncate text-xs text-neutral-400">{member.character}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-1 text-xl font-bold text-white">Reseñas</h3>
        <p className="mb-4 text-sm text-neutral-400">
          {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
        </p>

        {reviewsError && (
          <p role="alert" className="mb-4 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
            {reviewsError}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {isAuthenticated() ? (
            !hasOwnReview && (
              <ReviewForm submitLabel="Publicar reseña" onSubmit={handleCreateReview} />
            )
          ) : (
            <p className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
              <Link to="/login" className="font-semibold text-amber-400 hover:text-amber-300">
                Inicia sesión
              </Link>{' '}
              para dejar tu reseña.
            </p>
          )}

          <ReviewList
            reviews={reviews}
            currentUserId={currentUserId}
            editingId={editingId}
            onStartEdit={setEditingId}
            onCancelEdit={() => setEditingId(null)}
            onUpdate={handleUpdateReview}
            onDelete={handleDeleteReview}
          />
        </div>
      </section>
    </article>
  )
}

export default MovieDetail
