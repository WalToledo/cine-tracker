# CineTracker

Monorepo con npm workspaces: `backend` (Express 5 + Prisma 7 + MySQL) y `frontend`
(React 19 + Vite + Tailwind 4). `SPEC.md` es la fuente de verdad del plan por steps —
conviene actualizarlo al cerrar uno. El Step 7 (búsqueda de películas) está PENDING.

## Comandos (desde la raíz)

```bash
npm run dev                      # levanta backend y frontend a la vez
npm test                         # ambas suites
npm run test:backend             # o test:frontend
npm run build:backend            # o build:frontend
npm run lint --workspace=frontend   # oxlint; sólo existe en frontend
```

## Lo que rompe si no se sabe

- **El `.env` está en la raíz**, no en los workspaces. `backend/src/lib/env.ts` y
  `backend/prisma.config.ts` lo resuelven por ruta relativa. Vite **no** lo lee (no hay
  `envDir` configurado), así que una variable `VITE_*` puesta ahí no llega al frontend.
- La API Key de TMDB vive **sólo en el servidor** (`TMDB_API_KEY`); el navegador consume
  películas por el proxy `/api/movies`. No reintroducir `VITE_TMDB_API_KEY`.
- Prisma 7 usa el generador `prisma-client` con salida en `backend/src/generated/prisma`
  (no `prisma-client-js`), y `DATABASE_URL` se lee desde `prisma.config.ts`, no del bloque
  `datasource`. Importar el cliente desde esa ruta generada, **no** desde `@prisma/client`.
  La sección 4 de `SPEC.md` está desactualizada en ese punto: no revertir `schema.prisma`
  a su texto literal, rompe la app. Los modelos y relaciones sí coinciden.
- Tras `prisma migrate dev` hay que correr `npx prisma generate`, o el modelo nuevo llega
  `undefined` en tiempo de ejecución.
- En Express 5 un handler con `:id` necesita `Request<{ id: string }>` explícito o `tsc`
  falla. Ejemplo en `backend/src/controllers/review.controller.ts`.
- Las rutas literales van antes que las paramétricas en el mismo router: en
  `movies.routes.ts`, `/trending` precede a `/:id`.
- Los tests del backend golpean MySQL de verdad; sólo `health.test.ts` y `movies.test.ts`
  corren sin base. Un `pool timeout` de Prisma con `active=0 idle=0` suele ser un handshake
  `caching_sha2_password` fallido, no la base caída.

## Convenciones

- Backend: comillas dobles y punto y coma. Frontend: comillas simples, sin punto y coma.
- Los errores del backend son `{ error: string }` **en inglés**; el frontend los traduce al
  español antes de mostrarlos.
- Los comentarios del código se escriben en español y explican el porqué, no el qué.
