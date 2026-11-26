// Motor de cálculo de Lavadero: de una partida (tacos, kilos, bolsas) y la configuración
// (precios, costos, taco óptimo) saca rendimiento, costos y el precio a pagar.
//
// Es una traducción fiel de la v1: con los mismos datos da los mismos resultados
// (lo comprueban las pruebas de calculo.test.ts contra el código original).
// Si cambiás una fórmula: actualizá FORMULAS, subí la versión y agregá una prueba.
import { Decimal, dividir, leerNumero, numeroOCero, texto, textoONulo } from "../comun/numeros";
import type { ConfigLavadero, EntradaPartida, Producto, ResultadoPartida } from "./tipos";

/** Se guarda dentro de cada partida, para saber con qué fórmulas se calculó. */
export const FORMULAS = {
  version:
    "planilla-v1 / economia-v2 (ganancia) / recomendado-pedido-x-rendimiento-v10 (Elegida y Común con tope en su óptimo: ninguna compensa a la otra; sin pedido: límite × rendimiento)",
  descripciones: {
    cubitosPorTaco: "(Cubitos × 1 + 20×1 × 2 + Moños (Ext) × 2) / Tacos",
    generalPorTaco: "(Cubitos × 0,5 + 20×1 + Moños (Ext) + Moños + Moñitos × 0,5 + Industrial) / Tacos",
    pctElegida: "(Cubitos × 0,5 + 20×1 + Moños (Ext)) / Equivalente general × 100",
    pctComun: "(Moños + Moñitos × 0,5 + Industrial) / Equivalente general × 100",
    kgTerminados: "Σ bolsas × kg de la presentación",
    kgPerdida: "Kg brutos recibidos − Kg terminados (tierra, descarte y pérdidas)",
    optimo: "Kg brutos × (kg de la categoría en el taco de referencia / peso del taco de referencia)",
    ingresos: "Σ bolsas × precio de venta por bolsa",
    costosOperativos:
      "Σ bolsas × costo de bolsa de cada producto + Σ bolsas × mano de obra + Tacos × Entacada + Tacos × (costo viaje / tacos por viaje) + Tacos × gasto general por taco + Ventas × % de ganancia de la empresa",
    precioLimite:
      "(Ingresos totales − Costos operativos, incluida la ganancia de la empresa) / Kg brutos recibidos",
    netoPorBolsa: "Precio de venta − Mano de obra − Costo de bolsa del producto",
    valorNetoReal:
      "Σ bolsas de Elegida × neto por bolsa × mín(kg Elegida óptimos / kg Elegida reales, 1) + Σ bolsas de Común × neto por bolsa × mín(kg Común óptimos / kg Común reales, 1) — cada calidad cuenta solo hasta su óptimo: ninguna compensa a la otra",
    valorNetoOptimo:
      "Kg Elegida óptimos × valor neto por kg de Elegida + Kg Común óptimos × valor neto por kg de Común (según la mezcla de valuación)",
    precioRecomendado:
      "mín( Precio pedido × mín(Valor neto real / Valor neto óptimo, 1) , Precio Límite de Compra ). Se le paga al productor el mismo % de lo que pide en que rindió respecto del óptimo; si eso supera lo que se puede pagar según las ventas y la ganancia del galpón, se recomienda el límite y se avisa.",
  },
};

const cero = () => new Decimal(0);

/** Tacos y kg brutos de la partida (por peso promedio o sumando grupos). */
export function tacosYKilos(e: EntradaPartida): { tacos: Decimal; kgBruto: Decimal } {
  if (e.pesoModo === "GRUPOS") {
    let tacos = cero();
    let kgBruto = cero();
    for (const g of e.grupos) {
      const t = numeroOCero(g.tacos);
      tacos = tacos.plus(t);
      kgBruto = kgBruto.plus(t.times(numeroOCero(g.pesoKg)));
    }
    return { tacos, kgBruto };
  }
  const tacos = numeroOCero(e.tacos);
  return { tacos, kgBruto: tacos.times(numeroOCero(e.pesoPromedio)) };
}

/** Índices de producción: equivalentes, % elegida/común y kg terminados. */
export function produccion(productos: Producto[], bolsas: Record<string, string>, tacos: Decimal) {
  let eqCubitos = cero();
  let eqElegida = cero();
  let eqComun = cero();
  let bolsasFisicas = cero();
  let kgElegida = cero();
  let kgComun = cero();
  for (const p of productos) {
    const b = numeroOCero(bolsas[p.id]);
    const eq = b.times(numeroOCero(p.eqGeneral));
    const kg = b.times(numeroOCero(p.kgBolsa));
    bolsasFisicas = bolsasFisicas.plus(b);
    if (p.categoria === "ELEGIDA") {
      eqCubitos = eqCubitos.plus(b.times(numeroOCero(p.eqCubitos)));
      eqElegida = eqElegida.plus(eq);
      kgElegida = kgElegida.plus(kg);
    } else {
      eqComun = eqComun.plus(eq);
      kgComun = kgComun.plus(kg);
    }
  }
  const eqGeneral = eqElegida.plus(eqComun);
  const pct = (x: Decimal) => dividir(x, eqGeneral)?.times(100) ?? null;
  return {
    eqCubitos,
    eqGeneral,
    eqElegida,
    eqComun,
    cubitosPorTaco: dividir(eqCubitos, tacos),
    generalPorTaco: dividir(eqGeneral, tacos),
    pctElegida: pct(eqElegida),
    pctComun: pct(eqComun),
    bolsasFisicas,
    kgTerminados: kgElegida.plus(kgComun),
    kgElegida,
    kgComun,
  };
}
export type Produccion = ReturnType<typeof produccion>;

/** Qué fracción del taco de referencia es elegida, común y descarte. */
export function fraccionesOptimas(c: ConfigLavadero) {
  const ref = numeroOCero(c.rendimientoOptimo.pesoTacoRef);
  return {
    elegida: dividir(numeroOCero(c.rendimientoOptimo.elegidaKg), ref) ?? cero(),
    comun: dividir(numeroOCero(c.rendimientoOptimo.comunKg), ref) ?? cero(),
    descarte: dividir(numeroOCero(c.rendimientoOptimo.descarteKg), ref) ?? cero(),
  };
}

/** Kg óptimos de cada categoría para estos kg brutos. */
export function kilosOptimos(c: ConfigLavadero, kgBruto: Decimal) {
  const f = fraccionesOptimas(c);
  return { elegida: kgBruto.times(f.elegida), comun: kgBruto.times(f.comun), descarte: kgBruto.times(f.descarte) };
}
export type KilosOptimos = ReturnType<typeof kilosOptimos>;

export const fletePorTaco = (c: ConfigLavadero) =>
  dividir(numeroOCero(c.flete.costoViaje), numeroOCero(c.flete.tacosPorViaje));

export function gastoGeneralPorTaco(c: ConfigLavadero): Decimal | null {
  const g = c.gastosGenerales;
  return g.modo === "MENSUAL"
    ? dividir(numeroOCero(g.mensualTotal), numeroOCero(g.mensualTacos))
    : (leerNumero(g.porTaco) ?? cero());
}

/** Costo de la bolsa vacía de un producto (el suyo o el general). */
export const costoBolsaDe = (p: Producto, c: ConfigLavadero) => leerNumero(p.costoBolsa ?? null) ?? numeroOCero(c.costoBolsa);

/** Precio de venta − mano de obra − bolsa, por bolsa. null si falta precio o mano de obra. */
export function netoPorBolsa(p: Producto, costoBolsa: Decimal): Decimal | null {
  const venta = leerNumero(p.precioVenta);
  const mo = leerNumero(p.manoObra);
  return venta === null || mo === null ? null : venta.minus(mo).minus(costoBolsa);
}

/** Calcula todo lo de una partida. Recibe la partida y la configuración YA LIMPIAS (ver validar.ts). */
export function calcularPartida(e: EntradaPartida, c: ConfigLavadero): ResultadoPartida {
  const { tacos, kgBruto } = tacosYKilos(e);
  const prod = produccion(c.productos, e.bolsas, tacos);
  const opt = kilosOptimos(c, kgBruto);
  const faltantes: string[] = [];
  // null = no se puede calcular (hay bolsas de un producto sin precio o sin mano de obra)
  let ingresos: Decimal | null = cero();
  let manoObraTotal: Decimal | null = cero();
  let costoBolsas = cero();

  const productos = c.productos.map((p) => {
    const b = numeroOCero(e.bolsas[p.id]);
    const venta = leerNumero(p.precioVenta);
    const mo = leerNumero(p.manoObra);
    const ingreso = venta === null ? null : b.times(venta);
    const manoObra = mo === null ? null : b.times(mo);
    if (!b.isZero() && (venta === null || mo === null)) faltantes.push(p.nombre);
    if (ingreso === null) {
      if (!b.isZero()) ingresos = null;
    } else if (ingresos) ingresos = ingresos.plus(ingreso);
    if (manoObra === null) {
      if (!b.isZero()) manoObraTotal = null;
    } else if (manoObraTotal) manoObraTotal = manoObraTotal.plus(manoObra);
    const cb = costoBolsaDe(p, c);
    costoBolsas = costoBolsas.plus(b.times(cb));
    return {
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      bolsas: texto(b),
      kg: texto(b.times(numeroOCero(p.kgBolsa))),
      ingreso: textoONulo(ingreso),
      manoObra: textoONulo(manoObra),
      costoBolsas: texto(b.times(cb)),
      netoPorBolsa: textoONulo(netoPorBolsa(p, cb)),
    };
  });

  const costoEntacada = tacos.times(numeroOCero(c.entacadaPorTaco));
  const flete = fletePorTaco(c);
  const costoFlete = flete === null ? cero() : tacos.times(flete);
  const gg = gastoGeneralPorTaco(c);
  const costoGG = gg === null ? cero() : tacos.times(gg);
  const ventas = ingresos as Decimal | null;
  const mo = manoObraTotal as Decimal | null;
  const gananciaPct = leerNumero(c.gananciaPct) ?? cero();
  const costoGanancia = ventas === null ? null : ventas.times(gananciaPct).div(100);
  const costosOperativos =
    mo === null || costoGanancia === null
      ? null
      : costoBolsas.plus(mo).plus(costoEntacada).plus(costoFlete).plus(costoGG).plus(costoGanancia);
  const margen = ventas === null || costosOperativos === null ? null : ventas.minus(costosOperativos);
  const precioLimite = margen === null ? null : dividir(margen, kgBruto);
  const solicitado = leerNumero(e.precioSolicitado);
  const rec = precioRecomendado(c, e, prod, opt, solicitado, kgBruto, costoEntacada.plus(costoFlete).plus(costoGG), precioLimite);
  const estadoCompra =
    precioLimite === null || solicitado === null
      ? null
      : solicitado.lt(precioLimite.toDecimalPlaces(2))
        ? "MARGEN"
        : solicitado.eq(precioLimite.toDecimalPlaces(2))
          ? "EQUILIBRIO"
          : "PERDIDA";
  const precio = rec.precio;

  return {
    tacos: texto(tacos),
    kgBruto: texto(kgBruto),
    pesoPromedioTaco: textoONulo(dividir(kgBruto, tacos)),
    eqCubitos: texto(prod.eqCubitos),
    eqGeneral: texto(prod.eqGeneral),
    eqElegida: texto(prod.eqElegida),
    eqComun: texto(prod.eqComun),
    cubitosPorTaco: textoONulo(prod.cubitosPorTaco),
    generalPorTaco: textoONulo(prod.generalPorTaco),
    pctElegida: textoONulo(prod.pctElegida),
    pctComun: textoONulo(prod.pctComun),
    bolsasFisicas: texto(prod.bolsasFisicas),
    kgTerminados: texto(prod.kgTerminados),
    kgElegida: texto(prod.kgElegida),
    kgComun: texto(prod.kgComun),
    kgPorTaco: textoONulo(dividir(prod.kgTerminados, tacos)),
    kgPerdida: texto(kgBruto.minus(prod.kgTerminados)),
    pctPerdida: textoONulo(dividir(kgBruto.minus(prod.kgTerminados), kgBruto)?.times(100) ?? null),
    optimo: {
      kgElegida: texto(opt.elegida),
      kgComun: texto(opt.comun),
      kgDescarte: texto(opt.descarte),
      kgElegidaPorTaco: textoONulo(dividir(opt.elegida, tacos)),
      kgComunPorTaco: textoONulo(dividir(opt.comun, tacos)),
      difKgElegida: texto(prod.kgElegida.minus(opt.elegida)),
      difKgComun: texto(prod.kgComun.minus(opt.comun)),
    },
    productos,
    faltantes,
    ingresos: textoONulo(ventas),
    costoBolsas: texto(costoBolsas),
    costoManoObra: textoONulo(mo),
    costoEntacada: texto(costoEntacada),
    costoFlete: texto(costoFlete),
    fletePorTaco: textoONulo(flete),
    costoGastosGenerales: texto(costoGG),
    costoGanancia: textoONulo(costoGanancia),
    gananciaPct: texto(gananciaPct),
    gastosGeneralesPorTaco: textoONulo(gg),
    costosOperativos: textoONulo(costosOperativos),
    margenOperativo: textoONulo(margen),
    precioLimite: textoONulo(precioLimite),
    recomendado: {
      valorNetoReal: textoONulo(rec.vnr),
      comunExcedenteKg: textoONulo(rec.comunExcedenteKg),
      elegidaExcedenteKg: textoONulo(rec.elegidaExcedenteKg ?? null),
      valorNetoOptimo: textoONulo(rec.vno),
      factorRendimiento: textoONulo(rec.factor),
      factorAplicado: textoONulo(rec.factorAplicado),
      descuentoPorKg: textoONulo(rec.descuento),
      limiteOptimo: textoONulo(rec.limiteOptimo),
      referenciaAlta: false,
      precioBase: textoONulo(rec.precioBase),
      base: rec.sinPedido ? "LIMITE" : "PEDIDO",
      precioPorRendimiento: textoONulo(rec.precioPorRendimiento),
      precio: textoONulo(precio),
      limitadoPorSolicitado: false,
      limitadoPor: rec.limitadoPor,
      motivoNoDisponible: rec.motivo,
    },
    precioSolicitado: textoONulo(solicitado),
    difSolicitadoLimite: solicitado && precioLimite ? texto(solicitado.minus(precioLimite)) : null,
    difSolicitadoRecomendado: solicitado && precio ? texto(solicitado.minus(precio)) : null,
    difRecomendadoLimite: precio && precioLimite ? texto(precio.minus(precioLimite)) : null,
    estadoCompra,
  };
}

interface CalculoRecomendado {
  vnr: Decimal | null;
  vno: Decimal | null;
  factor: Decimal | null;
  factorAplicado: Decimal | null;
  precioPorRendimiento: Decimal | null;
  descuento: Decimal | null;
  limiteOptimo: Decimal | null;
  precioBase: Decimal | null;
  comunExcedenteKg: Decimal | null;
  elegidaExcedenteKg?: Decimal | null;
  precio: Decimal | null;
  limitadoPor: "LIMITE" | null;
  motivo: string | null;
  sinPedido?: boolean;
}

/**
 * Precio recomendado: se le paga al productor el mismo % de lo que pide en que su
 * partida rindió respecto del taco óptimo, sin pasar el Precio Límite de Compra.
 */
export function precioRecomendado(
  c: ConfigLavadero,
  e: EntradaPartida,
  prod: Produccion,
  opt: KilosOptimos,
  solicitado: Decimal | null,
  kgBruto: Decimal,
  costosFijos: Decimal,
  precioLimite: Decimal | null,
): CalculoRecomendado {
  const noDisponible = (motivo: string): CalculoRecomendado => ({
    vnr: null, vno: null, factor: null, factorAplicado: null, precioPorRendimiento: null, descuento: null,
    limiteOptimo: null, precioBase: null, comunExcedenteKg: null, precio: null, limitadoPor: null, motivo,
  });
  if (prod.eqGeneral.isZero()) return noDisponible("No hay producción registrada.");

  // Valor neto real: lo que vale lo producido, después de mano de obra y bolsas.
  let netoElegida = cero();
  let netoComun = cero();
  for (const p of c.productos) {
    const b = numeroOCero(e.bolsas[p.id]);
    if (b.isZero()) continue;
    const n = netoPorBolsa(p, costoBolsaDe(p, c));
    if (n === null) return noDisponible(`Falta configurar precio de venta o mano de obra de ${p.nombre}.`);
    if (p.categoria === "ELEGIDA") netoElegida = netoElegida.plus(b.times(n));
    else netoComun = netoComun.plus(b.times(n));
  }
  // Cada calidad cuenta solo hasta su óptimo: lo que sobra de una no compensa lo que
  // falta de la otra (26/11/2026; antes solo la Común tenía tope y la Elegida de más sumaba).
  const hastaOptimo = (real: Decimal, optimo: Decimal) => (real.gt(optimo) && real.gt(0) ? optimo.div(real) : new Decimal(1));
  const comunExcedenteKg = Decimal.max(prod.kgComun.minus(opt.comun), 0);
  const elegidaExcedenteKg = Decimal.max(prod.kgElegida.minus(opt.elegida), 0);
  const vnr = netoElegida.times(hastaOptimo(prod.kgElegida, opt.elegida)).plus(netoComun.times(hastaOptimo(prod.kgComun, opt.comun)));

  // Valor neto por kg de una categoría, según la mezcla de productos elegida.
  const valorPorKg = (categoria: "ELEGIDA" | "COMUN"): { v: Decimal | null; motivo?: string } => {
    const ps = c.productos.filter((p) => p.categoria === categoria);
    const nombre = categoria === "ELEGIDA" ? "Elegida" : "Común";
    const deReferencia = () => ps.map((p) => ({ p, w: numeroOCero(c.recomendado.mezclaReferencia[p.id]) }));
    let mezcla: { p: Producto; w: Decimal }[];
    if (c.recomendado.mezcla === "REAL") {
      mezcla = ps.map((p) => ({ p, w: numeroOCero(e.bolsas[p.id]).times(numeroOCero(p.kgBolsa)) }));
      if (mezcla.every((m) => m.w.isZero())) mezcla = deReferencia();
    } else mezcla = deReferencia();
    const total = mezcla.reduce((s, m) => s.plus(m.w), cero());
    if (total.isZero())
      return {
        v: null,
        motivo: `No hay producción de ${nombre} en la partida ni mezcla de referencia configurada para valuar el óptimo de ${nombre}.`,
      };
    let v = cero();
    for (const { p, w } of mezcla) {
      if (w.isZero()) continue;
      const n = netoPorBolsa(p, costoBolsaDe(p, c));
      if (n === null) return { v: null, motivo: `Falta configurar precio de venta o mano de obra de ${p.nombre}.` };
      const kg = numeroOCero(p.kgBolsa);
      if (kg.isZero()) return { v: null, motivo: `Presentación de ${p.nombre} sin kilos.` };
      v = v.plus(w.div(total).times(n.div(kg)));
    }
    return { v };
  };

  const vElegida = opt.elegida.isZero() ? { v: cero() } : valorPorKg("ELEGIDA");
  if (vElegida.v === null) return { ...noDisponible(vElegida.motivo!), vnr };
  const vComun = opt.comun.isZero() ? { v: cero() } : valorPorKg("COMUN");
  if (vComun.v === null) return { ...noDisponible(vComun.motivo!), vnr };

  const vno = opt.elegida.times(vElegida.v).plus(opt.comun.times(vComun.v));
  if (vno.lte(0))
    return { ...noDisponible("El valor neto óptimo es cero o negativo; revisar precios y costos."), vnr, vno };
  if (kgBruto.isZero()) return { ...noDisponible("Sin kilos brutos."), vnr, vno };

  const factor = vnr.div(vno);
  const factorAplicado = Decimal.max(0, Decimal.min(factor, 1));
  const limiteOptimo = vno.minus(costosFijos).div(kgBruto);
  if (precioLimite === null)
    return {
      ...noDisponible("No se puede calcular el Precio Límite de Compra."),
      vnr, vno, factor, factorAplicado, limiteOptimo,
    };

  if (solicitado === null || solicitado.lte(0)) {
    // Sin precio pedido: límite × rendimiento.
    const base = Decimal.max(precioLimite, 0);
    const p = base.times(factorAplicado);
    return {
      vnr, vno, factor, factorAplicado, precioPorRendimiento: p, descuento: base.minus(p), limiteOptimo,
      precioBase: base, precio: p, limitadoPor: null, comunExcedenteKg, elegidaExcedenteKg, motivo: null, sinPedido: true,
    };
  }
  const porRendimiento = solicitado.times(factorAplicado);
  const tope = Decimal.max(precioLimite, 0);
  const limitado = tope.lt(porRendimiento);
  return {
    vnr, vno, factor, factorAplicado, precioPorRendimiento: porRendimiento, descuento: solicitado.minus(porRendimiento),
    limiteOptimo, precioBase: solicitado, precio: limitado ? tope : porRendimiento, limitadoPor: limitado ? "LIMITE" : null,
    comunExcedenteKg, elegidaExcedenteKg, motivo: null, sinPedido: false,
  };
}
