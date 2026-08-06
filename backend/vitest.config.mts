import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: ["src/__tests__/setup.ts"],
    globalSetup: ["src/__tests__/globalSetup.ts"],
    // Las suites comparten una única base: en paralelo se pisan entre ellas (y los
    // datos aleatorios sólo disimulan la colisión). Una detrás de otra es más lento
    // pero determinista.
    fileParallelism: false,
  },
});
