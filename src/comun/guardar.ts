// Guardado seguro en la base compartida, para cuando varias personas usan la app a la vez.
//
// La base de claude.ai no tiene transacciones: si dos personas leen y escriben lo mismo
// al mismo tiempo, gana la última y la otra se pierde sin aviso. En la v1 eso podía
// pasar al crear (dos partidas con el mismo número, una pisaba a la otra) y al editar.
//
// La solución usa los "candados" de la base (acquire): un candado es un documento que
// una sola persona puede tener a la vez durante unos segundos. Mientras alguien lo
// tiene, el otro espera un momento y reintenta.
//   - Crear: candado sobre el contador de la colección → número siguiente garantizado.
//   - Editar o eliminar: candado sobre ese documento + comprobación de que nadie lo
//     cambió desde que se abrió el formulario.
import { db, ErrorApp, type RefDocumento } from "./claude";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DURACION_MS = 4000;

/**
 * Toma el candado `nombre` y corre `trabajo` mientras lo tiene.
 *
 * - Cada llamada usa su propio "dueño" (holder): la base deja que el mismo dueño renueve
 *   su candado, así que si dos guardados de la misma pestaña compartieran dueño, los dos
 *   entrarían a la vez (pasó en las pruebas: números repetidos).
 * - El candado dura 4 segundos. La base no tiene "soltar": al terminar se renueva por el
 *   mínimo (1 segundo) para que el siguiente espere poco. `renovar` lo extiende si el
 *   trabajo tarda. Si alguien espera más de ~15 segundos, se le avisa que pruebe de nuevo.
 */
export async function conCandado<T>(nombre: string, trabajo: (renovar: () => Promise<void>) => Promise<T>): Promise<T> {
  const candado = (await db()).doc(`candados/${nombre}`);
  const dueno = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const renovar = async () => {
    const r = await candado.acquire({ holder: dueno, ttlMs: DURACION_MS });
    if (!r.acquired) throw new ErrorApp("Se cortó la conexión mientras se guardaba. Revisá si quedó guardado y probá de nuevo.");
  };
  for (let intento = 0; intento < 30; intento++) {
    const r = await candado.acquire({ holder: dueno, ttlMs: DURACION_MS });
    if (r.acquired)
      try {
        return await trabajo(renovar);
      } finally {
        // "Soltar": no existe, pero renovarlo por el mínimo (1 s) hace que venza enseguida.
        candado.acquire({ holder: dueno, ttlMs: 1000 }).catch(() => {});
      }
    await esperar(300 + Math.random() * 400);
  }
  throw new ErrorApp("Otra persona está guardando en este momento. Probá de nuevo en unos segundos.");
}

/**
 * Crea un documento con el número siguiente de la colección (1, 2, 3…), sin repetir
 * aunque dos personas guarden a la vez. El documento se llama `${prefijo}${numero}`
 * (p12, v7), igual que en la v1, así los datos viejos y nuevos conviven.
 */
export async function crearConNumero<T extends Record<string, unknown>>(
  coleccion: string,
  prefijo: string,
  construir: (numero: number) => T,
): Promise<T> {
  const base = await db();
  return conCandado(coleccion, async (renovar) => {
    const contador = base.doc(`contadores/${coleccion}`);
    const leido = (await contador.get()).data() as { ultimo?: number } | undefined;
    let ultimo = leido?.ultimo;
    if (typeof ultimo !== "number") {
      // Primera vez (o datos mudados desde la v1): se cuenta lo que ya hay.
      const todos = await base.collection(coleccion).get();
      ultimo = todos.docs.reduce((m, d) => Math.max(m, Number((d.data() as { id?: number })?.id) || 0), 0);
    }
    await renovar();
    let numero = ultimo + 1;
    // Por las dudas (por ejemplo, datos cargados a mano): nunca pisar uno existente.
    while ((await base.doc(`${coleccion}/${prefijo}${numero}`).get()).exists) numero++;
    const doc = construir(numero);
    await base.doc(`${coleccion}/${prefijo}${numero}`).set(doc);
    await contador.set({ ultimo: numero });
    return doc;
  });
}

/**
 * Reescribe un documento solo si nadie lo cambió desde que se abrió.
 * Cada documento lleva un contador `rev` que sube en cada cambio (los de la v1 no
 * lo tienen: cuentan como 0). `revAlAbrir` es el que tenía cuando se cargó el
 * formulario. `cambiar` recibe el documento actual y devuelve el nuevo.
 */
export async function guardarSinPisar<T extends { rev?: number }>(
  coleccion: string,
  docId: string,
  revAlAbrir: number | undefined,
  cambiar: (actual: T) => T,
  noExiste = "Ya no existe: puede que otra persona lo haya eliminado.",
): Promise<T> {
  const ref: RefDocumento = (await db()).doc(`${coleccion}/${docId}`);
  return conCandado(`${coleccion}-${docId}`, async () => {
    const actual = (await ref.get()).data() as (T & { eliminada?: boolean; eliminado?: boolean }) | undefined;
    if (!actual || actual.eliminada || actual.eliminado) throw new ErrorApp(noExiste);
    const rev = actual.rev ?? 0;
    if (revAlAbrir !== undefined && rev !== revAlAbrir)
      throw new ErrorApp(
        "Otra persona cambió esto mientras lo tenías abierto. Volvé a abrirlo para ver la versión nueva y repetí tu cambio.",
      );
    const nuevo = { ...cambiar(actual), rev: rev + 1 };
    await ref.set(nuevo as Record<string, unknown>);
    return nuevo;
  });
}
