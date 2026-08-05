import type { Movie } from './tmdb'

const RECENT_KEY = 'cinetracker.recentSearches'
/** Suficientes para reconocer lo último buscado sin llenar el desplegable. */
const MAX_RECENT = 5

/**
 * De la película sólo se guarda lo que el desplegable pinta: el resto (sinopsis,
 * nota) engordaría `localStorage` sin que nadie lo lea.
 */
export type RecentMovie = Pick<Movie, 'id' | 'title' | 'posterPath' | 'releaseDate'>

function isRecentMovie(value: unknown): value is RecentMovie {
  if (typeof value !== 'object' || value === null) return false
  const movie = value as Record<string, unknown>

  return (
    typeof movie.id === 'number' &&
    typeof movie.title === 'string' &&
    (typeof movie.posterPath === 'string' || movie.posterPath === null) &&
    typeof movie.releaseDate === 'string'
  )
}

/**
 * Nunca lanza: un `localStorage` bloqueado o un JSON manipulado a mano no puede
 * tumbar la barra de navegación, que se pinta en todas las páginas.
 */
export function getRecentSearches(): RecentMovie[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    if (!stored) return []

    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isRecentMovie).slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

/** Deja la película al principio, sin duplicarla, y descarta la más antigua. */
export function addRecentSearch(movie: RecentMovie): void {
  try {
    const entry: RecentMovie = {
      id: movie.id,
      title: movie.title,
      posterPath: movie.posterPath,
      releaseDate: movie.releaseDate,
    }
    const rest = getRecentSearches().filter((recent) => recent.id !== entry.id)

    localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...rest].slice(0, MAX_RECENT)))
  } catch {
    // Guardar el historial es un extra: si falla, la búsqueda sigue funcionando.
  }
}
