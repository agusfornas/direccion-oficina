// Entrada a la app: tarjetas con el nombre de cada persona y un PIN de 4 números.
//
// Es una protección contra curiosos, no contra alguien decidido (lo eligió así el dueño).
// Para que no se pueda adivinar el PIN probando los 10.000 números: después de 5 errores
// la tarjeta se traba 15 minutos.
//
// Al acertar, el aparato recibe una "sesión" (cookie) que dura 90 días. En la base se guarda
// solo una huella de la sesión y del PIN, nunca el PIN ni la sesión tal cual.
import { ErrorAlmacen, type Base } from "./almacen";

export const INTENTOS_MAXIMOS = 5;
export const MINUTOS_TRABA = 15;
export const DIAS_SESION = 90;

export interface Persona {
  id: number;
  nombre: string;
  tienePin: boolean;
}

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const azar = (bytes: number) => hex(crypto.getRandomValues(new Uint8Array(bytes)));
const huella = async (texto: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));

export async function listarPersonas(db: Base): Promise<Persona[]> {
  const r = await db.prepare("SELECT id, nombre, pin_hash FROM personas WHERE activa = 1 ORDER BY nombre").all<{ id: number; nombre: string; pin_hash: string | null }>();
  return r.results.map((p) => ({ id: p.id, nombre: p.nombre, tienePin: !!p.pin_hash }));
}

export async function crearPersona(db: Base, nombre: string): Promise<Persona> {
  const n = nombre.trim().replace(/\s+/g, " ");
  if (!n || n.length > 40) throw new ErrorAlmacen(400, "Poné un nombre (hasta 40 letras).");
  const existe = await db.prepare("SELECT id, activa FROM personas WHERE lower(nombre) = lower(?)").bind(n).first<{ id: number; activa: number }>();
  if (existe?.activa) throw new ErrorAlmacen(409, "Ya hay una persona con ese nombre.");
  if (existe) {
    // Vuelve alguien que se había quitado: arranca sin PIN.
    await db.prepare("UPDATE personas SET activa = 1, pin_hash = NULL, sal = NULL, intentos = 0, bloqueado_hasta = 0 WHERE id = ?").bind(existe.id).run();
    return { id: existe.id, nombre: n, tienePin: false };
  }
  const r = await db.prepare("INSERT INTO personas (nombre) VALUES (?) RETURNING id").bind(n).first<{ id: number }>();
  return { id: r!.id, nombre: n, tienePin: false };
}

export async function quitarPersona(db: Base, id: number) {
  await db.batch([
    db.prepare("UPDATE personas SET activa = 0 WHERE id = ?").bind(id),
    db.prepare("DELETE FROM sesiones WHERE persona_id = ?").bind(id),
  ]);
}

/** Para quien se olvidó el PIN: la próxima vez que toque su tarjeta, elige uno nuevo. */
export async function borrarPin(db: Base, id: number) {
  await db.batch([
    db.prepare("UPDATE personas SET pin_hash = NULL, sal = NULL, intentos = 0, bloqueado_hasta = 0 WHERE id = ?").bind(id),
    db.prepare("DELETE FROM sesiones WHERE persona_id = ?").bind(id),
  ]);
}

/**
 * Entra con el PIN (o lo elige, si la persona todavía no tiene: `crear`).
 * Devuelve la sesión para guardar en la cookie.
 */
export async function entrar(db: Base, id: number, pin: string, crear: boolean, ahora = Date.now()): Promise<{ token: string; nombre: string }> {
  if (!/^\d{4}$/.test(pin)) throw new ErrorAlmacen(400, "El PIN son 4 números.");
  const p = await db
    .prepare("SELECT id, nombre, pin_hash, sal, intentos, bloqueado_hasta FROM personas WHERE id = ? AND activa = 1")
    .bind(id)
    .first<{ id: number; nombre: string; pin_hash: string | null; sal: string | null; intentos: number; bloqueado_hasta: number }>();
  if (!p) throw new ErrorAlmacen(404, "Esa persona ya no está en la lista.");

  if (crear) {
    const sal = azar(16);
    const r = await db
      .prepare("UPDATE personas SET pin_hash = ?, sal = ?, intentos = 0, bloqueado_hasta = 0 WHERE id = ? AND pin_hash IS NULL")
      .bind(await huella(`${sal}:${pin}`), sal, id)
      .run();
    if (!r.meta.changes) throw new ErrorAlmacen(409, "Esta persona ya tiene PIN. Ponelo para entrar.");
  } else {
    if (!p.pin_hash || !p.sal) throw new ErrorAlmacen(409, "Todavía no elegiste tu PIN.");
    if (p.bloqueado_hasta > ahora) {
      const minutos = Math.ceil((p.bloqueado_hasta - ahora) / 60000);
      throw new ErrorAlmacen(423, `Demasiados intentos. Probá de nuevo en ${minutos} minuto${minutos === 1 ? "" : "s"}.`);
    }
    if ((await huella(`${p.sal}:${pin}`)) !== p.pin_hash) {
      const intentos = p.intentos + 1;
      if (intentos >= INTENTOS_MAXIMOS) {
        await db.prepare("UPDATE personas SET intentos = 0, bloqueado_hasta = ? WHERE id = ?").bind(ahora + MINUTOS_TRABA * 60000, id).run();
        throw new ErrorAlmacen(423, `PIN incorrecto. La tarjeta queda trabada ${MINUTOS_TRABA} minutos.`);
      }
      await db.prepare("UPDATE personas SET intentos = ? WHERE id = ?").bind(intentos, id).run();
      const quedan = INTENTOS_MAXIMOS - intentos;
      throw new ErrorAlmacen(401, `PIN incorrecto. Te queda${quedan === 1 ? "" : "n"} ${quedan} intento${quedan === 1 ? "" : "s"}.`);
    }
    await db.prepare("UPDATE personas SET intentos = 0 WHERE id = ?").bind(id).run();
  }

  const token = azar(32);
  await db.batch([
    db.prepare("DELETE FROM sesiones WHERE vence < ?").bind(ahora),
    db.prepare("INSERT INTO sesiones (token_hash, persona_id, vence) VALUES (?, ?, ?)").bind(await huella(token), id, ahora + DIAS_SESION * 86400000),
  ]);
  return { token, nombre: p.nombre };
}

/** Quién es el dueño de esta sesión, o null si no vale (vencida, borrada o persona quitada). */
export async function sesionDe(db: Base, token: string | null, ahora = Date.now()): Promise<{ id: number; nombre: string } | null> {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return db
    .prepare("SELECT p.id, p.nombre FROM sesiones s JOIN personas p ON p.id = s.persona_id WHERE s.token_hash = ? AND s.vence > ? AND p.activa = 1")
    .bind(await huella(token), ahora)
    .first<{ id: number; nombre: string }>();
}

export async function salir(db: Base, token: string | null) {
  if (token) await db.prepare("DELETE FROM sesiones WHERE token_hash = ?").bind(await huella(token)).run();
}
