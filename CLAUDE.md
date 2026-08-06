# CineTracker

Monorepo con npm workspaces: `backend` (Express 5 + Prisma 7 + MySQL) y `frontend`
(React 19 + Vite + Tailwind 4). `SPEC.md` es la fuente de verdad del plan por steps —
conviene actualizarlo al cerrar uno. Los 11 steps están COMPLETED.

## Comandos (desde la raíz)

```bash
npm run dev                      # levanta backend y frontend a la vez
npm test                         # ambas suites
npm run test:backend             # o test:frontend
npm run build:backend            # o build:frontend
npm run lint --workspace=frontend   # oxlint; sólo existe en frontend
```

## Lo que rompe si no se sabe

- **El `.env` del backend está en la raíz**, no en los workspaces. `backend/src/lib/env.ts` y
  `backend/prisma.config.ts` lo resuelven por ruta relativa. Vite **no** lo lee (no hay
  `envDir` configurado): las variables `VITE_*` van en `frontend/.env`, y su plantilla es
  `frontend/.env.example`.
- `env.ts` corta el arranque si faltan `DATABASE_URL` o `JWT_SECRET`, o si la primera no es una
  URL parseable. Es a propósito: antes, sin `JWT_SECRET`, la API respondía 401 a todo y `jwt.sign`
  tiraba un `TypeError` sin nombrar la variable. Cualquier script que importe `app.ts` necesita
  ese `.env` presente.
- La API Key de TMDB vive **sólo en el servidor** (`TMDB_API_KEY`); el navegador consume
  películas por el proxy `/api/movies`. No reintroducir `VITE_TMDB_API_KEY`.
- Prisma 7 usa el generador `prisma-client` con salida en `backend/src/generated/prisma`
  (no `prisma-client-js`). Importar el cliente desde esa ruta generada, **no** desde
  `@prisma/client`.
- El bloque `datasource` de `schema.prisma` no lleva `url` a propósito, y son dos caminos
  distintos: el **CLI** (`migrate`, `generate`) lee `DATABASE_URL` desde `prisma.config.ts`;
  en **tiempo de ejecución** el cliente no la usa, porque `src/lib/prisma.ts` le pasa un
  `PrismaMariaDb` de `@prisma/adapter-mariadb` construido con esa URL parseada a mano.
- Tras `prisma migrate dev` hay que correr `npx prisma generate`, o el modelo nuevo llega
  `undefined` en tiempo de ejecución. El `postinstall` del backend lo corre solo tras cada
  `npm install`, que es lo que salva a un clon limpio: `src/generated/prisma` está gitignored.
- El generador lleva `moduleFormat = "cjs"` a propósito: el backend compila a CommonJS y,
  sin esa línea, Prisma emite el cliente en ESM con `import.meta.url` y `npm run start`
  muere con `exports is not defined in ES module scope` (el `tsc` sí pasa; sólo falla al
  ejecutar el `dist`).
- En Express 5 un handler con `:id` necesita `Request<{ id: string }>` explícito o `tsc`
  falla. Ejemplo en `backend/src/controllers/review.controller.ts`.
- En Express 5 `req.query` es un **getter del prototipo**: asignarlo lanza un `TypeError` que
  `tsc` no detecta. Por eso `validateQuery` deja el resultado en `req.validatedQuery`
  (declarado en `types/express/index.d.ts`) y `searchMovies` lo lee de ahí. Los params de ruta
  se siguen validando a mano por el mismo motivo.
- El contrato de error es `{ error }` con **un solo** mensaje, así que `validate.middleware.ts`
  se queda con `issues[0]`. Para que no dependa del orden interno de Zod, todos los checks de un
  campo comparten mensaje y los de "falta el campo" comparten el agregado del endpoint
  (`REGISTER_REQUIRED_ERROR`). Cambiar eso rompe `auth.test.ts` de formas poco obvias.
- `requireAuth` va **antes** de `validate` en cada router: al revés, una petición sin token
  recibiría el 400 del schema en vez del 401 que asertan las suites.
- Las reglas de contraseña están duplicadas en `backend/src/lib/password.ts` y
  `frontend/src/services/password.ts` (workspaces sin módulos compartidos). Hay que cambiarlas a
  la vez, o la barra se pone verde sobre algo que el backend rechaza con un 400. Las dos tablas
  de casos gemelas de sus tests son la red.
- El login **no** aplica la política de contraseñas, a propósito: las cuentas anteriores al Step
  11 tienen contraseñas que ya no pasarían el registro y quedarían fuera para siempre.
- Las rutas literales van antes que las paramétricas en el mismo router: en
  `movies.routes.ts`, `/trending` y `/search` preceden a `/:id`.
- Los tests del backend golpean MySQL de verdad; sólo `health.test.ts` y `movies.test.ts`
  corren sin base, pero **no sin `DATABASE_URL`**: importan `app.ts`, que arrastra a Prisma, y
  `src/lib/prisma.ts` hace `new URL(process.env.DATABASE_URL!)` al cargarse. Basta con que la
  variable sea parseable aunque no apunte a nada vivo. Un `pool timeout` de Prisma con
  `active=0 idle=0` suele ser un handshake `caching_sha2_password` fallido, no la base caída.
- `src/__tests__/setup.ts` carga un `.env.test` de la raíz (opcional, plantilla en
  `.env.test.example`) con `override: true` para que las suites no escriban en la base de
  desarrollo. Si no existe, `globalSetup.ts` avisa y se sigue contra el `.env` normal. Las suites
  corren en serie (`fileParallelism: false`): comparten base y en paralelo se pisaban.
- Ese aviso va por `process.stderr.write` y vive en `globalSetup`, no en `setupFiles`: vitest
  intercepta la consola y el reporter por defecto se traga los `console.warn` del setup, y
  `setupFiles` corre una vez por archivo de test, así que el mensaje salía seis veces.
- El índice único de `username` hereda la collation `utf8mb4_unicode_ci`, que es **insensible a
  mayúsculas**: `Walter` y `walter` colisionan. Nunca comparar usernames con `===` en JavaScript;
  `auth.controller.ts` usa dos `findUnique` separados para distinguir el 409 de email del de
  username, y `user.controller.ts` excluye al propio usuario por `id`, no por texto.
- Las reseñas exponen `author: { id, displayName }` y ese `displayName` sale del `username`. El
  `authorSelect` de `review.controller.ts` no debe volver a pedir el `email`: ahí está la garantía
  de que no se filtra.
- `tmdb.service.ts` cachea las respuestas 10 minutos en memoria. Un test que espere una petición
  nueva tiene que llamar antes a `clearTmdbCache()`.
- Los usernames de los tests no pueden llevar los guiones de `randomUUID()`: el patrón
  `[a-zA-Z0-9_]{3,30}` los rechaza con un 400 que parece de otro campo.
- El buscador del Navbar lleva un debounce de 250 ms y no usa `AbortController`; las respuestas
  obsoletas se descartan con el patrón `let active = true` que comparten `Home.tsx`, `Search.tsx`
  y `Profile.tsx`.
- El `trendingRequested` de `Navbar.tsx` pide las tendencias una sola vez por sesión, pero se
  marca **antes** de que llegue la respuesta. Hay que liberarlo si la petición falla o si el panel
  se cierra antes de tiempo: si no, el `.finally` no llega a apagar el spinner y el efecto tampoco
  vuelve a entrar, así que el "cargando" se queda para siempre.

## Convenciones

- Backend: comillas dobles y punto y coma. Frontend: comillas simples, sin punto y coma.
- Los errores del backend son `{ error: string }` **en inglés**; el frontend los traduce al
  español en `services/errors.ts` antes de mostrarlos. Nunca se pinta `err.message` crudo: se
  llama a `translateError(err, fallback)`, donde el `fallback` cubre red caída y mensajes que
  todavía no están en el diccionario. Ese diccionario indexa por el texto literal del
  controlador, así que cambiarlo en el backend rompe la traducción en silencio.
- El contrato `{ error }` lo cierra `middlewares/error.middleware.ts`: un throw sin capturar ya
  no sale como HTML con el stack. El stack sólo viaja si `NODE_ENV !== "production"`, y los
  scripts lo fijan con `cross-env` (en Windows `NODE_ENV=x cmd` no funciona a secas).
- Los comentarios del código se escriben en español y explican el porqué, no el qué.
- Un recurso de otro usuario devuelve **404, no 403** (`review.controller.ts`,
  `watchlist.controller.ts`): no se revela que exista.

## Reglas Maestras de Documentación (Skill para SPEC.md)

Cuando se te pida actualizar el archivo `SPEC.md` para marcar un step como COMPLETED, actúa como un Arquitecto de Software de alto nivel y obedece estrictamente estas reglas para evitar el exceso de texto:

1. **Sé Extremadamente Conciso:** Limítate a un máximo de 4 bullet points (viñetas) cortos por step. No escribas un changelog de commits.
2. **Enfócate en el "Qué" y "Dónde", no en el "Cómo":** Menciona qué modelos de base de datos se agregaron, las nuevas rutas de la API y los componentes/páginas principales del frontend. Omite explicaciones de lógica interna, transacciones SQL, clases de UI (Tailwind) o justificaciones de decisiones técnicas.
3. **Omite Detalles de Testing:** No listes la cantidad de casos de prueba, ni describas los mocks o limpiezas de DOM, a menos que se haya introducido una librería de testing completamente nueva al stack.