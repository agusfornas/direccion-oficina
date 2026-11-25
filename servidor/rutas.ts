// Las direcciones del servidor (todas bajo /api). La página las usa desde src/comun/servidor.ts.
//
// Sin sesión (para la pantalla de entrada):
//   GET  /api/personas               → tarjetas: [{ id, nombre, tienePin }]
//   POST /api/entrar                 → { id, pin, crear? }  entra (o elige su PIN) y deja la cookie
//   POST /api/salir                  → cierra la sesión de este aparato
//   POST /api/personas               → { nombre }  solo si la lista está vacía (primera persona)
// Con sesión:
//   GET  /api/yo                     → { nombre }
//   POST /api/personas               → { nombre }  agrega una persona
//   POST /api/personas/:id/quitar     → la saca de la lista
//   POST /api/personas/:id/borrar-pin → para quien se olvidó el PIN
//   GET  /api/c/:coleccion           → todos los documentos de la colección
//   GET  /api/c/:coleccion/:id       → un documento (404 si no existe)
//   POST /api/c/:coleccion/nuevo     → crea con número siguiente  { prefijo, numeroComoTexto, documento }
//   PUT  /api/c/:coleccion/:id       → { documento, revEsperada }  guarda si nadie lo cambió
//                                      { documento, soloCrear: true }  crea si no existe
import { COLECCIONES, crearNumerado, crearSiNoExiste, ErrorAlmacen, leer, listar, prepararBase, reemplazar, type Base, type Coleccion } from "./almacen";
import { borrarPin, crearPersona, DIAS_SESION, entrar, listarPersonas, quitarPersona, salir, sesionDe } from "./personas";

export interface Env {
  DB: Base;
}

const COOKIE = "__Host-sesion";
const responder = (datos: unknown, estado = 200, cabeceras: Record<string, string> = {}) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...cabeceras },
  });
const error = (estado: number, mensaje: string) => responder({ error: mensaje }, estado);
const ID_VALIDO = /^[A-Za-z0-9_-]{1,40}$/;
const TOPE_BYTES = 512 * 1024;

function leerCookie(pedido: Request): string | null {
  const c = pedido.headers.get("cookie") ?? "";
  const m = c.match(new RegExp(`(?:^|;\\s*)${COOKIE.replace(/[-]/g, "\\-")}=([^;]+)`));
  return m ? m[1] : null;
}
const cookieSesion = (token: string) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DIAS_SESION * 86400}`;
const cookieBorrada = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

async function cuerpo(pedido: Request): Promise<Record<string, unknown>> {
  const texto = await pedido.text();
  if (texto.length > TOPE_BYTES) throw new ErrorAlmacen(413, "Lo que se quiso guardar es demasiado grande.");
  const d = JSON.parse(texto || "{}");
  if (!d || typeof d !== "object" || Array.isArray(d)) throw new ErrorAlmacen(400, "Pedido inválido.");
  return d;
}
const esDocumento = (d: unknown): d is Record<string, unknown> => !!d && typeof d === "object" && !Array.isArray(d);

export async function manejar(pedido: Request, env: Env): Promise<Response> {
  try {
    await prepararBase(env.DB);
    const partes = new URL(pedido.url).pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
    const metodo = pedido.method;
    const token = leerCookie(pedido);

    // ---- Sin sesión: pantalla de entrada ----
    if (partes[0] === "personas" && partes.length === 1 && metodo === "GET") return responder(await listarPersonas(env.DB));
    if (partes[0] === "entrar" && partes.length === 1 && metodo === "POST") {
      const b = await cuerpo(pedido);
      if (typeof b.id !== "number" || typeof b.pin !== "string") return error(400, "Pedido inválido.");
      const s = await entrar(env.DB, b.id, b.pin, b.crear === true);
      return responder({ nombre: s.nombre }, 200, { "set-cookie": cookieSesion(s.token) });
    }
    if (partes[0] === "salir" && partes.length === 1 && metodo === "POST") {
      await salir(env.DB, token);
      return responder({ ok: true }, 200, { "set-cookie": cookieBorrada });
    }

    const yo = await sesionDe(env.DB, token);

    // La primera persona se puede crear sin sesión (lista vacía: recién instalada).
    if (partes[0] === "personas" && partes.length === 1 && metodo === "POST") {
      if (!yo && (await listarPersonas(env.DB)).length > 0) return error(401, "Entrá con tu tarjeta para agregar personas.");
      const b = await cuerpo(pedido);
      return responder(await crearPersona(env.DB, String(b.nombre ?? "")), 201);
    }

    if (!yo) return error(401, "Tu sesión venció. Tocá tu tarjeta y poné tu PIN.");

    if (partes[0] === "yo" && partes.length === 1 && metodo === "GET") return responder({ nombre: yo.nombre });
    if (partes[0] === "personas" && partes.length === 3 && metodo === "POST") {
      const id = Number(partes[1]);
      if (!Number.isInteger(id)) return error(400, "Pedido inválido.");
      if (partes[2] === "quitar") {
        if (id === yo.id) return error(400, "No te podés quitar a vos mismo.");
        await quitarPersona(env.DB, id);
        return responder({ ok: true });
      }
      if (partes[2] === "borrar-pin") {
        await borrarPin(env.DB, id);
        return responder({ ok: true }, 200, id === yo.id ? { "set-cookie": cookieBorrada } : {});
      }
      return error(404, "No existe.");
    }

    if (partes[0] !== "c" || !COLECCIONES.includes(partes[1] as Coleccion) || partes.length > 3) return error(404, "No existe.");
    const col = partes[1] as Coleccion;
    const id = partes[2];
    if (id !== undefined && !ID_VALIDO.test(id)) return error(400, "Identificador inválido.");

    if (metodo === "GET" && id === undefined) return responder(await listar(env.DB, col));
    if (metodo === "GET") {
      const d = await leer(env.DB, col, id!);
      return d ? responder(d) : error(404, "No existe.");
    }
    if (metodo === "POST" && id === "nuevo") {
      const b = await cuerpo(pedido);
      if (typeof b.prefijo !== "string" || !/^[a-z]{1,3}$/.test(b.prefijo) || !esDocumento(b.documento)) return error(400, "Pedido inválido.");
      return responder(await crearNumerado(env.DB, col, b.prefijo, b.numeroComoTexto === true, b.documento, yo.nombre), 201);
    }
    if (metodo === "PUT" && id !== undefined) {
      const b = await cuerpo(pedido);
      if (!esDocumento(b.documento)) return error(400, "Pedido inválido.");
      if (b.soloCrear === true) return responder(await crearSiNoExiste(env.DB, col, id, b.documento, yo.nombre), 201);
      if (typeof b.revEsperada !== "number") return error(400, "Falta revEsperada.");
      return responder(await reemplazar(env.DB, col, id, b.documento, b.revEsperada, yo.nombre));
    }
    return error(405, "Operación no permitida.");
  } catch (e) {
    if (e instanceof ErrorAlmacen) return error(e.estado, e.message);
    if (e instanceof SyntaxError) return error(400, "Pedido inválido.");
    console.error(e);
    return error(500, "Error del servidor. Probá de nuevo en un momento.");
  }
}
