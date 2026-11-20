// Lectura y guardado de Transporte en la base compartida.
//
// Colecciones (mismos nombres que la v1):
//   tconfig/v1, v2…      versiones de la configuración
//   tviajes/v1, v2…      viajes (al eliminar se marcan con eliminado: true)
//   contadores/tviajes   último número usado (v2)
import { db, ErrorApp, leerColeccion, quienSoy } from "../comun/claude";
import { ahora } from "../comun/fechas";
import { conCandado, crearConNumero, guardarSinPisar } from "../comun/guardar";
import { calcularViaje, CONFIG_INICIAL_TRANSPORTE } from "./calculo";
import type { ConfigTransporte, EntradaViaje, VersionConfigTransporte, Viaje } from "./tipos";
import { limpiarConfigTransporte, limpiarViaje, validarConfigTransporte, validarViaje } from "./validar";

const revisar = (errores: Record<string, string>) => {
  if (Object.keys(errores).length) throw new ErrorApp("Revisá los campos marcados.", errores);
};

export async function configActual(): Promise<VersionConfigTransporte> {
  const vs = await leerColeccion<VersionConfigTransporte>("tconfig");
  if (vs.length) return vs.sort((a, b) => b.version - a.version)[0];
  const v1: VersionConfigTransporte = {
    version: 1, creado: ahora(), nota: "Configuración inicial", config: { ...CONFIG_INICIAL_TRANSPORTE }, quien: await quienSoy(),
  };
  await (await db()).doc("tconfig/v1").set(v1 as unknown as Record<string, unknown>);
  return v1;
}

export async function guardarConfig(form: ConfigTransporte, nota = "", versionAlAbrir?: number): Promise<VersionConfigTransporte> {
  const c = limpiarConfigTransporte(form);
  revisar(validarConfigTransporte(c));
  return conCandado("tconfig", async () => {
    const actual = await configActual();
    if (versionAlAbrir !== undefined && actual.version !== versionAlAbrir)
      throw new ErrorApp(
        `Otra persona guardó la versión ${actual.version} de la configuración mientras editabas. Recargá la pantalla para verla y repetí tu cambio.`,
      );
    if (JSON.stringify(c) === JSON.stringify(limpiarConfigTransporte(actual.config))) return actual;
    const v: VersionConfigTransporte = { version: actual.version + 1, creado: ahora(), nota: nota.slice(0, 300), config: c, quien: await quienSoy() };
    await (await db()).doc(`tconfig/v${v.version}`).set(v as unknown as Record<string, unknown>);
    return v;
  });
}

export async function viajes(): Promise<Viaje[]> {
  return (await leerColeccion<Viaje>("tviajes"))
    .filter((v) => !v.eliminado)
    .sort((a, b) => b.input.fecha.localeCompare(a.input.fecha) || b.id - a.id);
}

export async function viaje(id: number): Promise<Viaje | null> {
  const v = (await (await db()).doc(`tviajes/v${id}`).get()).data() as Viaje | undefined;
  return v && !v.eliminado ? v : null;
}

export async function crearViaje(entrada: EntradaViaje): Promise<Viaje> {
  const e = limpiarViaje(entrada);
  revisar(validarViaje(e));
  const [cfg, quien] = await Promise.all([configActual(), quienSoy()]);
  return crearConNumero<Viaje & Record<string, unknown>>("tviajes", "v", (id) => {
    const cuando = ahora();
    return {
      id, numero: id, creado: cuando, actualizado: cuando,
      configVersion: cfg.version, config: { ...cfg.config },
      input: e, resultado: calcularViaje(e, cfg.config), eliminado: false,
      rev: 0, auditoria: [{ accion: "crear", fecha: cuando, quien }],
    };
  });
}

export async function actualizarViaje(id: number, entrada: EntradaViaje, revAlAbrir: number | undefined) {
  const e = limpiarViaje(entrada);
  revisar(validarViaje(e));
  const quien = await quienSoy();
  return guardarSinPisar<Viaje>("tviajes", `v${id}`, revAlAbrir, (v) => {
    const cuando = ahora();
    return {
      ...v, input: e, resultado: calcularViaje(e, v.config), actualizado: cuando,
      auditoria: [...(v.auditoria ?? []), { accion: "modificar", fecha: cuando, quien }],
    };
  }, "El viaje no existe: puede que otra persona lo haya eliminado.");
}

export async function eliminarViaje(id: number, revAlAbrir: number | undefined) {
  const quien = await quienSoy();
  await guardarSinPisar<Viaje>("tviajes", `v${id}`, revAlAbrir, (v) => {
    const cuando = ahora();
    return { ...v, eliminado: true, actualizado: cuando, auditoria: [...(v.auditoria ?? []), { accion: "eliminar", fecha: cuando, quien }] };
  });
}
