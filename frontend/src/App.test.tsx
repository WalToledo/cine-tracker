import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// `App` monta Home, que pide las tendencias nada más renderizar. Sin este stub el
// test sale a la red de verdad: lento, dependiente del backend y verde o rojo según
// el día.
const { getTrendingMovies } = vi.hoisted(() => ({ getTrendingMovies: vi.fn() }))

vi.mock('./services/tmdb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/tmdb')>()
  return { ...actual, getTrendingMovies }
})

describe('App', () => {
  it('renders the CineTracker heading', () => {
    getTrendingMovies.mockResolvedValue([])

    render(<App />)

    expect(screen.getByRole('heading', { name: 'CineTracker' })).toBeInTheDocument()
  })
})
