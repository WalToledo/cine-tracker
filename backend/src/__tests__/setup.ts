import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";

/**
 * Las suites crean usuarios, watchlists y reseñas de verdad. Sin esto van a parar a
 * la misma base que `npm run dev`, y lo único que las separa de los datos reales son
 * los valores aleatorios que cada test se inventa.
 *
 * `.env.test` en la raíz (opcional, ver `.env.test.example`) manda sobre el `.env`
 * para apuntarlas a una base propia. Se carga aquí, en `setupFiles`, porque cada
 * archivo de test corre en su propio proceso y necesita el override antes de que
 * `app.ts` arrastre a `lib/env.ts`. El aviso de que falta lo da `globalSetup.ts`.
 *
 * El cwd es el workspace `backend/`, así que la raíz del repo queda un nivel arriba.
 */
export const ENV_TEST_PATH = path.resolve(process.cwd(), "../.env.test");

if (fs.existsSync(ENV_TEST_PATH)) {
  config({ path: ENV_TEST_PATH, override: true });
}
