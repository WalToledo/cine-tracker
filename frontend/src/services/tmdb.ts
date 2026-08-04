const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_URL = 'https://api.themoviedb.org/3'
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

interface TmdbMovie {
  id: number
  title: string
  poster_path: string | null
  overview: string
  release_date: string
  vote_average: number
}

/** Respuesta de /movie/:id con `append_to_response=credits,videos`. */
interface TmdbMovieDetails extends TmdbMovie {
  backdrop_path: string | null
  tagline: string
  runtime: number | null
  genres: { id: number; name: string }[]
  credits: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[]
    crew: { id: number; name: string; job: string }[]
  }
  videos: {
    results: { key: string; site: string; type: string; official: boolean }[]
  }
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

/** Datos temporales para desarrollar sin API Key de TMDB. */
const MOCK_MOVIES: Movie[] = [
  {
    id: 550,
    title: 'Fight Club',
    posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    overview: 'Un oficinista insomne y un fabricante de jabón fundan un club de lucha clandestino.',
    releaseDate: '1999-10-15',
    voteAverage: 8.4,
  },
  {
    id: 27205,
    title: 'Inception',
    posterPath: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    overview: 'Un ladrón que roba secretos desde el subconsciente recibe una última misión imposible.',
    releaseDate: '2010-07-16',
    voteAverage: 8.4,
  },
  {
    id: 157336,
    title: 'Interstellar',
    posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    overview: 'Un grupo de exploradores atraviesa un agujero de gusano en busca de un nuevo hogar.',
    releaseDate: '2014-11-05',
    voteAverage: 8.4,
  },
  {
    id: 680,
    title: 'Pulp Fiction',
    posterPath: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    overview: 'Las vidas de dos sicarios, un boxeador y una pareja de atracadores se entrelazan.',
    releaseDate: '1994-09-10',
    voteAverage: 8.5,
  },
  {
    id: 155,
    title: 'The Dark Knight',
    posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    overview: 'Batman se enfrenta al Joker, un criminal que sumerge Gotham en el caos.',
    releaseDate: '2008-07-16',
    voteAverage: 8.5,
  },
  {
    id: 13,
    title: 'Forrest Gump',
    posterPath: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
    overview: 'La vida de un hombre sencillo que atraviesa décadas de historia estadounidense.',
    releaseDate: '1994-06-23',
    voteAverage: 8.5,
  },
  {
    id: 278,
    title: 'The Shawshank Redemption',
    posterPath: '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
    overview: 'Dos presos forjan una amistad a lo largo de años buscando consuelo y redención.',
    releaseDate: '1994-09-23',
    voteAverage: 8.7,
  },
  {
    id: 603,
    title: 'The Matrix',
    posterPath: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    overview: 'Un hacker descubre que la realidad es una simulación controlada por máquinas.',
    releaseDate: '1999-03-31',
    voteAverage: 8.2,
  },
]

function toMovie(movie: TmdbMovie): Movie {
  return {
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    overview: movie.overview,
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
  }
}

/**
 * Devuelve las películas en tendencia. Sin `VITE_TMDB_API_KEY` configurada
 * usa datos mockeados para poder desarrollar el frontend igualmente.
 */
export async function getTrendingMovies(): Promise<Movie[]> {
  if (!TMDB_API_KEY) {
    return MOCK_MOVIES
  }

  const response = await fetch(
    `${TMDB_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=es-ES`,
  )

  if (!response.ok) {
    throw new Error('No se pudieron cargar las películas de TMDB')
  }

  const data: { results: TmdbMovie[] } = await response.json()
  return data.results.map(toMovie)
}

/** Prefiere el trailer oficial de YouTube y cae en el primero disponible. */
function pickTrailerKey(videos: TmdbMovieDetails['videos']): string | null {
  const trailers = videos.results.filter(
    (video) => video.site === 'YouTube' && video.type === 'Trailer',
  )

  const trailer = trailers.find((video) => video.official) ?? trailers[0]
  return trailer ? trailer.key : null
}

/**
 * Detalle completo de una película: reparto, director y trailer llegan en la
 * misma petición mediante `append_to_response`. Sin `VITE_TMDB_API_KEY` se
 * responde con los datos mockeados, sin reparto ni trailer.
 */
export async function getMovieDetails(id: number): Promise<MovieDetails> {
  if (!TMDB_API_KEY) {
    const mock = MOCK_MOVIES.find((movie) => movie.id === id)
    if (!mock) {
      throw new Error('No encontramos esa película')
    }

    return {
      ...mock,
      backdropPath: null,
      tagline: '',
      runtime: 0,
      genres: [],
      director: null,
      cast: [],
      trailerKey: null,
    }
  }

  const response = await fetch(
    `${TMDB_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=credits,videos`,
  )

  if (response.status === 404) {
    throw new Error('No encontramos esa película')
  }

  if (!response.ok) {
    throw new Error('No se pudo cargar la película desde TMDB')
  }

  const data: TmdbMovieDetails = await response.json()

  return {
    ...toMovie(data),
    backdropPath: data.backdrop_path,
    tagline: data.tagline,
    runtime: data.runtime ?? 0,
    genres: data.genres.map((genre) => genre.name),
    director: data.credits.crew.find((member) => member.job === 'Director')?.name ?? null,
    cast: data.credits.cast.slice(0, 10).map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      profilePath: member.profile_path,
    })),
    trailerKey: pickTrailerKey(data.videos),
  }
}
