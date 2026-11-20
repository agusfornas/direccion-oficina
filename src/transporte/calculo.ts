// Motor de cálculo de Transporte: de un viaje (fletes, km, peajes) y la configuración
// (gasoil, consumo, desgaste, % chofer) saca gastos y ganancia.
// Traducción fiel de la v1: lo comprueban las pruebas de calculo.test.ts.
import { hoy } from "../comun/fechas";
import { Decimal, leerEscrito, leerNumero, numeroOCero, textoONulo } from "../comun/numeros";
import type { ConfigTransporte, EntradaViaje, ResultadoViaje } from "./tipos";

export const CONFIG_INICIAL_TRANSPORTE: ConfigTransporte = {
  precioGasoil: "",
  consumoL100: "",
  factorDesgaste: "1.5",
  choferPct: "15",
  ivaPct: "21",
};

export const viajeVacio = (): EntradaViaje => ({
  fecha: hoy(),
  chofer: "",
  camion: "",
  origen: "",
  destino: "",
  fleteIda: "",
  fleteVuelta: "",
  km: "",
  peaje: "",
  otros: "",
  observaciones: "",
});

/** % de IVA configurado (21 si no hay uno válido). */
export function ivaDe(c: ConfigTransporte): number {
  const n = leerNumero(c.ivaPct ?? "");
  return c.ivaPct && n !== null ? n.toNumber() : 21;
}

/** Recibe el viaje y la configuración YA LIMPIOS (limpiarViaje / limpiarConfigTransporte). */
export function calcularViaje(e: EntradaViaje, c: ConfigTransporte): ResultadoViaje {
  const vuelta = numeroOCero(e.fleteIda).plus(numeroOCero(e.fleteVuelta));
  const km = numeroOCero(e.km);
  const peaje = numeroOCero(e.peaje);
  const otros = numeroOCero(e.otros);
  const gasoil = leerNumero(c.precioGasoil);
  const consumo = leerNumero(c.consumoL100);
  const desgaste = leerNumero(c.factorDesgaste) ?? new Decimal(1);
  const choferPct = numeroOCero(c.choferPct);
  const faltantes: string[] = [];
  if (gasoil === null || gasoil.lte(0)) faltantes.push("precio del gasoil");
  if (consumo === null || consumo.lte(0)) faltantes.push("consumo del camión");

  const chofer = vuelta.times(choferPct).div(100);
  const litros = consumo ? km.div(100).times(consumo) : null;
  const litrosDesgaste = litros ? litros.times(desgaste) : null;
  const gastoCamion = litrosDesgaste && gasoil ? litrosDesgaste.times(gasoil) : null;
  const gastos = gastoCamion ? gastoCamion.plus(peaje).plus(chofer).plus(otros) : null;
  const iva = e.conIva ? vuelta.times(ivaDe(c)).div(100) : new Decimal(0);
  const cobrado = vuelta.plus(iva);
  const ganancia = gastos ? cobrado.minus(gastos) : null;
  return {
    vuelta: vuelta.toString(),
    iva: iva.toString(),
    cobrado: cobrado.toString(),
    km: km.toString(),
    litros: textoONulo(litros),
    litrosDesgaste: textoONulo(litrosDesgaste),
    gastoCamion: textoONulo(gastoCamion),
    chofer: chofer.toString(),
    peaje: peaje.toString(),
    otros: otros.toString(),
    gastos: textoONulo(gastos),
    ganancia: textoONulo(ganancia),
    gananciaPct: ganancia && cobrado.gt(0) ? ganancia.div(cobrado).times(100).toString() : null,
    gananciaKm: ganancia && km.gt(0) ? ganancia.div(km).toString() : null,
    faltantes,
  };
}

/** Consumo en L/100 km a partir de litros y km escritos por la persona (calculadora de consumo). */
export function consumoCada100(litros: string, km: string): Decimal | null {
  const l = leerEscrito(litros);
  const k = leerEscrito(km);
  return l && k && l.gt(0) && k.gt(0) ? l.div(k).times(100) : null;
}

/** Totales de una lista de viajes (para estadísticas y Excel). */
export function resumenViajes(viajes: { resultado: ResultadoViaje }[]) {
  let km = 0;
  let facturacion = 0;
  let gastos = 0;
  let ganancia = 0;
  for (const v of viajes) {
    km += Number(v.resultado.km);
    facturacion += Number(v.resultado.cobrado ?? v.resultado.vuelta);
    gastos += Number(v.resultado.gastos ?? 0);
    ganancia += Number(v.resultado.ganancia ?? 0);
  }
  return {
    viajes: viajes.length,
    km,
    facturacion,
    gastos,
    ganancia,
    gananciaKm: km > 0 ? ganancia / km : null,
    gananciaPct: facturacion > 0 ? (ganancia / facturacion) * 100 : null,
  };
}
