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
│   ├── prisma.config.ts
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── movies.controller.ts
│   │   │   ├── review.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   └── watchlist.controller.ts
│   │   ├── lib/
│   │   │   ├── env.ts
│   │   │   ├── prisma.ts
│   │   │   └── user.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── movies.routes.ts
│   │   │   ├── review.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   └── watchlist.routes.ts
│   │   ├── services/
│   │   │   └── tmdb.service.ts
│   │   ├── types/
│   │   │   └── express/
│   │   │       └── index.d.ts
│   │   ├── __tests__/
│   │   │   ├── auth.test.ts
│   │   │   ├── globalSetup.ts
│   │   │   ├── health.test.ts
│   │   │   ├── movies.test.ts
│   │   │   ├── reviews.test.ts
│   │   │   ├── setup.ts
│   │   │   ├── users.test.ts
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
│   │   │   ├── Profile.tsx
│   │   │   ├── Profile.test.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Register.test.tsx
│   │   │   ├── Search.tsx
│   │   │   ├── Search.test.tsx
│   │   │   └── Watchlist.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── errors.ts
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

/// `@db.VarChar` explícito porque un `String` sin anotar es `VARCHAR(191)` en MySQL.
/// El índice único de `username` hereda la collation `utf8mb4_unicode_ci`, que es
/// insensible a mayúsculas: "Walter" y "walter" son el mismo usuario a propósito.
model User {
  id        String          @id @default(uuid())
  email     String          @unique
  password  String          
  firstName String          @db.VarChar(50)
  lastName  String          @db.VarChar(50)
  username  String          @unique @db.VarChar(30)
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
- Build Home page (fetch trending through the backend proxy — see Step 6).
- Build Watchlist integration (list, toggle status, delete) against `/api/watchlist`.
- `src/services/api.ts` centralizes fetch calls and attaches `Authorization: Bearer <token>` on every request.

### Step 5: Movie Detail Page & Reviews (COMPLETED)
- **Database:** new `Review` model (migration `add_review_model`), one review per user and movie.
- **Backend:** `/api/reviews` — `GET /movie/:movieId` is public; `POST /`, `PATCH /:id` and
  `DELETE /:id` are behind `requireAuth`. Reviews expose `author: { id, displayName }`, never the email.
- **Frontend:** public route `/movie/:id` → `pages/MovieDetail.tsx`, with the new
  `components/StarRating.tsx`, `ReviewForm.tsx` and `ReviewList.tsx`.
- **Frontend:** `services/tmdb.ts` adds `getMovieDetails()` (cast, director and trailer) plus the
  `profileUrl()` / `backdropUrl()` helpers.

### Step 6: TMDB Proxy (COMPLETED)
- **Backend:** new public routes `GET /api/movies/trending` and `GET /api/movies/:id`, in
  `movies.controller.ts` and `routes/movies.routes.ts`.
- **Backend:** `services/tmdb.service.ts` owns every key-dependent call and the mock fallback; the
  v3 key lives only on the server as `TMDB_API_KEY` and `VITE_TMDB_API_KEY` is gone.
- **Frontend:** `services/tmdb.ts` keeps its public types and image helpers but now calls the proxy
  through `apiFetch`.
- **Frontend:** `getTrendingMovies()` and `getMovieDetails()` keep their signatures, so `Home.tsx`
  and `MovieDetail.tsx` were untouched.

### Step 7: Movie Search (COMPLETED)
- **Backend:** `GET /api/movies/search?q=<text>&page=<n>` in `movies.routes.ts`, public and
  paginated → `{ movies, page, totalPages }`. Reuses `services/tmdb.service.ts`.
- **Frontend:** `searchMovies(query, page)` in `services/tmdb.ts`, and the new public route
  `/search` → `pages/Search.tsx`, which reuses `components/MovieCard.tsx`.
- **Frontend:** a search input in `components/Navbar.tsx` navigates to `/search?q=...` and stays in
  sync with the URL.
- **Frontend:** the "mark what is already saved" logic moved out of `Home.tsx` into the new
  `hooks/useWatchlistSave.ts`, shared by Home and Search.

### Step 8: Search Suggestions (COMPLETED)
- **No backend changes:** the dropdown reuses `GET /api/movies/trending` and `GET /api/movies/search`.
- **Frontend:** the search input in `components/Navbar.tsx` became an ARIA combobox driving the new
  presentational `components/SearchSuggestions.tsx`.
- **Frontend:** focused and empty it lists recent searches then trending; while typing, the top
  search results. Picking a row opens `/movie/:id`; Enter without a highlighted row keeps `/search?q=…`.
- **Frontend:** new `services/recentSearches.ts` (up to 5 picked movies in `localStorage`) and the
  generic `hooks/useDebouncedValue.ts`.

### Step 9: User Profile & Extended Registration (COMPLETED)
- **Database:** `User` gains `firstName`, `lastName` and `username` (unique), in migration
  `add_user_profile_fields`.
- **Backend:** `GET` and `PATCH /api/users/profile` in the new `user.controller.ts` and
  `user.routes.ts` (protected); `GET` returns the user plus `{ watched, pending, reviews }` counts.
  Shared field validation lives in the new `src/lib/user.ts`.
- **Backend:** `register` now requires the new fields, and reviews expose the real `username` as
  the author's `displayName`.
- **Frontend:** new protected `pages/Profile.tsx` with the stat cards and inline editing;
  `components/AuthForm.tsx` and `pages/Register.tsx` render the new inputs; "Mi Perfil" link in
  `components/Navbar.tsx`.

### Step 10: Hardening & Documentation Debt (COMPLETED)
- **Startup:** `postinstall` running `prisma generate` in `backend/package.json`; `src/lib/env.ts`
  now fails fast when `DATABASE_URL` or `JWT_SECRET` are missing or unparseable; `VITE_API_URL`
  moved out of the root `.env.example` into the new `frontend/.env.example`.
- **Backend:** new `middlewares/error.middleware.ts` (`errorHandler` + `notFoundHandler`) closing
  `app.ts` with the `{ error }` contract; `NODE_ENV` set in the scripts through `cross-env`;
  `index.ts` warns when `TMDB_API_KEY` is absent; `tsconfig.json` excludes `src/__tests__`.
- **Frontend:** new `services/errors.ts` (`translateError`, `isUnauthorized`) shared by
  `pages/Login.tsx`, `Register.tsx` and `Watchlist.tsx`, which now redirects on 401; the trending
  guard in `components/Navbar.tsx` is released on failure and on unmount; `strict` on in
  `tsconfig.app.json`.
- **Testing:** an optional root `.env.test` (see `.env.test.example`) points the backend suites at
  their own database, wired through the new `src/__tests__/setup.ts` and `globalSetup.ts`, and the
  suites now run serially.