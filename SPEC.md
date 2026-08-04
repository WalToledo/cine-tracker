# CineTracker - Project Specification

## 1. Project Overview
CineTracker is a Full-Stack web application for movie tracking. Users can search for movies (via TMDB API), manage their accounts, and maintain a personalized watchlist (Pending/Watched). 
The project follows a simple Spec-Driven Development approach utilizing the Context7 MCP (Model Context Protocol) to manage project context and AI capabilities.

## 2. Tech Stack
- **Architecture:** Monorepo (npm workspaces or simple root folder containing frontend and backend).
- **Backend:** Node.js, Express, TypeScript.
- **Frontend:** React (built with Vite), TypeScript, Tailwind CSS.
- **Database & ORM:** MySQL, Prisma.
- **Authentication:** JWT (JSON Web Tokens).
- **External API:** TMDB API (The Movie Database).
- **AI Integration:** Context7 MCP for extended context management and tooling in Claude Code.

## 3. Directory Structure

cinetracker/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   └── index.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.tsx
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

enum WatchStatus {
  PENDING
  WATCHED
}


## 5. Execution Plan (For AI Assistant)

### Step 1: Scaffolding & Setup (CURRENT GOAL)
- Initialize the root folder as a monorepo.
- Initialize the backend folder with Node, TS, Express, and Prisma. Set up the basic Express server.
- Initialize the frontend folder with Vite (React + TS) and configure Tailwind CSS.
- Ensure TypeScript compiles correctly in both environments.
- Create a .env.example with necessary variables (DATABASE_URL, JWT_SECRET).
- Acknowledge Context7 MCP usage and configure any initial settings if necessary for this workspace.

### Step 2: Backend Auth & Database (Pending)
- Run Prisma migrations for the User and WatchlistItem models.
- Implement /api/auth/register and /api/auth/login using bcrypt for password hashing and jsonwebtoken.
- Implement JWT middleware to protect routes.

### Step 3: Backend Watchlist API (Pending)
- Implement /api/watchlist CRUD operations (GET, POST, PATCH, DELETE).

### Step 4: Frontend Core (Pending)
- Set up React Router.
- Build Login/Register pages.
- Build Home page (fetch trending from TMDB).
- Build Movie Details & Watchlist integration.