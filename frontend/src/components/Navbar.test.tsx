import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import Navbar from './Navbar'
import type { Movie } from '../services/tmdb'

const MATRIX: Movie = {
  id: 603,
  title: 'The Matrix',
  posterPath: '/matrix.jpg',
  overview: 'Un hacker descubre que la realidad es una simulación.',
  releaseDate: '1999-03-31',
  voteAverage: 8.2,
}

const INCEPTION: Movie = {
  id: 27205,
  title: 'Inception',
  posterPath: null,
  overview: 'Un ladrón roba secretos entrando en los sueños.',
  releaseDate: '2010-07-16',
  voteAverage: 8.4,
}

const FIGHT_CLUB = {
  id: 550,
  title: 'Fight Club',
  posterPath: '/fight.jpg',
  releaseDate: '1999-10-15',
}

const { getTrendingMovies, searchMovies } = vi.hoisted(() => ({
  getTrendingMovies: vi.fn(),
  searchMovies: vi.fn(),
}))

vi.mock('../services/tmdb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/tmdb')>()
  return { ...actual, getTrendingMovies, searchMovies }
})

function MovieMarker() {
  const { id } = useParams()
  return <p>ficha de la película {id}</p>
}

function SearchMarker() {
  const [params] = useSearchParams()
  return <p>resultados para {params.get('q')}</p>
}

function renderNavbar(url = '/') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Navbar />
      <Routes>
        <Route path="/" element={<p>inicio</p>} />
        <Route path="/movie/:id" element={<MovieMarker />} />
        <Route path="/search" element={<SearchMarker />} />
      </Routes>
    </MemoryRouter>,
  )
}

function searchInput() {
  return screen.getByRole('combobox', { name: 'Buscar películas' })
}

/** Deja pasar el debounce del buscador para comprobar que *no* pidió nada. */
function afterDebounce() {
  return new Promise((resolve) => setTimeout(resolve, 400))
}

describe('Navbar suggestions', () => {
  beforeEach(() => {
    localStorage.clear()
    getTrendingMovies.mockResolvedValue([MATRIX, INCEPTION])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    getTrendingMovies.mockReset()
    searchMovies.mockReset()
  })

  it('shows trending movies when the empty input is focused', async () => {
    renderNavbar()

    fireEvent.focus(searchInput())

    expect(await screen.findByText('Tendencias')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /The Matrix/ })).toBeInTheDocument()
    expect(searchMovies).not.toHaveBeenCalled()
  })

  it('lists the recent searches before the trending ones', async () => {
    localStorage.setItem('cinetracker.recentSearches', JSON.stringify([FIGHT_CLUB]))

    renderNavbar()
    fireEvent.focus(searchInput())

    expect(await screen.findByText('Búsquedas recientes')).toBeInTheDocument()
    const options = await screen.findAllByRole('option')
    expect(options[0]).toHaveTextContent('Fight Club')
    expect(options[1]).toHaveTextContent('The Matrix')
  })

  it('debounces the typing into a single search request', async () => {
    searchMovies.mockResolvedValue({ movies: [MATRIX], page: 1, totalPages: 1 })

    renderNavbar()
    const input = searchInput()

    fireEvent.change(input, { target: { value: 'ma' } })
    fireEvent.change(input, { target: { value: 'mat' } })
    fireEvent.change(input, { target: { value: 'matrix' } })

    expect(await screen.findByText('Resultados')).toBeInTheDocument()
    expect(searchMovies).toHaveBeenCalledTimes(1)
    expect(searchMovies).toHaveBeenCalledWith('matrix', 1)
  })

  it('does not search with a single character', async () => {
    renderNavbar()

    fireEvent.change(searchInput(), { target: { value: 'm' } })
    await afterDebounce()

    expect(searchMovies).not.toHaveBeenCalled()
  })

  it('opens the movie detail and remembers it when a suggestion is clicked', async () => {
    searchMovies.mockResolvedValue({ movies: [MATRIX], page: 1, totalPages: 1 })

    renderNavbar()
    fireEvent.change(searchInput(), { target: { value: 'matrix' } })

    fireEvent.click(await screen.findByRole('option', { name: /The Matrix/ }))

    expect(await screen.findByText('ficha de la película 603')).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(localStorage.getItem('cinetracker.recentSearches')).toContain('The Matrix')
  })

  it('reopens the panel on click after picking a suggestion', async () => {
    searchMovies.mockResolvedValue({ movies: [MATRIX], page: 1, totalPages: 1 })

    renderNavbar()
    const input = searchInput()
    fireEvent.change(input, { target: { value: 'matrix' } })
    fireEvent.click(await screen.findByRole('option', { name: /The Matrix/ }))
    await screen.findByText('ficha de la película 603')

    // El input nunca perdió el foco, así que sólo el `click` puede reabrirlo.
    fireEvent.click(input)

    expect(await screen.findByText('Búsquedas recientes')).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('selects the highlighted suggestion with the arrow keys and Enter', async () => {
    renderNavbar()
    const input = searchInput()
    fireEvent.focus(input)
    await screen.findByText('Tendencias')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByText('ficha de la película 27205')).toBeInTheDocument()
  })

  it('submits to the results page when Enter is pressed without a highlight', async () => {
    searchMovies.mockResolvedValue({ movies: [MATRIX], page: 1, totalPages: 1 })

    renderNavbar()
    fireEvent.change(searchInput(), { target: { value: 'matrix' } })
    fireEvent.submit(screen.getByRole('search'))

    expect(await screen.findByText('resultados para matrix')).toBeInTheDocument()
  })

  it('closes the panel with Escape', async () => {
    renderNavbar()
    const input = searchInput()
    fireEvent.focus(input)
    await screen.findByText('Tendencias')

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('Navbar links', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('hides the profile link without a session', () => {
    renderNavbar()

    expect(screen.queryByRole('link', { name: 'Mi Perfil' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('shows the profile link with a session', () => {
    // El `beforeEach` limpia el almacenamiento, así que el token se pone aquí.
    localStorage.setItem('cinetracker.token', 'a.b.c')

    renderNavbar()

    expect(screen.getByRole('link', { name: 'Mi Perfil' })).toHaveAttribute('href', '/profile')
  })
})
