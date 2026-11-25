import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Compila la página en dist/, que es lo que publica Cloudflare Pages.
// El servidor (functions/ y servidor/) lo compila Cloudflare aparte.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    chunkSizeWarningLimit: 1200,
  },
  test: { include: ["src/**/*.test.ts", "servidor/**/*.test.ts"] },
});
