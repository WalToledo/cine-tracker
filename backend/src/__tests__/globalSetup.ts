import fs from "node:fs";
import path from "node:path";

import { ENV_TEST_PATH } from "./setup";

/**
 * El aviso vive aquí y no en `setup.ts` porque `globalSetup` corre una sola vez en el
 * proceso principal: en `setupFiles` se repetiría por cada archivo de test, y un aviso
 * que sale seis veces se vuelve ruido que nadie lee.
 *
 * `process.stderr` y no `console.warn`: vitest intercepta la consola y el reporter por
 * defecto se traga el mensaje, que es justo cuando más falta hace verlo.
 */
export default function globalSetup() {
  if (fs.existsSync(ENV_TEST_PATH)) {
    return;
  }

  process.stderr.write(
    `\n[warn] ${path.basename(ENV_TEST_PATH)} not found: the suites will write to the database ` +
      "configured in .env. Copy .env.test.example to .env.test to isolate them.\n\n",
  );
}
