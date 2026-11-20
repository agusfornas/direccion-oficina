// Punto de entrada: monta la app en <div id="root"> de la página.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

async function arrancar() {
  // En la computadora (npm run dev) no hay claude.ai: se usa el simulador.
  if (import.meta.env.DEV && !window.claude) (await import("./simulador")).instalarSimulador();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
arrancar();
