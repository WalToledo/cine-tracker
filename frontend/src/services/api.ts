const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

// El JWT vive en una cookie httpOnly que este código no puede leer. Aquí sólo se
// guarda el usuario que ya devuelven login y register: sirve para pintar la UI sin
// esperar a una petición, y no es material sensible.
const SESSION_KEY = 'cinetracker.user'

// Quien ya usaba la app arrastra el JWT que se guardaba antes del Step 13. El
// backend ya no lo acepta, pero sigue siendo un token firmado y vivo durante días
// al alcance de cualquier XSS, que es justo lo que este cambio venía a evitar.
localStorage.removeItem('cinetracker.token')

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

/** Nunca lanza: un JSON manipulado a mano no puede tumbar la app entera. */
export function getSessionUser(): User | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? (JSON.parse(stored) as User) : null
  } catch {
    return null
  }
}

export function saveSession(user: User): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

/**
 * Optimista: dice que hay sesión mientras quede usuario guardado, sin saber si la
 * cookie sigue viva. Lo que descubre una sesión muerta es el primer 401.
 */
export function isAuthenticated(): boolean {
  return getSessionUser() !== null
}

/**
 * Sirve para saber qué reseñas son propias. Sólo decide qué mostrar en la UI:
 * el backend siempre revalida la propiedad del recurso.
 */
export function getCurrentUserId(): string | null {
  return getSessionUser()?.id ?? null
}

/**
 * Wrapper sobre fetch que normaliza los errores del backend (`{ error: string }`)
 * como ApiError. `credentials: 'include'` es lo que hace viajar la cookie de sesión:
 * sin él, el navegador no la manda a otro origen y todo responde 401.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

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

  // Sólo el backend puede borrar una cookie httpOnly, así que salir de verdad
  // exige esta llamada además de limpiar el estado local.
  logout(): Promise<void> {
    return apiFetch<void>('/auth/logout', { method: 'POST' })
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
