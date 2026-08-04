import { Bookmark, Check, ImageOff, Loader2, Star } from 'lucide-react'
import type { Movie } from '../services/tmdb'
import { posterUrl } from '../services/tmdb'

export type SaveState = 'idle' | 'saving' | 'saved'

interface MovieCardProps {
  movie: Movie
  state: SaveState
  onSave: (movie: Movie) => void
}

function MovieCard({ movie, state, onSave }: MovieCardProps) {
  const poster = posterUrl(movie.posterPath)
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : '—'

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition-colors hover:border-neutral-700">
      <div className="aspect-2/3 bg-neutral-800">
        {poster ? (
          <img src={poster} alt={movie.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-600">
            <ImageOff className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 font-semibold text-white">{movie.title}</h3>
          <p className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
            <span>{year}</span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-400" aria-hidden="true" />
              {movie.voteAverage.toFixed(1)}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSave(movie)}
          disabled={state !== 'idle'}
          className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-400"
        >
          {state === 'saving' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {state === 'saved' && <Check className="h-4 w-4" aria-hidden="true" />}
          {state === 'idle' && <Bookmark className="h-4 w-4" aria-hidden="true" />}
          {state === 'saved' ? 'En tu lista' : 'Guardar'}
        </button>
      </div>
    </article>
  )
}

export default MovieCard
