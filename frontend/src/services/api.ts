const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

const TOKEN_KEY = 'cinetracker.token'

export type WatchStatus = 'PENDING' | 'WATCHED'

export interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  username: string
}

export interface ProfileStats {
  watched: number
  pending: number
  reviews: number
}

export interface Profile {
  user: User
  stats: ProfileStats
}

export interface ProfileChanges {
  firstName?: string
  lastName?: string
  username?: string
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

export interface ReviewAuthor {
  id: string
  displayName: string
}

export interface Review {
  id: string
  movieId: number
  rating: number
  content: string
  createdAt: string
  updatedAt: string
  author: ReviewAuthor
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
 * Lee el `sub` del payload del JWT para saber qué reseñas son propias.
 * Sólo sirve para decidir qué mostrar en la UI: el backend siempre revalida
 * la propiedad del recurso.
 */
export function getCurrentUserId(): string | null {
  const token = getToken()
  if (!token) return null

  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const decoded: unknown = JSON.parse(json)

    if (decoded && typeof decoded === 'object' && 'sub' in decoded) {
      const sub = (decoded as { sub: unknown }).sub
      return typeof sub === 'string' ? sub : null
    }

    return null
  } catch {
    return null
  }
}

/**
 * Wrapper sobre fetch que adjunta el JWT de localStorage en cada petición
 * y normaliza los errores del backend (`{ error: string }`) como ApiError.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
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
  register(input: RegisterInput): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  login(email: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
}

export const usersApi = {
  // Devuelve las dos claves porque `stats` no es un atributo del usuario.
  getProfile(): Promise<Profile> {
    return apiFetch<Profile>('/users/profile')
  },

  async updateProfile(changes: ProfileChanges): Promise<User> {
    const { user } = await apiFetch<{ user: User }>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(changes),
    })
    return user
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

export const reviewsApi = {
  async listByMovie(movieId: number): Promise<Review[]> {
    const { reviews } = await apiFetch<{ reviews: Review[] }>(`/reviews/movie/${movieId}`)
    return reviews
  },

  async create(review: { movieId: number; rating: number; content: string }): Promise<Review> {
    const { review: created } = await apiFetch<{ review: Review }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(review),
    })
    return created
  },

  async update(id: string, changes: { rating?: number; content?: string }): Promise<Review> {
    const { review } = await apiFetch<{ review: Review }>(`/reviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    })
    return review
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`/reviews/${id}`, { method: 'DELETE' })
  },
}
