const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

const TOKEN_KEY = 'cinetracker.token'

export type WatchStatus = 'PENDING' | 'WATCHED'

export interface User {
  id: string
  email: string
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface WatchlistItem {
  id: string
  userId: string
  movieId: number
  title: string
  posterPath: string | null
  status: WatchStatus
  createdAt: string
  updatedAt: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

/**
 * Wrapper sobre fetch que adjunta el JWT de localStorage en cada petición
 * y normaliza los errores del backend (`{ error: string }`) como ApiError.
 */
async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()

  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers })

  if (response.status === 204) {
    return undefined as T
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body && typeof body.error === 'string' ? body.error : `Request failed (${response.status})`
    throw new ApiError(response.status, message)
  }

  return body as T
}

export const authApi = {
  register(email: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  login(email: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
}

export const watchlistApi = {
  async list(): Promise<WatchlistItem[]> {
    const { items } = await apiFetch<{ items: WatchlistItem[] }>('/watchlist')
    return items
  },

  async add(movie: {
    movieId: number
    title: string
    posterPath?: string | null
  }): Promise<WatchlistItem> {
    const { item } = await apiFetch<{ item: WatchlistItem }>('/watchlist', {
      method: 'POST',
      body: JSON.stringify(movie),
    })
    return item
  },

  async updateStatus(id: string, status: WatchStatus): Promise<WatchlistItem> {
    const { item } = await apiFetch<{ item: WatchlistItem }>(`/watchlist/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    return item
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`/watchlist/${id}`, { method: 'DELETE' })
  },
}
