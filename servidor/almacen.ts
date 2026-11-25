// Almacén de documentos sobre la base de datos (Cloudflare D1, que es SQLite).
//
// Todo lo que tiene que ser exacto se resuelve acá, en una sola operación de la base:
//   - Numerar: el número siguiente se calcula y se usa en la misma transacción.
//     Dos personas guardando a la vez reciben números distintos, siempre.
//   - Corregir: se guarda solo si nadie lo cambió desde que se abrió (columna `rev`).
//     Si alguien lo cambió, se rechaza con un aviso en vez de pisarlo.

/** Lo mínimo que usamos de la base. Cloudflare D1 lo cumple; en las pruebas se usa SQLite de Node. */
export interface Base {
  prepare(sql: string): Sentencia;
  batch(sentencias: Sentencia[]): Promise<unknown[]>;
  exec(sql: string): Promise<unknown>;
}
export interface Sentencia {
  bind(...valores: unknown[]): Sentencia;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}

export const COLECCIONES = ["partidas", "config", "tviajes", "tconfig"] as const;
export type Coleccion = (typeof COLECCIONES)[number];
type Doc = Record<string, unknown>;

export class ErrorAlmacen extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS documentos (coleccion TEXT NOT NULL, id TEXT NOT NULL, datos TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (coleccion, id));
CREATE TABLE IF NOT EXISTS contadores (coleccion TEXT PRIMARY KEY, ultimo INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS personas (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, pin_hash TEXT, sal TEXT, intentos INTEGER NOT NULL DEFAULT 0, bloqueado_hasta INTEGER NOT NULL DEFAULT 0, activa INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sesiones (token_hash TEXT PRIMARY KEY, persona_id INTEGER NOT NULL, vence INTEGER NOT NULL);
`;
const preparadas = new WeakSet<object>();
/** Crea las tablas si no existen (una vez por arranque del servidor). */
export async function prepararBase(db: Base) {
  if (preparadas.has(db)) return;
  for (const sql of ESQUEMA.split(";").map((s) => s.trim()).filter(Boolean)) await db.exec(sql.replace(/\s+/g, " "));
  preparadas.add(db);
}

const conRev = (fila: { datos: string; rev: number }): Doc => ({ ...JSON.parse(fila.datos), rev: fila.rev });
const sinRev = (d: Doc) => {
  const { rev: _rev, ...resto } = d;
  return JSON.stringify(resto);
};

/** Anota quién hizo el último cambio (el servidor lo sabe por la sesión; no se confía en la página). */
function firmar(d: Doc, email: string): Doc {
  const a = d.auditoria;
  if (Array.isArray(a) && a.length) a[a.length - 1] = { ...(a[a.length - 1] as Doc), quien: email };
  if ("quien" in d) d.quien = email;
  return d;
}

export async function listar(db: Base, col: Coleccion): Promise<Doc[]> {
  const r = await db.prepare("SELECT datos, rev FROM documentos WHERE coleccion = ? ORDER BY id").bind(col).all<{ datos: string; rev: number }>();
  return r.results.map(conRev);
}

export async function leer(db: Base, col: Coleccion, id: string): Promise<Doc | null> {
  const f = await db.prepare("SELECT datos, rev FROM documentos WHERE coleccion = ? AND id = ?").bind(col, id).first<{ datos: string; rev: number }>();
  return f ? conRev(f) : null;
}

/**
 * Crea un documento con el número siguiente de la colección. El servidor pone `id` (número)
 * y `numero` ("0012" si numeroComoTexto, si no 12) y lo guarda como `${prefijo}${numero}`.
 */
export async function crearNumerado(db: Base, col: Coleccion, prefijo: string, numeroComoTexto: boolean, doc: Doc, email: string): Promise<Doc> {
  const maximo = "COALESCE((SELECT MAX(CAST(json_extract(datos, '$.id') AS INTEGER)) FROM documentos WHERE coleccion = ?1), 0)";
  const [r] = (await db.batch([
    db
      .prepare(
        `INSERT INTO contadores (coleccion, ultimo) VALUES (?1, ${maximo} + 1)
         ON CONFLICT (coleccion) DO UPDATE SET ultimo = MAX(contadores.ultimo, ${maximo}) + 1
         RETURNING ultimo`,
      )
      .bind(col),
    db
      .prepare(
        `INSERT INTO documentos (coleccion, id, datos, rev)
         SELECT ?1, ?2 || c.ultimo,
                json_set(?3, '$.id', c.ultimo, '$.numero', CASE WHEN ?4 = 1 THEN printf('%04d', c.ultimo) ELSE c.ultimo END),
                0
         FROM contadores c WHERE c.coleccion = ?1`,
      )
      .bind(col, prefijo, sinRev(firmar(doc, email)), numeroComoTexto ? 1 : 0),
  ])) as { results: { ultimo: number }[] }[];
  const n = r.results[0].ultimo;
  return (await leer(db, col, `${prefijo}${n}`))!;
}

/** Crea un documento con un id fijo; falla si ya existe (por ejemplo, la versión 3 de la configuración). */
export async function crearSiNoExiste(db: Base, col: Coleccion, id: string, doc: Doc, email: string): Promise<Doc> {
  const r = await db
    .prepare("INSERT INTO documentos (coleccion, id, datos, rev) VALUES (?, ?, ?, 0) ON CONFLICT DO NOTHING")
    .bind(col, id, sinRev(firmar(doc, email)))
    .run();
  if (!r.meta.changes) throw new ErrorAlmacen(409, "Ya existe: otra persona lo guardó recién. Recargá la pantalla y repetí tu cambio.");
  return (await leer(db, col, id))!;
}

/** Reemplaza un documento solo si su `rev` sigue siendo `revEsperada`. */
export async function reemplazar(db: Base, col: Coleccion, id: string, doc: Doc, revEsperada: number, email: string): Promise<Doc> {
  const r = await db
    .prepare("UPDATE documentos SET datos = ?, rev = rev + 1 WHERE coleccion = ? AND id = ? AND rev = ?")
    .bind(sinRev(firmar(doc, email)), col, id, revEsperada)
    .run();
  if (!r.meta.changes) {
    const actual = await leer(db, col, id);
    if (!actual) throw new ErrorAlmacen(404, "Ya no existe: puede que otra persona lo haya eliminado.");
    throw new ErrorAlmacen(
      409,
      "Otra persona cambió esto mientras lo tenías abierto. Volvé a abrirlo para ver la versión nueva y repetí tu cambio.",
    );
  }
  return (await leer(db, col, id))!;
}
