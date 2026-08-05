import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Search from './Search'
import type { Movie } from '../services/tmdb'

const MATRIX: Movie = {
  id: 603,
  title: 'The Matrix',
  posterPath: '/matrix.jpg',
  overview: 'Un hacker descubre que la realidad es una simulación.',
  releaseDate: '1999-03-31',
  voteAverage: 8.2,
}

const RELOADED: Movie = {
  id: 604,
  title: 'The Matrix Reloaded',
  posterPath: null,
  overview: 'Neo sigue buscando el origen de Matrix.',
  releaseDate: '2003-05-15',
  voteAverage: 7.0,
}

const { searchMovies } = vi.hoisted(() => ({ searchMovies: vi.fn() }))

vi.mock('../services/tmdb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/tmdb')>()
  return { ...actual, searchMovies }
})

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/search" element={<Search />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Search', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    searchMovies.mockReset()
  })

  it('renders the results for the query in the URL', async () => {
    searchMovies.mockResolvedValue({ movies: [MATRIX], page: 1, totalPages: 1 })

    renderAt('/search?q=matrix')

    expect(await screen.findByRole('heading', { name: 'The Matrix' })).toBeInTheDocument()
    expect(screen.getByText('Resultados para "matrix"')).toBeInTheDocument()
    expect(searchMovies).toHaveBeenCalledWith('matrix', 1)
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument()
  })

  it('appends the next page when loading more', async () => {
    searchMovies
      .mockResolvedValueOnce({ movies: [MATRIX], page: 1, totalPages: 2 })
      .mockResolvedValueOnce({ movies: [RELOADED], page: 2, totalPages: 2 })

    renderAt('/search?q=matrix')

    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más' }))

    expect(await screen.findByRole('heading', { name: 'The Matrix Reloaded' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The Matrix' })).toBeInTheDocument()
    expect(searchMovies).toHaveBeenLastCalledWith('matrix', 2)
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no results', async () => {
    searchMovies.mockResolvedValue({ movies: [], page: 1, totalPages: 1 })

    renderAt('/search?q=zzzz')

    expect(await screen.findByText(/No encontramos resultados para/)).toBeInTheDocument()
  })

  it('does not search when the URL has no query', () => {
    renderAt('/search')

    expect(screen.getByText('Escribe un título en el buscador de arriba.')).toBeInTheDocument()
    expect(searchMovies).not.toHaveBeenCalled()
  })
})
