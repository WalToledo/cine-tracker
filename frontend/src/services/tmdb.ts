import { ApiError, apiFetch } from './api'

// El CDN de imágenes de TMDB es público y no necesita API Key, así que las
// URLs se componen aquí. Los datos, en cambio, llegan por el proxy del backend
// (`/api/movies`), que es el único que conoce la API Key.
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500'
const TMDB_PROFILE_URL = 'https://image.tmdb.org/t/p/w185'
const TMDB_BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280'

export interface Movie {
  id: number
  title: string
  posterPath: string | null
  overview: string
  releaseDate: string
  voteAverage: number
}

export interface CastMember {
  id: number
  name: string
  character: string
  profilePath: string | null
}

export interface MovieDetails extends Movie {
  backdropPath: string | null
  tagline: string
  runtime: number
  genres: string[]
  director: string | null
  cast: CastMember[]
  /** Clave de YouTube del trailer, o null si la película no tiene ninguno. */
  trailerKey: string | null
}

/** Página de resultados de búsqueda: la paginación la decide TMDB. */
export interface MovieSearchResult {
  movies: Movie[]
  page: number
  totalPages: number
}

export function posterUrl(posterPath: string | null): string | null {
  return posterPath ? `${TMDB_IMAGE_URL}${posterPath}` : null
}

export function profileUrl(profilePath: string | null): string | null {
  return profilePath ? `${TMDB_PROFILE_URL}${profilePath}` : null
}

export function backdropUrl(backdropPath: string | null): string | null {
  return backdropPath ? `${TMDB_BACKDROP_URL}${backdropPath}` : null
}

/**
 * Devuelve las películas en tendencia. Si el backend no tiene `TMDB_API_KEY`
 * configurada responde con datos mockeados, de forma transparente para la UI.
 */
export async function getTrendingMovies(): Promise<Movie[]> {
  try {
    const { movies } = await apiFetch<{ movies: Movie[] }>('/movies/trending')
    return movies
  } catch {
    throw new Error('No se pudieron cargar las películas')
  }
}

/**
 * Detalle completo de una película: reparto, director y trailer vienen en la
 * misma respuesta. El backend traduce el 404 de TMDB a un 404 propio.
 */
export async function getMovieDetails(id: number): Promise<MovieDetails> {
  try {
    const { movie } = await apiFetch<{ movie: MovieDetails }>(`/movies/${id}`)
    return movie
  } catch (err) {
    // El backend responde en inglés; los mensajes de usuario van en español.
    if (err instanceof ApiError && err.status === 404) {
      throw new Error('No encontramos esa película')
    }
    throw new Error('No se pudo cargar la película')
  }
}

/**
 * Busca películas por título. `page` empieza en 1; el backend devuelve cuántas
 * páginas hay en total para poder pedir la siguiente.
 */
export async function searchMovies(query: string, page = 1): Promise<MovieSearchResult> {
  try {
    return await apiFetch<MovieSearchResult>(
      `/movies/search?q=${encodeURIComponent(query)}&page=${page}`,
    )
  } catch (err) {
    // El backend responde en inglés; los mensajes de usuario van en español.
    if (err instanceof ApiError && err.status === 400) {
      throw new Error('Escribe algo para buscar')
    }
    throw new Error('No se pudo completar la búsqueda')
  }
}
