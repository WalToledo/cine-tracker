import { ImageOff, Loader2 } from 'lucide-react'
import type { RecentMovie } from '../services/recentSearches'
import { posterUrl } from '../services/tmdb'

export interface SuggestionGroup {
  label: string
  movies: RecentMovie[]
}

interface SearchSuggestionsProps {
  groups: SuggestionGroup[]
  /** Índice plano sobre todas las filas del panel, no relativo a su grupo. */
  highlightedIndex: number
  loading: boolean
  error: string | null
  emptyMessage: string | null
  listboxId: string
  optionId: (index: number) => string
  onSelect: (movie: RecentMovie) => void
  onHighlight: (index: number) => void
}

function SuggestionRow({
  movie,
  index,
  highlighted,
  optionId,
  onSelect,
  onHighlight,
}: {
  movie: RecentMovie
  index: number
  highlighted: boolean
  optionId: (index: number) => string
  onSelect: (movie: RecentMovie) => void
  onHighlight: (index: number) => void
}) {
  const poster = posterUrl(movie.posterPath)
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : '—'

  return (
    <div
      id={optionId(index)}
      role="option"
      aria-selected={highlighted}
      // El `mousedown` del ratón dispara antes el `blur` del input, que cerraría
      // el panel y se llevaría por delante el `click` que aún no ha ocurrido.
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={() => onHighlight(index)}
      onClick={() => onSelect(movie)}
      className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
        highlighted ? 'bg-neutral-800' : ''
      }`}
    >
      <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-neutral-800">
        {poster ? (
          <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-600">
            <ImageOff className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-medium text-white">{movie.title}</p>
        <p className="text-xs text-neutral-400">{year}</p>
      </div>
    </div>
  )
}

function SearchSuggestions({
  groups,
  highlightedIndex,
  loading,
  error,
  emptyMessage,
  listboxId,
  optionId,
  onSelect,
  onHighlight,
}: SearchSuggestionsProps) {
  // El índice del grupo no sirve para navegar con las flechas: se numeran las
  // filas de corrido según se van pintando.
  let flatIndex = -1

  return (
    <div className="absolute top-full left-0 z-20 mt-2 max-h-96 w-full min-w-72 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900 py-2 shadow-xl">
      {loading && (
        <div className="flex justify-center py-6 text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando" />
        </div>
      )}

      {error && (
        <p role="alert" className="mx-3 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {emptyMessage && <p className="px-3 py-4 text-sm text-neutral-400">{emptyMessage}</p>}

      <div id={listboxId} role="listbox" aria-label="Sugerencias de búsqueda">
        {groups.map((group) => (
          <div key={group.label} role="group" aria-label={group.label}>
            <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              {group.label}
            </p>
            {group.movies.map((movie) => {
              flatIndex += 1
              const index = flatIndex

              return (
                <SuggestionRow
                  key={movie.id}
                  movie={movie}
                  index={index}
                  highlighted={index === highlightedIndex}
                  optionId={optionId}
                  onSelect={onSelect}
                  onHighlight={onHighlight}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SearchSuggestions
