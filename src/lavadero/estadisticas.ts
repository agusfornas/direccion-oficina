// Totales y promedios de un conjunto de partidas (pantalla Estadísticas y Excel).
// Los precios promedio son ponderados por kg brutos. Traducción fiel de la v1.
import { Decimal, dividir, leerNumero, textoONulo } from "../comun/numeros";
import type { Partida, ResultadoPartida } from "./tipos";

export interface FilaEstadistica {
  fecha: string;
  productor: string;
  precioPagado: string;
  resultado: ResultadoPartida;
}

export const paraEstadistica = (p: Partida): FilaEstadistica => ({
  fecha: p.fecha,
  productor: p.productor,
  precioPagado: p.input.precioPagado,
  resultado: p.resultado,
});

export function resumen(filas: FilaEstadistica[]) {
  const cero = () => new Decimal(0);
  let tacos = cero(), kgBruto = cero(), kgTerminados = cero(), eqGeneral = cero(), eqCubitos = cero(), eqElegida = cero(), eqComun = cero();
  let solicitadoXkg = cero(), kgConSolicitado = cero(), pagadoXkg = cero(), kgConPagado = cero(), conPagado = 0;
  let margenSuma = cero(), kgConMargen = cero(), recXkg = cero(), solXkgConRec = cero(), kgConRec = cero();
  let ingresos = cero(), costos = cero(), margen = cero(), economicas = 0, costoCompra = cero(), resultadoEst = cero(), conResultado = 0;
  const productores = new Set<string>();
  const porProducto = new Map<string, { nombre: string; categoria: string; bolsas: Decimal; kg: Decimal }>();

  for (const f of filas) {
    const r = f.resultado;
    const kg = new Decimal(r.kgBruto);
    productores.add(f.productor);
    for (const p of r.productos) {
      const x = porProducto.get(p.id) ?? { nombre: p.nombre, categoria: p.categoria, bolsas: cero(), kg: cero() };
      x.nombre = p.nombre;
      x.bolsas = x.bolsas.plus(p.bolsas);
      x.kg = x.kg.plus(p.kg);
      porProducto.set(p.id, x);
    }
    tacos = tacos.plus(r.tacos);
    kgBruto = kgBruto.plus(kg);
    kgTerminados = kgTerminados.plus(r.kgTerminados);
    eqGeneral = eqGeneral.plus(r.eqGeneral);
    eqCubitos = eqCubitos.plus(r.eqCubitos);
    eqElegida = eqElegida.plus(r.eqElegida);
    eqComun = eqComun.plus(r.eqComun);
    const sol = leerNumero(r.precioSolicitado);
    if (sol) {
      solicitadoXkg = solicitadoXkg.plus(sol.times(kg));
      kgConSolicitado = kgConSolicitado.plus(kg);
    }
    const pagado = leerNumero(f.precioPagado);
    if (pagado) {
      pagadoXkg = pagadoXkg.plus(pagado.times(kg));
      kgConPagado = kgConPagado.plus(kg);
      conPagado++;
      costoCompra = costoCompra.plus(pagado.times(kg));
    }
    if (r.margenOperativo !== null) {
      margenSuma = margenSuma.plus(r.margenOperativo);
      kgConMargen = kgConMargen.plus(kg);
      ingresos = ingresos.plus(r.ingresos!);
      costos = costos.plus(r.costosOperativos!);
      margen = margen.plus(r.margenOperativo);
      economicas++;
      if (pagado) {
        resultadoEst = resultadoEst.plus(new Decimal(r.margenOperativo).minus(pagado.times(kg)));
        conResultado++;
      }
    }
    const rec = leerNumero(r.recomendado.precio);
    if (rec && sol) {
      recXkg = recXkg.plus(rec.times(kg));
      solXkgConRec = solXkgConRec.plus(sol.times(kg));
      kgConRec = kgConRec.plus(kg);
    }
  }
  const recProm = dividir(recXkg, kgConRec);
  const solPromConRec = dividir(solXkgConRec, kgConRec);
  const pct = (x: Decimal) => dividir(x, eqGeneral)?.times(100) ?? null;
  return {
    bolsas: [...porProducto].map(([id, x]) => ({ id, nombre: x.nombre, categoria: x.categoria, bolsas: x.bolsas.toString(), kg: x.kg.toString() })),
    partidas: filas.length,
    productores: productores.size,
    tacos: tacos.toString(),
    kgBruto: kgBruto.toString(),
    kgTerminados: kgTerminados.toString(),
    generalPorTaco: textoONulo(dividir(eqGeneral, tacos)),
    cubitosPorTaco: textoONulo(dividir(eqCubitos, tacos)),
    pctElegida: textoONulo(pct(eqElegida)),
    pctComun: textoONulo(pct(eqComun)),
    kgPorTaco: textoONulo(dividir(kgTerminados, tacos)),
    precioSolicitadoProm: textoONulo(dividir(solicitadoXkg, kgConSolicitado)),
    precioPagadoProm: textoONulo(dividir(pagadoXkg, kgConPagado)),
    partidasConPrecioPagado: conPagado,
    precioLimiteProm: textoONulo(dividir(margenSuma, kgConMargen)),
    precioRecomendadoProm: textoONulo(recProm),
    difSolicitadoRecomendado: recProm && solPromConRec ? solPromConRec.minus(recProm).toString() : null,
    ingresos: ingresos.toString(),
    costosOperativos: costos.toString(),
    margenOperativo: margen.toString(),
    partidasEconomicas: economicas,
    costoCompra: costoCompra.toString(),
    resultadoEstimado: conResultado > 0 ? resultadoEst.toString() : null,
  };
}
export type Resumen = ReturnType<typeof resumen>;
