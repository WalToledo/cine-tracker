# CineTracker - Project Specification

## 1. Project Overview
CineTracker is a Full-Stack web application for movie tracking. Users can browse trending movies (via the TMDB API), search the catalogue by title, open a detail page with cast, director and trailer, manage their accounts, maintain a personalized watchlist (Pending/Watched) and review the movies they watched.
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
│   │   │   ├── Navbar.test.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── ReviewForm.tsx
│   │   │   ├── ReviewList.tsx
│   │   │   ├── SearchSuggestions.tsx
│   │   │   └── StarRating.tsx
│   │   ├── hooks/
│   │   │   ├── useDebouncedValue.ts
│   │   │   └── useWatchlistSave.ts
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── MovieDetail.tsx
│   │   │   ├── MovieDetail.test.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Search.tsx
│   │   │   ├── Search.test.tsx
│   │   │   └── Watchlist.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── recentSearches.ts
│   │   │   └── tmdb.ts
│   │   ├── vitest.setup.ts
│   │   ├── App.tsx
│   │   └── App.test.tsx
│   └── package.json
├── package.json
└── SPEC.md


## 4. Database Schema (Prisma)

> Nota: `provider = "prisma-client-js"` está deprecado en Prisma 7, y colocar `url` directamente en `datasource` rompe la app en esa versión. Se usa el generador `prisma-client` (output propio); `DATABASE_URL` se lee desde `backend/prisma.config.ts` en vez del bloque `datasource`. `moduleFormat = "cjs"` es obligatorio aquí: el backend compila a CommonJS y, por defecto, el cliente sale en ESM con `import.meta.url` y el `dist` no arranca. Modelos y relaciones sin cambios.

generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
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

### Step 7: Movie Search (COMPLETED)
- **Deviation from the original spec:** search is paginated, so two details changed. The response is
  `{ movies, page, totalPages }` instead of `{ movies }` (TMDB already reports `page` / `total_pages`, and without
  paging only the first 20 results would ever be reachable), and the cache key is `search:<q>:<page>` instead of
  `search:<q>`.
- Backend: `GET /api/movies/search?q=<text>&page=<n>` in `movies.routes.ts`, public like the rest of the catalogue
  and declared **before** `/:id` — same reason as `/trending` — or the param route swallows it.
- It reuses `backend/src/services/tmdb.service.ts`: TMDB's `/search/movie` with `language=es-ES` and
  `include_adult=false`, mapped with the existing `toMovie()` and wrapped in the same `withCache()`. The query is
  `encodeURIComponent`-ed (unlike `/trending` and `/movie/:id`, which have nothing to escape) and the cache key is
  normalized with `trim().toLowerCase()` so `"Matrix"` and `"matrix "` share an entry.
- Validation mirrors `review.controller.ts`: a missing or empty-after-`trim()` `q` returns 400 with
  `{ error: "q is required" }`; `page` is optional, defaults to 1 and must be an integer within
  `1..MAX_SEARCH_PAGE` (500, TMDB's own limit) or it returns 400.
- Without a server-side `TMDB_API_KEY`, `MOCK_MOVIES` is filtered by title (case-insensitive) and answered as a
  single page, so the Step 6 fallback stays coherent.
- Frontend: `searchMovies(query, page)` in `services/tmdb.ts` goes through the `apiFetch` exported by
  `services/api.ts`, keeps the existing `Movie` type and translates the backend error to Spanish like
  `getMovieDetails()`.
- A search input in `components/Navbar.tsx` navigates to the new public `/search?q=...` route in `App.tsx`, outside
  `ProtectedRoute`. The input is kept in sync with `?q` via `useSearchParams`, so reloading or going back keeps it
  filled. `pages/Search.tsx` reuses `components/MovieCard.tsx` and the same grid as `pages/Home.tsx`, appends each
  extra page with a "Cargar más" button (shown only while `page < totalPages`) and reuses the empty-state styling
  of `pages/Watchlist.tsx`.
- The "mark what is already saved + tolerate the 409" logic that lived inside `Home.tsx` was extracted to
  `hooks/useWatchlistSave.ts` so both Home and Search share it instead of duplicating it. Saving without a session
  redirects to `/login` carrying `state.from` (including the query string), like the rest of the app.
- Tests: 5 new cases in `backend/src/__tests__/movies.test.ts` (mapping + pagination reporting, per-page caching,
  400 on missing/blank `q`, 400 on an out-of-range `page`, and mock filtering without a key) and the new
  `frontend/src/pages/Search.test.tsx` (results, "Cargar más" appending page 2, empty state, and no request when
  the URL has no `q`).

### Step 8: Search Suggestions (COMPLETED)
- **No backend changes.** The Navbar dropdown is built entirely on the endpoints Steps 6 and 7 already exposed
  (`GET /api/movies/trending` and `GET /api/movies/search`), which are public and cached for 10 minutes in
  `backend/src/services/tmdb.service.ts` — that cache is what makes an autocomplete affordable within TMDB's rate limit.
- The search input in `components/Navbar.tsx` became an ARIA combobox (`role="combobox"`, `aria-expanded`,
  `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`) driving a panel of suggestions.
- **Focused and empty** → recent searches (up to 4) followed by trending movies (up to 6, skipping ids already
  listed as recent). **While typing** → the top 7 results of `searchMovies(q, 1)`.
- A "recent search" stores the **movie the user picked**, not the typed text, so every row in the panel is the same
  kind of thing and every row navigates to `/movie/:id`. `services/recentSearches.ts` keeps up to 5 of them in
  `localStorage` under `cinetracker.recentSearches`, deduplicated by id, validating the parsed JSON and swallowing
  every error like `getCurrentUserId()` does — the Navbar renders on every page and must not break.
- Requests fire only from the second character on (a single letter returns noise) and go through the new generic
  `hooks/useDebouncedValue.ts` (250 ms), so a burst of keystrokes produces one request. Stale responses are
  discarded with the `let active = true` cleanup pattern already used in `Home.tsx` / `Search.tsx`; the project
  still uses no `AbortController`. Trending is fetched once per session, guarded by a `useRef`.
- Picking a suggestion goes straight to `/movie/:id`. **Enter without a highlighted row keeps the Step 7 behaviour**
  (`/search?q=…`), so the results page and its pagination are still reachable — that is why the highlight starts at
  `-1` and why no "see all results" row was added.
- Keyboard: `ArrowDown` / `ArrowUp` wrap around a flat index over every row (the group headings are not selectable),
  `Enter` picks, `Escape` closes without clearing the text, `Tab` closes. The panel also closes on a `mousedown`
  outside the form — the first `document` listener in the project.
- `components/SearchSuggestions.tsx` is presentational only (it receives the groups and the highlighted index, and
  owns no fetching). Its rows reuse `posterUrl()` and the poster + title + year layout of `MovieCard.tsx`, and they
  `preventDefault()` on `mousedown` so the input's `blur` does not close the panel before the `click` lands.
- Tests: the new `frontend/src/components/Navbar.test.tsx` (8 cases: trending on focus, recents listed first,
  debounce collapsing three keystrokes into one request, no request with a single character, click navigating to
  `/movie/603` plus the entry written to `localStorage`, arrows + Enter, submit falling back to `/search?q=`, and
  `Escape` closing). It mocks `services/tmdb` with `vi.hoisted` + `importOriginal` like `Search.test.tsx`, so
  `posterUrl` stays real; no fake timers are needed because 250 ms fits inside Testing Library's default timeout.