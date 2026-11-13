import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

// Pruebas de las reglas de negocio del panel (PR 0.1, nov 2026). Solo código
// puro: nada aquí toca la base ni la red. Correr con `npm test`.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
