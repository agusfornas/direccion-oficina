// Validaciones y limpieza de Transporte (igual que la v1).
// Orden siempre: primero limpiar, después validar y calcular sobre lo limpio (ver comun/numeros.ts).
import { leerNumero, normalizarNumero, numeroOCero } from "../comun/numeros";
import type { ConfigTransporte, EntradaViaje } from "./tipos";

export type Errores = Record<string, string>;

export function validarConfigTransporte(c: ConfigTransporte): Errores {
  const t: Errores = {};
  const positivo = (campo: keyof ConfigTransporte, msg: string, siVacioOk = false) => {
    if (siVacioOk && (c[campo] ?? "") === "") return;
    const n = leerNumero(c[campo]);
    if (n === null || n.lte(0)) t[campo] = msg;
  };
  positivo("precioGasoil", "Ingresá el precio del gasoil.", true);
  positivo("consumoL100", "Ingresá el consumo del camión.", true);
  if (!t.consumoL100 && leerNumero(c.consumoL100)?.gt(150))
    t.consumoL100 = "Revisá el consumo: un camión gasta entre 20 y 60 litros cada 100 km.";
  positivo("factorDesgaste", "Ingresá un factor mayor a 0 (por ejemplo 1,5).");
  const chofer = leerNumero(c.choferPct);
  if (chofer === null || chofer.lt(0) || chofer.gte(100)) t.choferPct = "Ingresá un porcentaje entre 0 y 99.";
  if ((c.ivaPct ?? "") !== "") {
    const iva = leerNumero(c.ivaPct);
    if (iva === null || iva.lt(0) || iva.gte(100)) t.ivaPct = "Ingresá un porcentaje entre 0 y 99.";
  }
  return t;
}

export function validarViaje(e: EntradaViaje): Errores {
  const t: Errores = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha)) t.fecha = "Fecha inválida.";
  if (!e.destino.trim()) t.destino = "Ingresá el destino.";
  const monto = (campo: keyof EntradaViaje, msg: string, obligatorio = false) => {
    const v = String(e[campo] ?? "");
    if (v === "") {
      if (obligatorio) t[campo] = msg;
      return;
    }
    const n = leerNumero(v);
    if (n === null || n.lt(0)) t[campo] = msg;
  };
  monto("fleteIda", "Ingresá el flete de ida.", true);
  monto("fleteVuelta", "Ingresá el flete de vuelta (0 si volvió vacío).", true);
  monto("km", "Ingresá los km totales.", true);
  if (!t.km && !numeroOCero(e.km).gt(0)) t.km = "Los km deben ser mayores a 0.";
  monto("peaje", "Ingresá el peaje (0 si no hubo).");
  monto("otros", "Monto inválido.");
  return t;
}

const limpio = (v: string) => (v === "" ? "" : normalizarNumero(v));

export function limpiarViaje(e: EntradaViaje): EntradaViaje {
  return {
    ...e,
    chofer: e.chofer.trim(),
    camion: e.camion.trim(),
    origen: e.origen.trim(),
    destino: e.destino.trim(),
    fleteIda: limpio(e.fleteIda),
    fleteVuelta: limpio(e.fleteVuelta),
    km: limpio(e.km),
    peaje: limpio(e.peaje),
    otros: limpio(e.otros),
  };
}

export function limpiarConfigTransporte(c: ConfigTransporte): ConfigTransporte {
  return {
    precioGasoil: limpio(c.precioGasoil),
    consumoL100: limpio(c.consumoL100),
    factorDesgaste: limpio(c.factorDesgaste),
    choferPct: limpio(c.choferPct),
    ivaPct: limpio(c.ivaPct ?? "21"),
  };
}
