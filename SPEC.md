# CineTracker - Project Specification

## 1. Project Overview
CineTracker is a Full-Stack web application for movie tracking. Users can browse trending movies (via the TMDB API), open a detail page with cast, director and trailer, manage their accounts, maintain a personalized watchlist (Pending/Watched) and review the movies they watched. Search is specified in Step 7 and is **not implemented yet**.
The project follows a simple Spec-Driven Development approach utilizing the Context7 MCP (Model Context Protocol) to manage project context and AI capabilities.

## 2. Tech Stack
- **Architecture:** Monorepo (npm workspaces or simple root folder containing frontend and backend).
- **Backend:** Node.js, Express, TypeScript.
- **Frontend:** React (built with Vite), TypeScript, Tailwind CSS.
- **Database & ORM:** MySQL, Prisma.
- **Authentication:** JWT (JSON Web Tokens).
- **External API:** TMDB API (The Movie Database), consumed **server-side** through the `/api/movies` proxy since Step 6 — never from the browser.
- **AI Integration:** Context7 MCP for extended context management and tooling in Claude Code.
- **Testing:** Vitest (test runner for both workspaces), Supertest (backend API testing), React Testing Library (frontend component testing).

## 3. Directory Structure

cinetracker/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── movies.controller.ts
│   │   │   ├── review.controller.ts
│   │   │   └── watchlist.controller.ts
│   │   ├── middlewares/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── movies.routes.ts
│   │   │   ├── review.routes.ts
│   │   │   └── watchlist.routes.ts
│   │   ├── services/
│   │   │   └── tmdb.service.ts
│   │   ├── __tests__/
│   │   │   ├── auth.test.ts
│   │   │   ├── health.test.ts
│   │   │   ├── movies.test.ts
│   │   │   ├── reviews.test.ts
│   │   │   └── watchlist.test.ts
│   │   ├── app.ts
│   │   └── index.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthForm.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── MovieCard.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── ReviewForm.tsx
│   │   │   ├── ReviewList.tsx
│   │   │   └── StarRating.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── MovieDetail.tsx
│   │   │   ├── MovieDetail.test.tsx
│   │   │   ├── Register.tsx
│   │   │   └── Watchlist.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── tmdb.ts
│   │   ├── vitest.setup.ts
│   │   ├── App.tsx
│   │   └── App.test.tsx
│   └── package.json
├── package.json
└── SPEC.md


## 4. Database Schema (Prisma)

> Nota: `provider = "prisma-client-js"` está deprecado en Prisma 7, y colocar `url` directamente en `datasource` rompe la app en esa versión. Se usa el generador `prisma-client` (output propio); `DATABASE_URL` se lee desde `backend/prisma.config.ts` en vez del bloque `datasource`. Modelos y relaciones sin cambios.

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "mysql"
}

model User {
  id        String          @id @default(uuid())
  email     String          @unique
  password  String          
  createdAt DateTime        @default(now())
  watchlist WatchlistItem[] 
  reviews   Review[]        
}

model WatchlistItem {
  id          String      @id @default(uuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  movieId     Int         
  title       String      
  posterPath  String?     
  status      WatchStatus @default(PENDING)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@unique([userId, movieId]) 
}

/// Una reseña por usuario y película (Step 5). `content` usa `@db.Text` porque el
/// `String` por defecto en MySQL es `VARCHAR(191)`; `rating` se valida en la
/// aplicación (entero 1-5) para no migrar por cada cambio de escala.
model Review {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  movieId   Int
  rating    Int      
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, movieId])
  @@index([movieId])
}

enum WatchStatus {
  PENDING
  WATCHED
}


## 5. Execution Plan (For AI Assistant)

### Step 1: Scaffolding & Setup (COMPLETED)
- Initialize the root folder as a monorepo.
- Initialize the backend folder with Node, TS, Express, and Prisma. Set up the basic Express server.
- Initialize the frontend folder with Vite (React + TS) and configure Tailwind CSS.
- Ensure TypeScript compiles correctly in both environments.
- Create a .env.example with necessary variables (DATABASE_URL, JWT_SECRET; `TMDB_API_KEY` and `VITE_API_URL` were added later, in Step 6).
- Acknowledge Context7 MCP usage and configure any initial settings if necessary for this workspace.
- Testing setup with Vitest completed: backend uses Supertest against an exported Express `app` (`src/app.ts`), frontend uses React Testing Library with jsdom; both workspaces pass `npm run test`.

### Step 2: Backend Auth & Database (COMPLETED)
- Run Prisma migrations for the User and WatchlistItem models.
- Implement /api/auth/register and /api/auth/login using bcrypt for password hashing and jsonwebtoken.
- Implement JWT middleware to protect routes.

### Step 3: Backend Watchlist API (COMPLETED)
- Implement /api/watchlist CRUD operations (GET, POST, PATCH, DELETE).
- All routes are protected by the `requireAuth` middleware and scoped to `req.user.id`.
- `POST /api/watchlist` respects the `@@unique([userId, movieId])` constraint (409 on duplicates).

### Step 4: Frontend Core (COMPLETED)
- Set up React Router (`react-router-dom` v7) with a shared layout + Navbar; `/watchlist` is protected by the presence of a token in `localStorage`.
- Build Login/Register pages that persist the JWT in `localStorage` and redirect home.
- Build Home page (fetch trending from TMDB; falls back to mock data when the API key is absent — see Step 6).
- Build Watchlist integration (list, toggle status, delete) against `/api/watchlist`.
- `src/services/api.ts` centralizes fetch calls and attaches `Authorization: Bearer <token>` on every request.

### Step 5: Movie Detail Page & Reviews (COMPLETED)
- New Prisma model `Review` (migration `add_review_model`), related to `User` and to the TMDB `movieId`.
  `@@unique([userId, movieId])` enforces one review per user and movie; `@@index([movieId])` supports the public listing.
- Backend `/api/reviews`: `GET /movie/:movieId` is **public**, while `POST /`, `PATCH /:id` and `DELETE /:id` are
  protected by `requireAuth`. Unlike `watchlist.routes.ts`, the middleware is applied per route instead of via `router.use`.
- Validation mirrors the watchlist controller: 400 on a non-integer `movieId`, a `rating` outside 1-5 or an empty
  `content` (max. 2000 chars), **409** when the user already reviewed the movie, and 404 (not 403) for someone else's review.
- Reviews are public, so the backend never returns the email: it exposes `author: { id, displayName }`, where
  `displayName` is the local part of the email, derived server-side.
- Frontend route `/movie/:id` is public (outside `ProtectedRoute`), reachable by clicking a poster or title in
  Home and in the watchlist. Without a session the review form is replaced by a link to `/login`.
- `services/tmdb.ts` adds `getMovieDetails()`, which fetches cast, director and trailer in a single request via
  `append_to_response=credits,videos` (director = `crew.job === 'Director'`, trailer = official YouTube `Trailer`),
  plus the `profileUrl()` / `backdropUrl()` helpers. Step 6 moved that TMDB call behind the backend proxy, keeping
  the same function signatures.
- `MovieDetail.tsx` shows the hero (backdrop, poster, runtime, genres, tagline), synopsis, cast grid, embedded
  YouTube trailer, a "save to watchlist" button and the reviews block. `StarRating.tsx` serves both as input and
  read-only display; `ReviewForm.tsx` creates and edits; `ReviewList.tsx` only offers Edit/Delete on the user's own review.
- `getCurrentUserId()` in `services/api.ts` reads `sub` from the JWT payload just to decide what the UI shows —
  ownership is always revalidated by the backend.
- Auth-gated actions never surface raw 401 messages: saving to the watchlist checks the session first, and any
  401 on the detail page clears the token and redirects to `/login`. The origin route travels in `state.from`, so
  `Login`/`Register` send the user back where they were (this also applies to `ProtectedRoute` redirects).
- Tests: `backend/src/__tests__/reviews.test.ts` (12 cases, including public GET, 409 on duplicate, 404 on someone
  else's review and the absence of emails in the payload) and `frontend/src/pages/MovieDetail.test.tsx`.
  `vitest.setup.ts` now calls Testing Library's `cleanup` after each test, since the project does not use `globals: true`.

### Step 6: TMDB Proxy (COMPLETED)
- TMDB is no longer called from the browser. The v3 API key lives **only** on the server as `TMDB_API_KEY`
  (root `.env`, loaded by `src/lib/env.ts`), so it never reaches the frontend bundle. `VITE_TMDB_API_KEY` is gone.
- New public routes `GET /api/movies/trending` → `{ movies }` and `GET /api/movies/:id` → `{ movie }`
  (`/trending` is declared before `/:id` so the param does not swallow it). No `requireAuth`, like the public
  review listing. A non-integer `id` returns 400; `TmdbNotFoundError` maps to 404.
- `backend/src/services/tmdb.service.ts` owns everything key-dependent: the TMDB response types, `toMovie()`,
  `pickTrailerKey()`, the `append_to_response=credits,videos` request and `MOCK_MOVIES`. The mock fallback now
  triggers on a missing **server-side** key, so the frontend no longer needs to know whether one is configured.
  Responses are cached in memory for 10 minutes to stay within TMDB's rate limit (`clearTmdbCache()` for tests).
- `frontend/src/services/tmdb.ts` keeps the public types and the `posterUrl()` / `profileUrl()` / `backdropUrl()`
  helpers (`image.tmdb.org` is a public CDN, no key needed) and now calls the proxy through the `apiFetch` exported
  by `services/api.ts`. `getTrendingMovies()` and `getMovieDetails()` keep their exact signatures, so `Home.tsx`,
  `MovieDetail.tsx` and their tests were untouched.
- Tests: `backend/src/__tests__/movies.test.ts` (8 cases) stubs `fetch` and `TMDB_API_KEY` — it is the only
  backend suite that does not need the database.

### Step 7: Movie Search (PENDING)
- **Not implemented yet.** This is the only step that is not COMPLETED.
- Backend: `GET /api/movies/search?q=<text>` in `movies.routes.ts`, public like the rest of the catalogue. It must
  be declared **before** `/:id` — same reason as `/trending` — or the param route swallows it.
- It reuses `backend/src/services/tmdb.service.ts`: TMDB's `/search/movie` with `language=es-ES`, mapped with the
  existing `toMovie()` and wrapped in the same `withCache()` (key `search:<q>`). Response shape `{ movies }`, like
  `/trending`.
- Validation mirrors `review.controller.ts`: a missing or empty-after-`trim()` `q` returns 400 with
  `{ error: "q is required" }`.
- Without a server-side `TMDB_API_KEY`, filter `MOCK_MOVIES` by title (case-insensitive), so the Step 6 fallback
  stays coherent.
- Frontend: `searchMovies(query)` in `services/tmdb.ts`, going through the `apiFetch` exported by `services/api.ts`
  and keeping the existing `Movie` type.
- A search input in `components/Navbar.tsx` navigates to a new public `/search?q=...` route in `App.tsx`, outside
  `ProtectedRoute`. Results reuse `components/MovieCard.tsx` and the same grid as `pages/Home.tsx`, including its
  logic for marking as `saved` whatever is already in the watchlist.
- Tests: new cases in `backend/src/__tests__/movies.test.ts`, stubbing `fetch` and `TMDB_API_KEY` like the Step 6
  ones — result mapping, 400 on an empty `q`, and mock filtering without a key.