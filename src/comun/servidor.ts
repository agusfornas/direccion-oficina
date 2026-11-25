// Conexión con el servidor (Cloudflare). Toda lectura y escritura de datos pasa por acá.
// Las direcciones del servidor están explicadas en servidor/rutas.ts.

export class ErrorApp extends Error {
  /** Errores por campo, para marcar el formulario: { campo: "mensaje" }. */
  errores: Record<string, string>;
  estado?: number;
  constructor(mensaje: string, errores: Record<string, string> = {}, estado?: number) {
    super(mensaje);
    this.errores = errores;
    this.estado = estado;
  }
}

async function api<T>(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`/api/${ruta}`, {
      method: metodo,
      credentials: "same-origin",
      headers: cuerpo ? { "content-type": "application/json" } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    // Si la sesión de Cloudflare Access venció, el pedido se corta así (no llega a la app).
    throw new ErrorApp("No se pudo conectar. Revisá internet; si hace rato que tenés la página abierta, recargala para volver a entrar.");
  }
  if (r.status === 401) throw new ErrorApp("Tu sesión venció. Recargá la página para volver a entrar.", {}, 401);
  const datos = await r.json().catch(() => null);
  if (!r.ok) throw new ErrorApp((datos as { error?: string } | null)?.error ?? "Algo salió mal en el servidor. Probá de nuevo.", {}, r.status);
  return datos as T;
}

/** Todos los documentos de una colección (partidas, config, tviajes, tconfig). */
export const leerColeccion = <T,>(coleccion: string) => api<T[]>(`c/${coleccion}`);

/** Un documento, o null si no existe. */
export async function leerDocumento<T>(coleccion: string, id: string): Promise<T | null> {
  try {
    return await api<T>(`c/${coleccion}/${id}`);
  } catch (e) {
    if (e instanceof ErrorApp && e.estado === 404) return null;
    throw e;
  }
}

/**
 * Crea un documento con el número siguiente (1, 2, 3…). El servidor pone `id` y `numero`
 * (como texto "0012" si numeroComoTexto, si no como número) y lo guarda como `${prefijo}${numero}`.
 * Dos personas guardando a la vez reciben números distintos.
 */
export const crearNumerado = <T,>(coleccion: string, prefijo: string, numeroComoTexto: boolean, documento: T) =>
  api<T>(`c/${coleccion}/nuevo`, "POST", { prefijo, numeroComoTexto, documento });

/** Crea un documento con un id fijo. Falla (409) si ya existe. */
export const crearSiNoExiste = <T,>(coleccion: string, id: string, documento: T) =>
  api<T>(`c/${coleccion}/${id}`, "PUT", { documento, soloCrear: true });

/**
 * Reescribe un documento solo si nadie lo cambió desde que se abrió.
 * Cada documento trae `rev` (sube en cada cambio). `revAlAbrir` es el que tenía cuando se
 * cargó el formulario. `cambiar` recibe el documento actual y devuelve el nuevo.
 */
export async function guardarSinPisar<T extends { rev?: number; eliminada?: boolean; eliminado?: boolean }>(
  coleccion: string,
  id: string,
  revAlAbrir: number | undefined,
  cambiar: (actual: T) => T,
  noExiste = "Ya no existe: puede que otra persona lo haya eliminado.",
): Promise<T> {
  const actual = await leerDocumento<T>(coleccion, id);
  if (!actual || actual.eliminada || actual.eliminado) throw new ErrorApp(noExiste);
  const rev = revAlAbrir ?? actual.rev ?? 0;
  if ((actual.rev ?? 0) !== rev)
    throw new ErrorApp("Otra persona cambió esto mientras lo tenías abierto. Volvé a abrirlo para ver la versión nueva y repetí tu cambio.");
  // El servidor vuelve a comprobarlo al guardar, por si alguien guarda justo en este instante.
  return api<T>(`c/${coleccion}/${id}`, "PUT", { documento: cambiar(actual), revEsperada: rev });
}

let yo: Promise<string | null> | null = null;
/** El email de quien está usando la app (según el login de Cloudflare Access). */
export function quienSoy(): Promise<string | null> {
  yo ??= api<{ email: string }>("yo")
    .then((r) => r.email)
    .catch(() => null);
  return yo;
}

/** Descarga un archivo (los Excel). */
export async function descargar(nombreArchivo: string, datos: ArrayBuffer | Uint8Array) {
  const url = URL.createObjectURL(new Blob([datos], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
