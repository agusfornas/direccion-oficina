import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Compila la app como la espera un artefacto de claude.ai:
//   dist/app.js        la app
//   dist/parte-*.js    partes que se bajan solo cuando hacen falta (Excel, gráficos)
//   dist/logo.png
// La página dist/index.html la arma scripts/armar-pagina.mjs.
// Los nombres son fijos (sin códigos al azar): así cada publicación reemplaza los mismos
// archivos en vez de ir acumulando versiones viejas en el artefacto.
export default defineConfig({
  plugins: [react()],
  base: "./",
  // Todo el código en caracteres simples (los especiales como \uXXXX): claude.ai rechaza
  // archivos con algunos caracteres sueltos que trae la librería de Excel.
  esbuild: { charset: "ascii" },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: "src/main.tsx",
      output: {
        entryFileNames: "app.js",
        chunkFileNames: "parte-[name].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
