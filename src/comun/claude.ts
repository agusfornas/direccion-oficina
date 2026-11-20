// Conexión con claude.ai: base de datos compartida, quién está usando la app y descargas.
// La app funciona solo abierta como artefacto de claude.ai, con la cuenta iniciada.
//
// Referencia oficial de estas funciones: la guía "artifact-capabilities" de Claude
// (cualquier Claude la puede cargar). Las capacidades que usa esta app se declaran
// al publicar: ver PUBLICAR.md.

export class ErrorApp extends Error {
  /** Errores por campo, para marcar el formulario: { campo: "mensaje" }. */
  errores: Record<string, string>;
  constructor(mensaje: string, errores: Record<string, string> = {}) {
    super(mensaje);
    this.errores = errores;
  }
}

// ---- Tipos mínimos de lo que usamos de window.claude ----

export interface Documento {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
export interface Consulta {
  get(): Promise<{ docs: Documento[] }>;
  where(campo: string, op: string, valor: unknown): Consulta;
  limit(n: number): Consulta;
}
export interface RefDocumento {
  id: string;
  get(): Promise<Documento>;
  set(datos: Record<string, unknown>): Promise<void>;
  update(datos: Record<string, unknown>): Promise<void>;
  acquire(op: { holder: string; ttlMs?: number }): Promise<{ acquired: boolean; expiresAt?: string }>;
}
export interface Coleccion extends Consulta {
  doc(id?: string): RefDocumento;
}
export interface BaseDatos {
  doc(ruta: string): RefDocumento;
  collection(ruta: string): Coleccion;
}
interface Usuario {
  id(): Promise<string | null>;
  profiles(ids: string[]): Promise<Record<string, { name?: string } | undefined>>;
}
interface Descargas {
  save(op: { filename: string; data: ArrayBuffer | Uint8Array | Blob | string }): Promise<void>;
}
declare global {
  interface Window {
    claude?: { use(nombre: string): Promise<unknown> };
  }
}

async function usar<T>(nombre: string): Promise<T | null> {
  try {
    return window.claude ? ((await window.claude.use(nombre)) as T | null) : null;
  } catch {
    return null;
  }
}

// ---- Base de datos ----

let baseDatos: Promise<BaseDatos> | null = null;

/** La base de datos compartida del artefacto. */
export function db(): Promise<BaseDatos> {
  if (!baseDatos) {
    baseDatos = (async () => {
      const b = await usar<BaseDatos>("db");
      if (!b) throw new ErrorApp("No se pudo conectar con la base de datos. Abrí la página con tu cuenta de claude.ai.");
      return b;
    })();
    baseDatos.catch(() => (baseDatos = null));
  }
  return baseDatos;
}

/** Lee todos los documentos de una colección. */
export async function leerColeccion<T>(ruta: string): Promise<T[]> {
  const r = await (await db()).collection(ruta).get();
  return r.docs.map((d) => d.data() as T | undefined).filter((x): x is T => !!x);
}

// ---- Usuario ----

let usuarioId: Promise<string | null> | null = null;

/** Id de quien está usando la app (para el historial de cambios), o null si no se sabe. */
export function quienSoy(): Promise<string | null> {
  usuarioId ??= (async () => (await usar<Usuario>("user"))?.id() ?? null)().catch(() => null);
  return usuarioId;
}

/** Nombres de las personas, por id. Los que no se conocen quedan afuera. */
export async function nombres(ids: string[]): Promise<Record<string, string>> {
  const u = await usar<Usuario>("user");
  const unicos = [...new Set(ids.filter(Boolean))];
  if (!u || !unicos.length) return {};
  try {
    const p = await u.profiles(unicos.slice(0, 64));
    const r: Record<string, string> = {};
    for (const id of unicos) if (p[id]?.name) r[id] = p[id]!.name!;
    return r;
  } catch {
    return {};
  }
}

// ---- Descargas ----

/** Le ofrece un archivo a quien usa la app. Si dice que no, no pasa nada. */
export async function descargar(nombreArchivo: string, datos: ArrayBuffer | Uint8Array) {
  const d = await usar<Descargas>("downloads");
  if (!d) throw new ErrorApp("Esta vista no permite descargar archivos.");
  try {
    await d.save({ filename: nombreArchivo, data: datos });
  } catch (e) {
    if ((e as { code?: string })?.code !== "declined") throw new ErrorApp("No se pudo descargar el archivo.");
  }
}
