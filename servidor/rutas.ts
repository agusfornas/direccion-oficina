// Las direcciones del servidor (todas bajo /api). La página las usa desde src/comun/servidor.ts.
//
//   GET  /api/yo                     → { email } de quien está usando la app
//   GET  /api/c/:coleccion           → todos los documentos de la colección
//   GET  /api/c/:coleccion/:id       → un documento (404 si no existe)
//   POST /api/c/:coleccion/nuevo     → crea con número siguiente  { prefijo, numeroComoTexto, documento }
//   PUT  /api/c/:coleccion/:id       → { documento, revEsperada }  guarda si nadie lo cambió
//                                      { documento, soloCrear: true }  crea si no existe
import { quienEs, type EnvAcceso } from "./acceso";
import { COLECCIONES, crearNumerado, crearSiNoExiste, ErrorAlmacen, leer, listar, prepararBase, reemplazar, type Base, type Coleccion } from "./almacen";

export interface Env extends EnvAcceso {
  DB: Base;
}

const responder = (datos: unknown, estado = 200) =>
  new Response(JSON.stringify(datos), { status: estado, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const error = (estado: number, mensaje: string) => responder({ error: mensaje }, estado);
const ID_VALIDO = /^[A-Za-z0-9_-]{1,40}$/;
const TOPE_BYTES = 512 * 1024;

async function cuerpo(pedido: Request): Promise<Record<string, unknown>> {
  const texto = await pedido.text();
  if (texto.length > TOPE_BYTES) throw new ErrorAlmacen(413, "Lo que se quiso guardar es demasiado grande.");
  const d = JSON.parse(texto);
  if (!d || typeof d !== "object" || Array.isArray(d)) throw new ErrorAlmacen(400, "Pedido inválido.");
  return d;
}
const esDocumento = (d: unknown): d is Record<string, unknown> => !!d && typeof d === "object" && !Array.isArray(d);

export async function manejar(pedido: Request, env: Env, buscar: typeof fetch = fetch): Promise<Response> {
  const email = await quienEs(pedido, env, buscar);
  if (!email) return error(401, "Tu sesión no es válida o venció. Recargá la página para volver a entrar.");
  try {
    await prepararBase(env.DB);
    const partes = new URL(pedido.url).pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
    if (partes[0] === "yo" && partes.length === 1 && pedido.method === "GET") return responder({ email });
    if (partes[0] !== "c" || !COLECCIONES.includes(partes[1] as Coleccion) || partes.length > 3) return error(404, "No existe.");
    const col = partes[1] as Coleccion;
    const id = partes[2];
    if (id !== undefined && !ID_VALIDO.test(id)) return error(400, "Identificador inválido.");

    if (pedido.method === "GET" && id === undefined) return responder(await listar(env.DB, col));
    if (pedido.method === "GET") {
      const d = await leer(env.DB, col, id!);
      return d ? responder(d) : error(404, "No existe.");
    }
    if (pedido.method === "POST" && id === "nuevo") {
      const b = await cuerpo(pedido);
      if (typeof b.prefijo !== "string" || !/^[a-z]{1,3}$/.test(b.prefijo) || !esDocumento(b.documento)) return error(400, "Pedido inválido.");
      return responder(await crearNumerado(env.DB, col, b.prefijo, b.numeroComoTexto === true, b.documento, email), 201);
    }
    if (pedido.method === "PUT" && id !== undefined) {
      const b = await cuerpo(pedido);
      if (!esDocumento(b.documento)) return error(400, "Pedido inválido.");
      if (b.soloCrear === true) return responder(await crearSiNoExiste(env.DB, col, id, b.documento, email), 201);
      if (typeof b.revEsperada !== "number") return error(400, "Falta revEsperada.");
      return responder(await reemplazar(env.DB, col, id, b.documento, b.revEsperada, email));
    }
    return error(405, "Operación no permitida.");
  } catch (e) {
    if (e instanceof ErrorAlmacen) return error(e.estado, e.message);
    if (e instanceof SyntaxError) return error(400, "Pedido inválido.");
    console.error(e);
    return error(500, "Error del servidor. Probá de nuevo en un momento.");
  }
}
