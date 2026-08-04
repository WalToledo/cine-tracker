import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MovieDetail from './MovieDetail'
import { ApiError, getToken, reviewsApi, setToken, watchlistApi } from '../services/api'
import type { Review } from '../services/api'
import type { MovieDetails } from '../services/tmdb'

const MOVIE: MovieDetails = {
  id: 550,
  title: 'Fight Club',
  posterPath: '/poster.jpg',
  backdropPath: '/backdrop.jpg',
  overview: 'Un oficinista insomne funda un club de lucha clandestino.',
  releaseDate: '1999-10-15',
  voteAverage: 8.4,
  tagline: 'Mischief. Mayhem. Soap.',
  runtime: 139,
  genres: ['Drama'],
  director: 'David Fincher',
  cast: [
    { id: 819, name: 'Edward Norton', character: 'The Narrator', profilePath: '/norton.jpg' },
    { id: 287, name: 'Brad Pitt', character: 'Tyler Durden', profilePath: null },
  ],
  trailerKey: 'BdJKm16Co6M',
}

const REVIEW: Review = {
  id: 'review-1',
  movieId: 550,
  rating: 4,
  content: 'Envejece mejor de lo que esperaba.',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  author: { id: 'user-1', displayName: 'cinefila' },
}

const { getMovieDetails } = vi.hoisted(() => ({ getMovieDetails: vi.fn() }))

vi.mock('../services/tmdb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/tmdb')>()
  return { ...actual, getMovieDetails }
})

/** La ruta /login es un marcador para poder afirmar la navegación. */
function renderAt(movieId: string) {
  return render(
    <MemoryRouter initialEntries={[`/movie/${movieId}`]}>
      <Routes>
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/login" element={<p>pantalla de inicio de sesión</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MovieDetail', () => {
  beforeEach(() => {
    localStorage.clear()
    getMovieDetails.mockResolvedValue(MOVIE)
    vi.spyOn(reviewsApi, 'listByMovie').mockResolvedValue([REVIEW])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the movie details, director, cast and trailer', async () => {
    renderAt('550')

    expect(await screen.findByRole('heading', { name: 'Fight Club' })).toBeInTheDocument()
    expect(screen.getByText('David Fincher')).toBeInTheDocument()
    expect(screen.getByText('Edward Norton')).toBeInTheDocument()
    expect(screen.getByText('The Narrator')).toBeInTheDocument()
    expect(screen.getByTitle('Trailer de Fight Club')).toBeInTheDocument()
    expect(getMovieDetails).toHaveBeenCalledWith(550)
  })

  it('lists the existing reviews', async () => {
    renderAt('550')

    expect(await screen.findByText('Envejece mejor de lo que esperaba.')).toBeInTheDocument()
    expect(screen.getByText('cinefila')).toBeInTheDocument()
    expect(screen.getByLabelText('4 de 5 estrellas')).toBeInTheDocument()
    expect(reviewsApi.listByMovie).toHaveBeenCalledWith(550)
  })

  it('invites to log in instead of showing the review form when there is no session', async () => {
    renderAt('550')

    expect(await screen.findByRole('link', { name: 'Inicia sesión' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Tu reseña')).not.toBeInTheDocument()
  })

  it('sends the visitor to the login screen instead of failing when saving without a session', async () => {
    const add = vi.spyOn(watchlistApi, 'add')

    renderAt('550')

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar en mi lista' }))

    expect(await screen.findByText('pantalla de inicio de sesión')).toBeInTheDocument()
    expect(add).not.toHaveBeenCalled()
  })

  it('clears an expired token and asks to log in again', async () => {
    setToken('expired.token.value')
    vi.spyOn(watchlistApi, 'list').mockResolvedValue([])
    vi.spyOn(watchlistApi, 'add').mockRejectedValue(
      new ApiError(401, 'Invalid or expired token'),
    )

    renderAt('550')

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar en mi lista' }))

    expect(await screen.findByText('pantalla de inicio de sesión')).toBeInTheDocument()
    expect(getToken()).toBeNull()
  })

  it('shows an error state when the movie cannot be loaded', async () => {
    getMovieDetails.mockRejectedValue(new Error('No encontramos esa película'))

    renderAt('999999')

    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos esa película')
    expect(screen.getByRole('link', { name: 'Volver a Tendencias' })).toBeInTheDocument()
  })
})
