// Lectura y guardado de Lavadero en la base compartida.
//
// Colecciones (mismos nombres que la v1):
//   config/v1, config/v2…    versiones de la configuración (nunca se pisan: cada cambio es una versión nueva)
//   partidas/p1, p2…         partidas (al eliminar se marcan con eliminada: true, no se borran)
//   contadores/partidas      último número usado (v2)
//   candados/…               candados de guardado (v2, ver comun/guardar.ts)
import { db, ErrorApp, leerColeccion, quienSoy } from "../comun/claude";
import { ahora } from "../comun/fechas";
import { conCandado, crearConNumero, guardarSinPisar } from "../comun/guardar";
import { calcularPartida, FORMULAS } from "./calculo";
import { CONFIG_INICIAL } from "./config-inicial";
import type { ConfigLavadero, EntradaPartida, Partida, VersionConfig } from "./tipos";
import { limpiarConfig, limpiarPartida, validarConfig, validarPartida } from "./validar";

export interface Filtros {
  productor?: string;
  desde?: string;
  hasta?: string;
  anio?: string;
  mes?: string;
}

const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

async function versionesGuardadas(): Promise<VersionConfig[]> {
  return (await leerColeccion<VersionConfig>("config")).sort((a, b) => b.version - a.version);
}

/** La configuración vigente (la crea con los valores iniciales si no hay ninguna). */
export async function configActual(): Promise<VersionConfig> {
  const vs = await versionesGuardadas();
  if (vs.length) return vs[0];
  const v1: VersionConfig = { version: 1, creado: ahora(), nota: "Configuración inicial", config: copia(CONFIG_INICIAL), quien: await quienSoy() };
  await (await db()).doc("config/v1").set(v1 as unknown as Record<string, unknown>);
  return v1;
}

/** Guarda una configuración nueva como versión siguiente. Si no cambió nada, no guarda. */
export async function guardarConfig(form: ConfigLavadero, nota: string, versionAlAbrir?: number): Promise<VersionConfig> {
  return conCandado("config", async () => {
    const actual = await configActual();
    if (versionAlAbrir !== undefined && actual.version !== versionAlAbrir)
      throw new ErrorApp(
        `Otra persona guardó la versión ${actual.version} de la configuración mientras editabas. Tocá "Descartar cambios" para ver la nueva y repetí tu cambio.`,
      );
    const nueva = limpiarConfig(form, actual.config);
    const errores = validarConfig(nueva);
    if (Object.keys(errores).length) throw new ErrorApp("Configuración inválida", errores);
    if (JSON.stringify(nueva) === JSON.stringify(actual.config)) return actual;
    const v: VersionConfig = { version: actual.version + 1, creado: ahora(), nota: nota.slice(0, 300), config: nueva, quien: await quienSoy() };
    await (await db()).doc(`config/v${v.version}`).set(v as unknown as Record<string, unknown>);
    return v;
  });
}

/** Todas las versiones, con cuántas partidas se calcularon con cada una. */
export async function versiones() {
  const [vs, ps] = await Promise.all([versionesGuardadas(), partidasActivas()]);
  return vs.map((v) => ({ ...v, partidas: ps.filter((p) => p.configVersion === v.version).length }));
}

export async function version(n: number): Promise<VersionConfig> {
  const v = (await (await db()).doc(`config/v${n}`).get()).data() as VersionConfig | undefined;
  if (!v) throw new ErrorApp("Esa versión de la configuración no existe.");
  return v;
}

async function partidasActivas(): Promise<Partida[]> {
  return (await leerColeccion<Partida>("partidas")).filter((p) => !p.eliminada);
}

/** Si el productor ya existe con otras mayúsculas, usa el nombre como ya está escrito. */
function nombreExistente(nombre: string, ps: Partida[]) {
  return ps.find((p) => p.productor.toLowerCase() === nombre.toLowerCase())?.productor ?? nombre;
}

/** Número de productor: su posición en la lista alfabética (igual que la v1). */
function numeroProductor(nombre: string, ps: Partida[]) {
  const nombres = [...new Set(ps.map((p) => p.productor))].sort();
  const i = nombres.findIndex((n) => n.toLowerCase() === nombre.toLowerCase());
  return i >= 0 ? i + 1 : nombres.length + 1;
}

export function filtrar(ps: Partida[], f: Filtros): Partida[] {
  return ps
    .filter(
      (p) =>
        (!f.productor || p.productor.toLowerCase().includes(f.productor.toLowerCase())) &&
        (!f.desde || p.fecha >= f.desde) &&
        (!f.hasta || p.fecha <= f.hasta) &&
        (!f.anio || p.fecha.slice(0, 4) === f.anio) &&
        (!f.mes || p.fecha.slice(5, 7) === f.mes.padStart(2, "0")),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
}

export async function productores() {
  const cuenta = new Map<string, number>();
  for (const p of await partidasActivas()) cuenta.set(p.productor, (cuenta.get(p.productor) ?? 0) + 1);
  return [...cuenta].sort(([a], [b]) => a.localeCompare(b)).map(([nombre, partidas], i) => ({ id: i + 1, nombre, partidas }));
}

export const partidas = async (f: Filtros = {}) => filtrar(await partidasActivas(), f);

export async function partida(id: number): Promise<Partida> {
  const p = (await (await db()).doc(`partidas/p${id}`).get()).data() as Partida | undefined;
  if (!p || p.eliminada) throw new ErrorApp("La partida no existe");
  return { ...p, auditoria: p.auditoria ?? [] };
}

function revisar(e: EntradaPartida) {
  const errores = validarPartida(e);
  if (Object.keys(errores).length) throw new ErrorApp("Datos inválidos", errores);
}

export async function crearPartida(entrada: EntradaPartida): Promise<Partida> {
  const e = limpiarPartida(entrada);
  revisar(e);
  const [cfg, existentes, quien] = await Promise.all([configActual(), partidasActivas(), quienSoy()]);
  e.productor = nombreExistente(e.productor, existentes);
  return crearConNumero<Partida & Record<string, unknown>>("partidas", "p", (id) => {
    const cuando = ahora();
    return {
      id,
      numero: String(id).padStart(4, "0"),
      productorId: numeroProductor(e.productor, existentes),
      productor: e.productor,
      fecha: e.fecha,
      input: e,
      configVersionId: cfg.version,
      configVersion: cfg.version,
      config: cfg.config,
      formulas: FORMULAS,
      resultado: calcularPartida(e, cfg.config),
      creado: cuando,
      actualizado: cuando,
      eliminada: false,
      auditoria: [{ accion: "crear", detalle: { configVersion: cfg.version }, fecha: cuando, quien }],
      rev: 0,
    };
  });
}

/** Corrige una partida. Se recalcula con la configuración con la que se creó. */
export async function actualizarPartida(id: number, entrada: EntradaPartida, revAlAbrir: number | undefined) {
  const e = limpiarPartida(entrada);
  revisar(e);
  const [otras, quien] = await Promise.all([partidasActivas(), quienSoy()]);
  e.productor = nombreExistente(e.productor, otras.filter((p) => p.id !== id));
  return guardarSinPisar<Partida>("partidas", `p${id}`, revAlAbrir, (p) => {
    const cuando = ahora();
    return {
      ...p,
      input: e,
      productor: e.productor,
      productorId: numeroProductor(e.productor, otras),
      fecha: e.fecha,
      resultado: calcularPartida(e, p.config),
      actualizado: cuando,
      auditoria: [...(p.auditoria ?? []), { accion: "modificar", detalle: { antes: p.input, despues: e }, fecha: cuando, quien }],
    };
  }, "La partida no existe: puede que otra persona la haya eliminado.");
}

/** Marca la partida como eliminada (queda guardada, no se ve más). */
export async function eliminarPartida(id: number, revAlAbrir: number | undefined) {
  const quien = await quienSoy();
  await guardarSinPisar<Partida>("partidas", `p${id}`, revAlAbrir, (p) => {
    const cuando = ahora();
    return {
      ...p,
      eliminada: true,
      actualizado: cuando,
      auditoria: [...(p.auditoria ?? []), { accion: "eliminar", detalle: {}, fecha: cuando, quien }],
    };
  });
}
