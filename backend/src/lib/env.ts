import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../../../.env") });

/**
 * Sin estas variables el servidor arranca igual, pero falla de formas que no se
 * parecen a su causa: sin `JWT_SECRET` toda petición autenticada responde 401 y
 * `jwt.sign` revienta con un TypeError sin nombre; sin `DATABASE_URL` el `new URL`
 * de `lib/prisma.ts` tira "Invalid URL" sin decir qué falta. Mejor morir aquí.
 */
const REQUIRED = ["DATABASE_URL", "JWT_SECRET"] as const;

const missing = REQUIRED.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. ` +
      "Copy .env.example to .env at the repository root and fill them in.",
  );
}

// `lib/prisma.ts` desarma esta URL para construir el adaptador de MariaDB, así que
// no basta con que exista: tiene que ser parseable.
try {
  new URL(process.env.DATABASE_URL as string);
} catch {
  throw new Error(
    "DATABASE_URL is not a valid URL (expected mysql://user:password@host:port/database).",
  );
}

/**
 * Origen exacto que CORS deja pasar con credenciales (la cookie de sesión). No entra
 * en `REQUIRED`: el puerto por defecto de Vite cubre el caso normal de desarrollo y
 * romper el arranque por esto sería desproporcionado.
 */
export const FRONTEND_URL = process.env.FRONTEND_URL?.trim() || "http://localhost:5173";
