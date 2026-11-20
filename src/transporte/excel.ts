// Exportación a Excel de Transporte (misma planilla que la v1): resumen, por mes y viajes.
import { encabezado, nuevoLibro } from "../comun/excel";
import { nombreMes } from "../comun/fechas";
import { paraExcel as n } from "../comun/numeros";
import { resumenViajes } from "./calculo";
import type { Viaje } from "./tipos";

const PESOS = '"$" #,##0.00';

export async function excelViajes(viajes: Viaje[], titulo: string) {
  const libro = await nuevoLibro();
  const total = resumenViajes(viajes);
  const r = libro.addWorksheet("Resumen");
  r.columns = [
    { header: titulo, key: "k", width: 26 },
    { header: "", key: "v", width: 20 },
  ];
  encabezado(r);
  const filas: [string, number | null, string?][] = [
    ["Viajes", total.viajes],
    ["Km", total.km],
    ["Facturación (vueltas completas, + IVA si se tildó)", total.facturacion, PESOS],
    ["Gastos", total.gastos, PESOS],
    ["Ganancia", total.ganancia, PESOS],
    ["Ganancia por km", total.gananciaKm, PESOS],
    ["Ganancia sobre facturación (%)", total.gananciaPct, "0.0"],
  ];
  for (const [k, v, f] of filas) {
    const fila = r.addRow({ k, v });
    if (f) fila.getCell(2).numFmt = f;
  }

  const m = libro.addWorksheet("Por mes");
  m.columns = [
    { header: "Mes", key: "mes", width: 16 },
    { header: "Viajes", key: "viajes", width: 8 },
    { header: "Km", key: "km", width: 10 },
    { header: "Facturación", key: "fact", width: 16 },
    { header: "Gastos", key: "gastos", width: 16 },
    { header: "Ganancia", key: "gan", width: 16 },
    { header: "Ganancia por km", key: "gkm", width: 16 },
  ];
  encabezado(m);
  const porMes = new Map<string, Viaje[]>();
  for (const v of viajes) {
    const k = v.input.fecha.slice(0, 7);
    porMes.set(k, [...(porMes.get(k) ?? []), v]);
  }
  for (const [mes, vs] of [...porMes].sort(([a], [b]) => a.localeCompare(b))) {
    const s = resumenViajes(vs);
    const fila = m.addRow({ mes: nombreMes(mes), viajes: s.viajes, km: s.km, fact: s.facturacion, gastos: s.gastos, gan: s.ganancia, gkm: s.gananciaKm });
    for (const c of [4, 5, 6, 7]) fila.getCell(c).numFmt = PESOS;
  }

  const d = libro.addWorksheet("Viajes");
  d.columns = [
    { header: "N°", key: "numero", width: 6 },
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Chofer", key: "chofer", width: 16 },
    { header: "Unidad", key: "camion", width: 12 },
    { header: "Origen", key: "origen", width: 16 },
    { header: "Destino", key: "destino", width: 16 },
    { header: "Flete ida", key: "ida", width: 14 },
    { header: "Flete vuelta", key: "vuelta", width: 14 },
    { header: "Vuelta completa", key: "total", width: 16 },
    { header: "IVA sumado", key: "iva", width: 13 },
    { header: "Cobrado", key: "cobrado", width: 15 },
    { header: "Km", key: "km", width: 9 },
    { header: "Gasto camión", key: "camionG", width: 14 },
    { header: "Peaje", key: "peaje", width: 12 },
    { header: "Chofer $", key: "choferG", width: 14 },
    { header: "Otros", key: "otros", width: 12 },
    { header: "Gastos", key: "gastos", width: 14 },
    { header: "Ganancia", key: "gan", width: 14 },
    { header: "Ganancia por km", key: "gkm", width: 14 },
    { header: "Gasoil $/L", key: "gasoil", width: 11 },
    { header: "Consumo L/100", key: "cons", width: 12 },
    { header: "Desgaste", key: "fac", width: 9 },
    { header: "% chofer", key: "cpct", width: 9 },
    { header: "Observaciones", key: "obs", width: 30 },
  ];
  encabezado(d);
  for (const v of [...viajes].sort((a, b) => a.input.fecha.localeCompare(b.input.fecha))) {
    const r = v.resultado;
    const e = v.input;
    const c = v.config;
    const fila = d.addRow({
      numero: v.numero,
      fecha: e.fecha,
      chofer: e.chofer,
      camion: e.camion,
      origen: e.origen,
      destino: e.destino,
      ida: n(e.fleteIda),
      vuelta: n(e.fleteVuelta),
      total: n(r.vuelta),
      iva: n(r.iva ?? "0"),
      cobrado: n(r.cobrado ?? r.vuelta),
      km: n(r.km),
      camionG: n(r.gastoCamion),
      peaje: n(r.peaje),
      choferG: n(r.chofer),
      otros: n(r.otros),
      gastos: n(r.gastos),
      gan: n(r.ganancia),
      gkm: n(r.gananciaKm),
      gasoil: n(c.precioGasoil),
      cons: n(c.consumoL100),
      fac: n(c.factorDesgaste),
      cpct: n(c.choferPct),
      obs: e.observaciones,
    });
    for (const col of [7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20]) fila.getCell(col).numFmt = PESOS;
  }
  return libro.xlsx.writeBuffer();
}
