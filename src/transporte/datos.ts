// Lectura y guardado de Transporte (en el servidor, ver servidor/).
//
// Colecciones (mismos nombres y forma que la v1):
//   tconfig/v1, v2…      versiones de la configuración
//   tviajes/v1, v2…      viajes (al eliminar se marcan con eliminado: true)
import { ahora } from "../comun/fechas";
import { crearNumerado, crearSiNoExiste, ErrorApp, guardarSinPisar, leerColeccion, leerDocumento, quienSoy } from "../comun/servidor";
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
  try {
    return await crearSiNoExiste("tconfig", "v1", v1);
  } catch {
    // Otra persona la creó en el mismo instante: se usa esa.
    return (await leerColeccion<VersionConfigTransporte>("tconfig")).sort((a, b) => b.version - a.version)[0] ?? v1;
  }
}

export async function guardarConfig(form: ConfigTransporte, nota = "", versionAlAbrir?: number): Promise<VersionConfigTransporte> {
  const c = limpiarConfigTransporte(form);
  revisar(validarConfigTransporte(c));
  const actual = await configActual();
  const otraPersona = (n: number) =>
    new ErrorApp(`Otra persona guardó la versión ${n} de la configuración mientras editabas. Recargá la pantalla para verla y repetí tu cambio.`);
  if (versionAlAbrir !== undefined && actual.version !== versionAlAbrir) throw otraPersona(actual.version);
  if (JSON.stringify(c) === JSON.stringify(limpiarConfigTransporte(actual.config))) return actual;
  const v: VersionConfigTransporte = { version: actual.version + 1, creado: ahora(), nota: nota.slice(0, 300), config: c, quien: await quienSoy() };
  try {
    return await crearSiNoExiste("tconfig", `v${v.version}`, v);
  } catch (e) {
    if (e instanceof ErrorApp && e.estado === 409) throw otraPersona(v.version);
    throw e;
  }
}

export async function viajes(): Promise<Viaje[]> {
  return (await leerColeccion<Viaje>("tviajes"))
    .filter((v) => !v.eliminado)
    .sort((a, b) => b.input.fecha.localeCompare(a.input.fecha) || b.id - a.id);
}

export async function viaje(id: number): Promise<Viaje | null> {
  const v = await leerDocumento<Viaje>("tviajes", `v${id}`);
  return v && !v.eliminado ? v : null;
}

export async function crearViaje(entrada: EntradaViaje): Promise<Viaje> {
  const e = limpiarViaje(entrada);
  revisar(validarViaje(e));
  const [cfg, quien] = await Promise.all([configActual(), quienSoy()]);
  const cuando = ahora();
  // El servidor pone el número (id) en el momento de guardar.
  return crearNumerado<Viaje>("tviajes", "v", false, {
    id: 0, numero: 0, creado: cuando, actualizado: cuando,
    configVersion: cfg.version, config: { ...cfg.config },
    input: e, resultado: calcularViaje(e, cfg.config), eliminado: false,
    auditoria: [{ accion: "crear", fecha: cuando, quien }],
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
