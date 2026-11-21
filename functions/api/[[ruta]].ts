// Cloudflare Pages ejecuta este archivo para todo lo que empieza con /api/.
// La lógica está en servidor/ (así se puede probar sin Cloudflare).
import { manejar, type Env } from "../../servidor/rutas";

export const onRequest = (contexto: { request: Request; env: Env }) => manejar(contexto.request, contexto.env);
