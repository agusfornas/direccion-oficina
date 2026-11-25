// Cuenta de la pantalla "Calculadora": hasta cuánto se puede pagar por kilo con un taco
// de rendimiento óptimo, contando toda la Elegida como Cubitos y toda la Común como Moñitos.
// Traducción fiel de la v1.
import { Decimal, leerEscrito, numeroOCero } from "../comun/numeros";
import { calcularPartida, fraccionesOptimas } from "./calculo";
import { partidaVacia } from "./config-inicial";
import type { ConfigLavadero } from "./tipos";

/** Qué productos se usan para valuar: 1 = Cubitos (Elegida) y Moñitos (Común), 0 = el resto. */
function pesos(c: ConfigLavadero) {
  const r: Record<string, Decimal> = {};
  for (const p of c.productos) r[p.id] = new Decimal(+(p.id === "CUBITOS" || p.id === "MONITOS"));
  return r;
}

/** `c` es una configuración limpia; `kgTacoTexto` y `pideTexto`, lo que escribió la persona. */
export function calcularTacoOptimo(c: ConfigLavadero, kgTacoTexto: string, pideTexto: string) {
  const kgTaco = leerEscrito(kgTacoTexto);
  if (kgTaco === null || kgTaco.lte(0)) return null;
  const fr = fraccionesOptimas(c);
  const w = pesos(c);
  const bolsas: Record<string, string> = {};
  for (const p of c.productos) {
    const kg = kgTaco.times(p.categoria === "ELEGIDA" ? fr.elegida : fr.comun);
    const kgBolsa = numeroOCero(p.kgBolsa);
    bolsas[p.id] = kgBolsa.gt(0) ? kg.times(w[p.id]).div(kgBolsa).toString() : "0";
  }
  const r = calcularPartida(
    { ...partidaVacia(), productor: "Calculadora", pesoModo: "PROMEDIO", tacos: "1", pesoPromedio: kgTaco.toString(), precioSolicitado: "", bolsas },
    c,
  );
  const ganancia = numeroOCero(c.gananciaPct ?? "0").div(100);
  const ventas = numeroOCero(r.ingresos);
  const faltantes = r.faltantes ?? [];
  const maximoKg = faltantes.length || r.precioLimite === null ? null : new Decimal(r.precioLimite);
  const res = {
    kgTaco,
    faltantes,
    maximoKg,
    maximoTaco: maximoKg ? maximoKg.times(kgTaco) : null,
    gananciaPct: ganancia.times(100),
    alcanza: null as boolean | null,
    aumento: null as Decimal | null,
    nuevosPrecios: [] as { id: string; nombre: string; actual: Decimal; nuevo: Decimal }[],
    detalle: {
      kgElegida: kgTaco.times(fr.elegida),
      kgComun: kgTaco.times(fr.comun),
      kgDescarte: kgTaco.times(fr.descarte),
      bolsas: c.productos
        .filter((p) => numeroOCero(bolsas[p.id]).gt(0))
        .map((p) => ({ id: p.id, nombre: p.nombre, bolsas: numeroOCero(bolsas[p.id]), precio: numeroOCero(p.precioVenta) })),
      ventas,
      manoObra: numeroOCero(r.costoManoObra),
      bolsasCosto: numeroOCero(r.costoBolsas),
      entacada: numeroOCero(r.costoEntacada),
      flete: numeroOCero(r.costoFlete),
      gastosGenerales: numeroOCero(r.costoGastosGenerales),
      ganancia: numeroOCero(r.costoGanancia),
      total: numeroOCero(r.costosOperativos),
      queda: ventas.minus(numeroOCero(r.costosOperativos)),
    },
  };
  const pide = leerEscrito(pideTexto);
  if (pide === null || pide.lte(0) || maximoKg === null) return res;
  res.alcanza = pide.lte(maximoKg.plus(1e-6));
  if (res.alcanza || ventas.lte(0) || ganancia.gte(1)) return res;
  // Cuánto habría que subir todos los precios de venta para poder pagar lo que pide.
  const costosSinGanancia = numeroOCero(r.costosOperativos).minus(numeroOCero(r.costoGanancia));
  const factor = pide.times(kgTaco).plus(costosSinGanancia).div(new Decimal(1).minus(ganancia)).div(ventas);
  res.aumento = factor.minus(1);
  res.nuevosPrecios = c.productos
    .filter((p) => p.precioVenta !== null && numeroOCero(p.precioVenta).gt(0))
    .map((p) => ({ id: p.id, nombre: p.nombre, actual: numeroOCero(p.precioVenta), nuevo: numeroOCero(p.precioVenta).times(factor).ceil() }));
  return res;
}

/**
 * "Precios de venta de hoy": la misma configuración, pero con el precio de la bolsa de Cubitos
 * y/o Moñitos que escribió la persona. Solo para la cuenta de la calculadora; no se guarda.
 * Un precio vacío, cero o inválido deja el de Configuración.
 */
export function conPreciosDeHoy(c: ConfigLavadero, cubitosTexto: string, monitosTexto: string): ConfigLavadero {
  const cubitos = leerEscrito(cubitosTexto);
  const monitos = leerEscrito(monitosTexto);
  return {
    ...c,
    productos: c.productos.map((p) =>
      p.id === "CUBITOS" && cubitos && cubitos.gt(0)
        ? { ...p, precioVenta: cubitos.toString() }
        : p.id === "MONITOS" && monitos && monitos.gt(0)
          ? { ...p, precioVenta: monitos.toString() }
          : p,
    ),
  };
}

/**
 * "Precio de venta": si pagás `pagaTexto` el kilo de zanahoria, a cuánto tenés que vender cada
 * producto (como mínimo) para cubrir todos los costos de un taco óptimo y guardar tu % de ganancia.
 *
 *   costo del taco = pagado × kg del taco + mano de obra + bolsas + gastos generales + flete + entacada
 *   venta mínima   = costo del taco ÷ (1 − % de ganancia)
 *   factor         = venta mínima ÷ venta del taco con los precios de Configuración
 *   mínimo         = precio de Configuración × factor, redondeado para arriba a pesos enteros
 *
 * Es la cuenta del Precio Límite dada vuelta: pagando justo el límite, el factor da 1.
 * Devuelve null si falta algún dato para hacer la cuenta.
 */
export function calcularPrecioVenta(c: ConfigLavadero, kgTacoTexto: string, pagaTexto: string) {
  const paga = leerEscrito(pagaTexto);
  const taco = calcularTacoOptimo(c, kgTacoTexto, "");
  if (!taco || paga === null || paga.lt(0) || taco.faltantes.length) return null;
  const x = taco.detalle;
  if (!x.ventas.gt(0)) return null;
  const ganancia = numeroOCero(c.gananciaPct ?? "0").div(100);
  if (ganancia.gte(1)) return null;
  const costoTaco = paga.times(taco.kgTaco).plus(x.manoObra).plus(x.bolsasCosto).plus(x.gastosGenerales).plus(x.flete).plus(x.entacada);
  const ventaMinima = costoTaco.div(new Decimal(1).minus(ganancia));
  const factor = ventaMinima.div(x.ventas);
  return {
    costoTaco,
    ventaMinima,
    ventaActual: x.ventas,
    factor,
    gananciaPct: ganancia.times(100),
    filas: c.productos
      .filter((p) => p.precioVenta !== null && numeroOCero(p.precioVenta).gt(0))
      .map((p) => {
        const hoy = numeroOCero(p.precioVenta);
        const minimo = hoy.times(factor).toDecimalPlaces(0, Decimal.ROUND_UP);
        return { id: p.id, nombre: p.nombre, hoy, minimo, diferencia: hoy.minus(minimo) };
      }),
  };
}
