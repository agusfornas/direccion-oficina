// Pruebas del motor de Lavadero.
// 1) Equivalencia: con miles de partidas y configuraciones al azar, la v2 da EXACTAMENTE
//    lo mismo que el código de la v1 (copiado en src/pruebas/original/).
// 2) Casos fijos: el arreglo de "1.500" y ejemplos calculados a mano.
import { describe, expect, it } from "vitest";
// @ts-expect-error: archivo JS copiado de la v1, sin tipos
import { Nt, Ft, It, Ut, Gt } from "../pruebas/original/lavadero-v1.js";
import { calcularPartida } from "./calculo";
import { CONFIG_INICIAL, partidaVacia } from "./config-inicial";
import { limpiarConfig, limpiarPartida, validarConfig, validarPartida } from "./validar";
import type { ConfigLavadero, EntradaPartida, ResultadoPartida } from "./tipos";
import { Decimal } from "../comun/numeros";

// Generador al azar con semilla fija (siempre los mismos casos).
function azar(semilla: number) {
  let s = semilla >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const entero = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const elegir = <T,>(xs: T[]): T => xs[entero(0, xs.length - 1)];
  // Números como los escribiría alguien, sin el caso ambiguo "1.500" (ese cambió a propósito).
  const num = (max: number) =>
    elegir([
      () => String(entero(0, max)),
      () => `${entero(0, max)}.${entero(1, 9)}`,
      () => `${entero(0, max)},${entero(10, 99)}`,
      () => "",
      () => "0",
      () => elegir(["abc", "-3", "1,2,3", "$ 50"]),
    ])();
  return { r, entero, elegir, num };
}

function configAlAzar(a: ReturnType<typeof azar>): ConfigLavadero {
  const c: ConfigLavadero = structuredClone(CONFIG_INICIAL);
  for (const p of c.productos) {
    p.precioVenta = a.r() < 0.15 ? null : a.num(30000);
    p.manoObra = a.r() < 0.15 ? null : a.num(1000);
    p.costoBolsa = a.r() < 0.2 ? null : a.num(1500);
  }
  c.gananciaPct = a.elegir(["", "0", "10", "15.5", "120", a.num(50)]);
  c.costoBolsa = a.num(800);
  c.entacadaPorTaco = a.num(2000);
  c.flete = { costoViaje: a.num(500000), tacosPorViaje: a.elegir(["0", "900", a.num(1000)]) };
  c.gastosGenerales = {
    modo: a.elegir(["POR_TACO", "MENSUAL"] as const),
    porTaco: a.num(3000),
    mensualTotal: a.num(9000000),
    mensualTacos: a.elegir(["0", a.num(5000)]),
  };
  c.rendimientoOptimo = { pesoTacoRef: a.elegir(["32", "0", a.num(40)]), elegidaKg: a.num(25), comunKg: a.num(10), descarteKg: a.num(10) };
  c.precioReferencia = a.num(500);
  c.recomendado = {
    mezcla: a.elegir(["REAL", "CONFIGURADA"] as const),
    mezclaReferencia: Object.fromEntries(c.productos.map((p) => [p.id, a.elegir(["", "50", "100", a.num(100)])])),
  };
  return c;
}

function partidaAlAzar(a: ReturnType<typeof azar>): EntradaPartida {
  const e = partidaVacia();
  e.productor = a.elegir(["Juan Pérez", "  ana   gómez ", "", "Coop. Norte"]);
  e.fecha = a.elegir(["2026-11-20", "2026-1-2", "2025-03-31"]);
  e.pesoModo = a.elegir(["PROMEDIO", "GRUPOS"] as const);
  e.tacos = a.elegir([a.num(1200), String(a.entero(1, 900))]);
  e.pesoPromedio = a.elegir(["32", a.num(45)]);
  e.grupos = Array.from({ length: a.entero(0, 3) }, () => ({ tacos: a.num(300), pesoKg: a.num(40) }));
  e.precioSolicitado = a.elegir(["", "0", a.num(600), String(a.entero(100, 500))]);
  e.precioPagado = a.num(600);
  for (const k of Object.keys(e.bolsas)) e.bolsas[k] = a.r() < 0.3 ? "" : a.elegir([a.num(400), String(a.entero(0, 300))]);
  e.notas = a.elegir(["", "  ok  "]);
  return e;
}

/**
 * DIFERENCIA ANOTADA CON LA V1 (26/11/2026, pedido del dueño): en el rendimiento, la Elegida
 * también cuenta solo hasta su óptimo (antes solo la Común tenía tope y la Elegida de más
 * compensaba la Común que faltaba). Cuando NO sobra Elegida, todo tiene que dar igual que la v1.
 * Cuando sobra, todo lo demás igual, y el recomendado se controla con la cuenta nueva:
 *   valor real = valor real de la v1 − neto de la Elegida × (1 − kg Elegida óptimos / kg Elegida reales)
 * Otra diferencia (26/11/2026): sin precio pedido ya no hay recomendado (la v1 daba límite ×
 * rendimiento). Acá no aparece porque el formulario exige precio; la prueban los casos fijos de abajo.
 */
function compararConV1(r: ResultadoPartida, v1: ResultadoPartida, msg: string) {
  const sacar = (x: ResultadoPartida) => {
    const { recomendado, difSolicitadoRecomendado, difRecomendadoLimite, ...resto } = x;
    return { recomendado, difs: [difSolicitadoRecomendado, difRecomendadoLimite], resto };
  };
  const nuevo = sacar(r);
  const viejo = sacar(v1);
  expect(nuevo.resto, msg).toEqual(viejo.resto);
  const { elegidaExcedenteKg, ...rec } = nuevo.recomendado;
  const realE = new Decimal(r.kgElegida);
  const optE = new Decimal(r.optimo.kgElegida);
  const sobraElegida = realE.gt(optE);
  if (rec.valorNetoReal === null) expect(elegidaExcedenteKg ?? null, msg).toBeNull();
  else expect(elegidaExcedenteKg, msg).toBe(Decimal.max(realE.minus(optE), 0).toString());
  if (!sobraElegida || viejo.recomendado.valorNetoReal === null || viejo.recomendado.valorNetoOptimo === null) {
    expect(rec, msg).toEqual(viejo.recomendado);
    expect(nuevo.difs, msg).toEqual(viejo.difs);
    return false;
  }
  const cerca = (a: string | null, b: Decimal, que: string) => {
    expect(a, `${msg} ${que}`).not.toBeNull();
    expect(new Decimal(a!).minus(b).abs().lt("1e-20"), `${msg} ${que}: ${a} vs ${b}`).toBe(true);
  };
  const netoElegida = r.productos
    .filter((p) => p.categoria === "ELEGIDA" && p.netoPorBolsa !== null)
    .reduce((t, p) => t.plus(new Decimal(p.bolsas).times(p.netoPorBolsa!)), new Decimal(0));
  const vnr = new Decimal(viejo.recomendado.valorNetoReal).minus(netoElegida.times(new Decimal(1).minus(optE.div(realE))));
  const vno = new Decimal(viejo.recomendado.valorNetoOptimo);
  expect(rec.valorNetoOptimo, msg).toBe(viejo.recomendado.valorNetoOptimo);
  cerca(rec.valorNetoReal, vnr, "valor neto real");
  const factor = vnr.div(vno);
  cerca(rec.factorRendimiento, factor, "rendimiento");
  const fa = Decimal.max(0, Decimal.min(factor, 1));
  if (rec.precio === null || r.precioLimite === null) return true;
  const precio =
    rec.base === "LIMITE"
      ? Decimal.max(new Decimal(r.precioLimite), 0).times(fa)
      : Decimal.min(new Decimal(r.precioSolicitado!).times(fa), Decimal.max(new Decimal(r.precioLimite), 0));
  cerca(rec.precio, precio, "precio recomendado");
  return true;
}

/**
 * DIFERENCIA ANOTADA (26/11/2026): el precio pedido es opcional. La v1 exigía un número mayor a 0;
 * ahora vacío o 0 se aceptan (sin precio pedido) y solo se marca si es inválido o negativo.
 */
function validarComoAhora(v1: Record<string, string>, limpia: EntradaPartida) {
  const { precioSolicitado: _, ...resto } = v1;
  const n = limpia.precioSolicitado.trim();
  const valido = n === "" || (/^-?\d+(\.\d+)?$/.test(n) && Number(n) >= 0);
  return valido ? resto : { ...resto, precioSolicitado: "Precio inválido. Si no pide precio, dejalo vacío." };
}

describe("Lavadero: la v2 calcula igual que la v1", () => {
  it("5000 partidas al azar: cálculo, validaciones y limpieza idénticos", () => {
    for (let i = 0; i < 5000; i++) {
      const a = azar(i + 1);
      const c = configAlAzar(a);
      const e = partidaAlAzar(a);
      // La v2 valida lo ya limpio; la v1 validaba lo escrito. El resultado tiene que ser el mismo.
      expect(validarPartida(limpiarPartida(e)), `validar partida #${i}`).toEqual(validarComoAhora(Ft(e), limpiarPartida(e)));
      expect(validarConfig(limpiarConfig(c, CONFIG_INICIAL)), `validar config #${i}`).toEqual(It(c));
      expect(limpiarPartida(e), `limpiar partida #${i}`).toEqual(Gt(e));
      expect(limpiarConfig(c, CONFIG_INICIAL), `limpiar config #${i}`).toEqual(Ut(c, CONFIG_INICIAL));
      // El motor recibe datos limpios y válidos (no se puede guardar otra cosa). Con valores
      // inválidos ("1,2,3") la v1 adivinaba un número y la v2 lo toma como vacío: no se compara.
      const limpia = limpiarPartida(e);
      const cfg = limpiarConfig(c, CONFIG_INICIAL);
      if (!Object.keys(validarConfig(cfg)).length && !Object.keys(validarPartida(limpia)).length)
        compararConV1(calcularPartida(limpia, cfg), Nt(limpia, cfg), `cálculo #${i}`);
    }
  });
});

describe("Lavadero: casos fijos", () => {
  it("'1.500' se lee como mil quinientos (en la v1 era 1,5)", () => {
    const e = { ...partidaVacia(), productor: "X", tacos: "100", precioSolicitado: "1.500" };
    expect(limpiarPartida(e).precioSolicitado).toBe("1500");
    expect(limpiarPartida({ ...e, precioSolicitado: "1.234,5" }).precioSolicitado).toBe("1234.5");
    expect(limpiarPartida({ ...e, precioSolicitado: "32.5" }).precioSolicitado).toBe("32.5");
  });

  it("ejemplo a mano: 100 tacos de 32 kg con la configuración inicial", () => {
    const e: EntradaPartida = {
      ...partidaVacia(),
      productor: "Prueba",
      tacos: "100",
      pesoPromedio: "32",
      precioSolicitado: "300",
      bolsas: { CUBITOS: "40", VEINTEX1: "50", EXTRA: "20", MONOS: "0", MONITOS: "10", INDUSTRIAL: "10" },
    };
    const r = calcularPartida(limpiarPartida(e), CONFIG_INICIAL);
    expect(r.kgBruto).toBe("3200");
    // 40×10 + 50×20 + 20×20 + 10×10 + 10×20 = 2100 kg terminados
    expect(r.kgTerminados).toBe("2100");
    // Ingresos: 40×6000 + 50×21000 + 20×19000 + 10×3000 + 10×8000 = 1.780.000
    expect(r.ingresos).toBe("1780000");
    expect(r.recomendado.precio).not.toBeNull();
  });
});

// Los textos explicativos y los formatos de números también tienen que salir iguales.
// @ts-expect-error: archivo JS copiado de la v1, sin tipos
import { In, Rn, Vn, on, sn, cn, ln, un } from "../pruebas/original/lavadero-v1.js";
import { explicarLimite, explicarRecomendado, resumenPartida } from "./explicaciones";
import { conSigno, numero, numeroFijo, plata, porcentaje } from "../comun/numeros";

// Datos realistas y válidos: precios cerca de los reales, rendimientos variados.
function configValida(a: ReturnType<typeof azar>): ConfigLavadero {
  const c: ConfigLavadero = structuredClone(CONFIG_INICIAL);
  for (const p of c.productos) {
    if (p.precioVenta !== null || a.r() < 0.3) p.precioVenta = String(a.entero(2000, 25000));
    if (p.manoObra !== null || a.r() < 0.3) p.manoObra = String(a.entero(100, 900));
  }
  c.gananciaPct = a.elegir(["0", "10", "15", String(a.entero(0, 40))]);
  const ref = a.entero(28, 36);
  const el = a.entero(10, ref - 4);
  const co = a.entero(1, ref - el - 1);
  c.rendimientoOptimo = { pesoTacoRef: String(ref), elegidaKg: String(el), comunKg: String(co), descarteKg: String(ref - el - co) };
  c.recomendado.mezcla = a.elegir(["REAL", "CONFIGURADA"] as const);
  c.recomendado.mezclaReferencia = { CUBITOS: "40", VEINTEX1: "30", EXTRA: "30", MONOS: "0", MONITOS: "50", INDUSTRIAL: "50" };
  return c;
}
function partidaValida(a: ReturnType<typeof azar>): EntradaPartida {
  const e = partidaVacia();
  e.productor = a.elegir(["Juan Pérez", "", "Coop. Norte"]) || "Ana";
  e.tacos = String(a.entero(20, 900));
  e.pesoPromedio = String(a.entero(25, 38));
  e.precioSolicitado = String(a.entero(80, 600));
  const t = Number(e.tacos);
  e.bolsas = {
    CUBITOS: String(a.entero(0, t)),
    VEINTEX1: String(a.entero(0, t)),
    EXTRA: String(a.entero(0, t / 2)),
    MONOS: "0",
    MONITOS: String(a.entero(0, t / 3)),
    INDUSTRIAL: String(a.entero(0, t / 2)),
  };
  return e;
}

/**
 * Diferencias anotadas con la v1 en la conclusión del resumen (26/11/2026, pedido del dueño):
 * "a este productor le pagás $ X" → "la partida da para $ X" (el precio se negocia);
 * "Como le pagás" → "Si le pagás"; sin precio pedido, si el número es el mismo que el tope,
 * las dos líneas se juntan en una. Esto pasa el texto de la v1 a como queda ahora.
 */
function resumenComoAhora(v: ReturnType<typeof resumenPartida>) {
  if (!v) return v;
  // 26/11/2026: la Elegida de más tampoco suma ("X % más, pero cuenta solo hasta Y kg").
  v = {
    ...v,
    filas: v.filas.map((f) =>
      f.nombre === "Elegida" && /^\d+\u00a0% más$/.test(f.diferencia)
        ? { ...f, diferencia: `${f.diferencia}, pero cuenta solo hasta ${numeroFijo(String(f.esperado), 1)} kg` }
        : f,
    ),
  };
  const c = v.conclusion.map((x: string) =>
    x.replace("Por cómo rindió, a este productor le pagás ", "Por cómo rindió, la partida da para ").replace(/^Como le pagás /, "Si le pagás "),
  );
  const m0 = c[0]?.match(/^Por cómo rindió, la partida da para (.+) por kilo\.$/);
  const m1 = c[1]?.match(/^Sin precio pedido: no pases de (.+) por kilo\.$/);
  if (m0 && m1 && m0[1] === m1[1]) c.splice(0, 2, `Por cómo rindió, la partida da para ${m0[1]} por kilo. No pases de ahí.`);
  return { ...v, conclusion: c };
}

/**
 * Diferencia anotada (26/11/2026, pedido del dueño): la primera frase de la explicación del
 * límite aclara que todavía no está descontado el pago al productor.
 */
function limiteComoAhora(v1: string[]): string[] {
  const t = [...v1];
  const m = t[0]?.match(/^Con tus ventas y tus costos, la zanahoria (.+) deja (.+) por kilo(, con tu (.+) ya guardado)?\.$/);
  if (m)
    t[0] = m[3]
      ? `Sin contar el pago al productor, la zanahoria ${m[1]} te deja ${m[2]} por kilo, ya con gastos y tu ${m[4]} cubiertos.`
      : `Sin contar el pago al productor, la zanahoria ${m[1]} te deja ${m[2]} por kilo, ya con los gastos cubiertos.`;
  return t;
}

/** Explicación del recomendado de la v1, con las líneas de "no compensa" de ahora (26/11/2026). */
function recomendadoComoAhora(v1: string[], r: ResultadoPartida): string[] {
  const tacos = Number(r.tacos);
  const comun = Number(r.recomendado.comunExcedenteKg ?? 0);
  const elegida = Number(r.recomendado.elegidaExcedenteKg ?? 0);
  const t = [...v1];
  const i = t.findIndex((x) => x.startsWith("La Común de más ("));
  if (comun > 0.5 && elegida > 0.5) t[i] = "La Elegida y la Común de más no suman: cada una cuenta solo hasta su óptimo.";
  else if (elegida > 0.5 && tacos > 0 && comun <= 0.5) {
    const donde = t[0]?.startsWith("Taco de ") ? 1 : 0;
    t.splice(donde, 0, `La Elegida de más (${numeroFijo(String(elegida / tacos), 1)} kg por taco) no compensa la Común que falta.`);
  }
  return t;
}

describe("Lavadero: explicaciones y formatos iguales a la v1", () => {
  it("partidas válidas al azar", () => {
    let comparadas = 0;
    let conElegidaDeMas = 0;
    for (let i = 0; i < 60000 && comparadas < 1500; i++) {
      const a = azar(i + 99);
      const cfg = limpiarConfig(configValida(a), CONFIG_INICIAL);
      const e = limpiarPartida(partidaValida(a));
      if (Object.keys(validarConfig(cfg)).length || Object.keys(validarPartida(e)).length) continue;
      const r = calcularPartida(e, cfg);
      if (compararConV1(r, Nt(e, cfg), `cálculo válido #${i}`)) conElegidaDeMas++;
      comparadas++;
      expect(explicarLimite(r, e.productor), `límite #${i}`).toEqual(limiteComoAhora(In(r, e.productor)));
      expect(explicarRecomendado(r), `recomendado #${i}`).toEqual(recomendadoComoAhora(Rn(r), r));
      expect(resumenPartida(r), `resumen #${i}`).toEqual(resumenComoAhora(Vn(r)));
      for (const v of [r.precioLimite, r.kgBruto, r.pctElegida, r.difSolicitadoLimite]) {
        expect(plata(v)).toBe(on(v));
        expect(numeroFijo(v)).toBe(sn(v));
        expect(numero(v)).toBe(cn(v));
        expect(porcentaje(v)).toBe(ln(v));
        expect(conSigno(v)).toBe(un(v));
      }
    }
    expect(comparadas).toBe(1500);
    // Que haya bastantes partidas con Elegida de más, para que la regla nueva esté probada.
    expect(conElegidaDeMas).toBeGreaterThan(100);
  });
});

// @ts-expect-error: archivo JS copiado de la v1, sin tipos
import { jH, tn } from "../pruebas/original/lavadero-v1.js";
import { calcularTacoOptimo } from "./calculadora";
import { resumen, type FilaEstadistica } from "./estadisticas";

describe("Lavadero: calculadora y estadísticas iguales a la v1", () => {
  it("calculadora con 2000 configuraciones y precios al azar", () => {
    for (let i = 0; i < 2000; i++) {
      const a = azar(i + 500);
      const cfg = limpiarConfig(a.r() < 0.5 ? configValida(a) : configAlAzar(a), CONFIG_INICIAL);
      if (Object.keys(validarConfig(cfg)).length) continue;
      const kg = a.elegir(["32", "", "0", String(a.entero(20, 40)), "31.5"]);
      const pide = a.elegir(["", "0", String(a.entero(50, 900))]);
      // Se comparan como JSON: las dos versiones usan copias distintas de la clase Decimal.
      expect(JSON.parse(JSON.stringify(calcularTacoOptimo(cfg, kg, pide))), `calculadora #${i}`).toEqual(JSON.parse(JSON.stringify(jH(cfg, kg, pide))));
    }
  });
  it("resumen de 200 grupos de partidas al azar", () => {
    for (let i = 0; i < 200; i++) {
      const a = azar(i + 900);
      const filas: FilaEstadistica[] = Array.from({ length: a.entero(0, 25) }, () => {
        const cfg = limpiarConfig(configValida(a), CONFIG_INICIAL);
        const e = limpiarPartida(partidaValida(a));
        e.precioPagado = a.elegir(["", String(a.entero(50, 500))]);
        return { fecha: e.fecha, productor: a.elegir(["A", "B", "C"]), precioPagado: e.precioPagado, resultado: calcularPartida(e, cfg) };
      });
      expect(resumen(filas), `resumen #${i}`).toEqual(tn(filas));
    }
  });
});

describe("Lavadero: números calculados con tres decimales", () => {
  it("2,415 bolsas guardadas como '2.415' se leen como 2,415 (no 2415)", () => {
    const e = limpiarPartida({ ...partidaVacia(), productor: "X", tacos: "1", precioSolicitado: "100", bolsas: { CUBITOS: "2,415", VEINTEX1: "", EXTRA: "", MONOS: "", MONITOS: "", INDUSTRIAL: "" } });
    expect(e.bolsas.CUBITOS).toBe("2.415");
    expect(calcularPartida(e, CONFIG_INICIAL).kgTerminados).toBe("24.15");
  });
});

// Calculadora, 25/11/2026: "Precios de venta de hoy" y "Precio de venta" (traídas del artefacto
// de claude.ai del 24/11). Antes la página no tenía estas cuentas; ahora tienen que dar lo mismo
// que el artefacto, y las cuentas que ya estaban no cambian.
// @ts-expect-error: archivo JS copiado del artefacto, sin tipos
import { NH } from "../pruebas/artefacto/precio-venta.js";
import { calcularPrecioVenta, conPreciosDeHoy } from "./calculadora";

describe("Lavadero: calculadora, precio de venta y precios de hoy", () => {
  it("precio de venta igual al artefacto con 2000 configuraciones al azar", () => {
    for (let i = 0; i < 2000; i++) {
      const a = azar(i + 3100);
      const cfg = limpiarConfig(a.r() < 0.5 ? configValida(a) : configAlAzar(a), CONFIG_INICIAL);
      if (Object.keys(validarConfig(cfg)).length) continue;
      const kg = a.elegir(["32", "", "0", String(a.entero(20, 40)), "31.5"]);
      const paga = a.elegir(["", "0", "-5", "abc", String(a.entero(50, 900)), `${a.entero(50, 900)},5`]);
      expect(JSON.parse(JSON.stringify(calcularPrecioVenta(cfg, kg, paga))), `precio de venta #${i}`).toEqual(JSON.parse(JSON.stringify(NH(cfg, kg, paga))));
    }
  });

  it("caso a mano: pagando justo el Precio Límite, el mínimo es el precio de hoy", () => {
    const taco = calcularTacoOptimo(CONFIG_INICIAL, "32", "")!;
    const pv = calcularPrecioVenta(CONFIG_INICIAL, "32", taco.maximoKg!.toString())!;
    expect(pv.factor.toDecimalPlaces(12).toString()).toBe("1");
    for (const f of pv.filas) expect(f.diferencia.toString(), f.nombre).toBe("0");
  });

  it("caso a mano: cuenta paso a paso con la configuración inicial y $300 el kilo", () => {
    const c = CONFIG_INICIAL;
    const taco = calcularTacoOptimo(c, "32", "")!;
    const pv = calcularPrecioVenta(c, "32", "300")!;
    const x = taco.detalle;
    const costo = x.manoObra.plus(x.bolsasCosto).plus(x.entacada).plus(x.flete).plus(x.gastosGenerales).plus(300 * 32);
    expect(pv.costoTaco.toString()).toBe(costo.toString());
    const g = Number(c.gananciaPct ?? "0") / 100;
    expect(pv.ventaMinima.toString()).toBe(costo.div(1 - g).toString());
    expect(pv.factor.toString()).toBe(costo.div(1 - g).div(x.ventas).toString());
    const cubitos = pv.filas.find((f) => f.id === "CUBITOS")!;
    expect(cubitos.minimo.toString()).toBe(cubitos.hoy.times(pv.factor).ceil().toString());
    expect(cubitos.diferencia.toString()).toBe(cubitos.hoy.minus(cubitos.minimo).toString());
  });

  it("precio de venta: sin precio pagado, negativo o con faltantes, no hay cuenta", () => {
    expect(calcularPrecioVenta(CONFIG_INICIAL, "32", "")).toBeNull();
    expect(calcularPrecioVenta(CONFIG_INICIAL, "32", "-1")).toBeNull();
    expect(calcularPrecioVenta(CONFIG_INICIAL, "0", "300")).toBeNull();
    const sinPrecio = { ...CONFIG_INICIAL, productos: CONFIG_INICIAL.productos.map((p) => (p.id === "CUBITOS" ? { ...p, precioVenta: null } : p)) };
    expect(calcularPrecioVenta(sinPrecio, "32", "300")).toBeNull();
  });

  it("precios de hoy: vacío deja Configuración; con precio cambia solo Cubitos/Moñitos", () => {
    expect(conPreciosDeHoy(CONFIG_INICIAL, "", "")).toEqual(CONFIG_INICIAL);
    expect(conPreciosDeHoy(CONFIG_INICIAL, "0", "abc")).toEqual(CONFIG_INICIAL);
    const hoy = conPreciosDeHoy(CONFIG_INICIAL, "7.000", "3500,5");
    const precio = (id: string) => hoy.productos.find((p) => p.id === id)!.precioVenta;
    expect(precio("CUBITOS")).toBe("7000");
    expect(precio("MONITOS")).toBe("3500.5");
    for (const p of hoy.productos)
      if (p.id !== "CUBITOS" && p.id !== "MONITOS") expect(p).toEqual(CONFIG_INICIAL.productos.find((q) => q.id === p.id));
    // Con los precios de hoy, la calculadora hace la misma cuenta de siempre.
    const antes = calcularTacoOptimo(CONFIG_INICIAL, "32", "")!.maximoKg!;
    const despues = calcularTacoOptimo(hoy, "32", "")!.maximoKg!;
    expect(despues.gt(antes)).toBe(true);
  });
});

// 25/11/2026: en el peso por taco el punto es decimal. Antes "32.490" se leía como
// treinta y dos mil cuatrocientos noventa kg (618 tacos daban 20.078.820 kg brutos);
// ahora es 32,49 kg (20.078,82 kg brutos). Tacos, precios y bolsas siguen igual.
import { normalizarNumero, normalizarPeso, leerPesoEscrito } from "../comun/numeros";

describe("Lavadero: peso por taco con punto decimal", () => {
  it("618 tacos × 32.490 kg = 20.078,82 kg brutos (antes daba 20.078.820)", () => {
    const e = limpiarPartida({ ...partidaVacia(), productor: "X", tacos: "618", pesoPromedio: "32.490", precioSolicitado: "300" });
    expect(e.pesoPromedio).toBe("32.490");
    expect(calcularPartida(e, CONFIG_INICIAL).kgBruto).toBe("20078.82");
    // Antes: normalizarNumero("32.490") = "32490" → 20.078.820 kg.
    expect(normalizarNumero("32.490")).toBe("32490");
  });
  it("con coma, la regla de siempre; tacos y precios no cambian", () => {
    expect(normalizarPeso("32,49")).toBe("32.49");
    expect(normalizarPeso("1.032,5")).toBe("1032.5");
    expect(normalizarPeso(" 32.5 ")).toBe("32.5");
    expect(normalizarPeso("32")).toBe("32");
    expect(normalizarPeso("")).toBe("");
    const e = limpiarPartida({ ...partidaVacia(), productor: "X", tacos: "1.500", pesoPromedio: "32.490", precioSolicitado: "1.200" });
    expect(e.tacos).toBe("1500");
    expect(e.precioSolicitado).toBe("1200");
  });
  it("grupos de tacos y calculadora también", () => {
    const e = limpiarPartida({ ...partidaVacia(), productor: "X", pesoModo: "GRUPOS", grupos: [{ tacos: "100", pesoKg: "31.250" }], precioSolicitado: "300" });
    expect(e.grupos[0].pesoKg).toBe("31.250");
    expect(calcularPartida(e, CONFIG_INICIAL).kgBruto).toBe("3125");
    expect(leerPesoEscrito("32.490")!.toString()).toBe("32.49");
    expect(calcularTacoOptimo(CONFIG_INICIAL, "32.490", "")!.kgTaco.toString()).toBe("32.49");
  });
});

describe("Lavadero: conclusión del resumen (26/11/2026)", () => {
  const partida = (cubitos: string, monitos: string) =>
    calcularPartida(
      limpiarPartida({ ...partidaVacia(), productor: "X", tacos: "100", pesoPromedio: "32", precioSolicitado: "",
        bolsas: { CUBITOS: cubitos, VEINTEX1: "", EXTRA: "", MONOS: "", MONITOS: monitos, INDUSTRIAL: "" } }),
      CONFIG_INICIAL,
    );
  // 26/11/2026: sin precio pedido ya no hay recomendado (antes: límite × rendimiento, y la
  // conclusión decía "la partida da para $ X"). Queda solo el tope.
  it("sin precio pedido y rinde el óptimo: solo el tope", () => {
    const r = partida("210", "50");
    expect(r.recomendado.precio).toBeNull();
    expect(resumenPartida(r)!.conclusion).toEqual([
      `Sin precio pedido: no pases de ${plata(r.precioLimite)} por kilo.`,
      "Lo que arregles por debajo es ganancia extra, aparte de tu 10\u00a0%.",
    ]);
  });
  it("sin precio pedido y rinde menos: solo el tope (antes también 'la partida da para $ 17,71')", () => {
    const r = partida("80", "40");
    expect(resumenPartida(r)!.conclusion).toEqual([
      "Sin precio pedido: no pases de $\u00a040,01 por kilo.",
      "Lo que arregles por debajo es ganancia extra, aparte de tu 10\u00a0%.",
    ]);
  });
});

describe("Lavadero: ninguna calidad compensa a la otra (26/11/2026)", () => {
  // 100 tacos de 32 kg con la configuración inicial: óptimo 2.000 kg de Elegida y 500 de Común.
  // Esta partida dio 2.400 kg de Elegida (240 bolsas de Cubitos, 20 % más) y 250 de Común
  // (25 de Moñitos, la mitad).
  const e = limpiarPartida({
    ...partidaVacia(), productor: "X", tacos: "100", pesoPromedio: "32", precioSolicitado: "300",
    bolsas: { CUBITOS: "240", VEINTEX1: "", EXTRA: "", MONOS: "", MONITOS: "25", INDUSTRIAL: "" },
  });
  const antes = Nt(e, CONFIG_INICIAL) as ResultadoPartida;
  const ahora = calcularPartida(e, CONFIG_INICIAL);
  const neto = (id: string) => new Decimal(ahora.productos.find((p) => p.id === id)!.netoPorBolsa!);

  it("antes: la Elegida de más compensaba la Común que falta", () => {
    // 240 × neto Cubitos + 25 × neto Moñitos, sin tope a la Elegida.
    expect(antes.recomendado.valorNetoReal).toBe(neto("CUBITOS").times(240).plus(neto("MONITOS").times(25)).toString());
  });
  it("ahora: la Elegida cuenta solo hasta 2.000 kg (200 de las 240 bolsas)", () => {
    const vnr = neto("CUBITOS").times(200).plus(neto("MONITOS").times(25));
    expect(new Decimal(ahora.recomendado.valorNetoReal!).minus(vnr).abs().lt("1e-20")).toBe(true);
    const factor = vnr.div(ahora.recomendado.valorNetoOptimo!);
    expect(new Decimal(ahora.recomendado.factorRendimiento!).minus(factor).abs().lt("1e-20")).toBe(true);
    expect(factor.lt(1)).toBe(true);
    expect(new Decimal(ahora.recomendado.factorRendimiento!).lt(antes.recomendado.factorRendimiento!)).toBe(true);
    expect(ahora.recomendado.elegidaExcedenteKg).toBe("400");
    expect(ahora.recomendado.comunExcedenteKg).toBe("0");
    // Precio recomendado: lo que pide × rendimiento (sin pasar el límite). Baja respecto de antes.
    expect(new Decimal(ahora.recomendado.precio!).lte(antes.recomendado.precio!)).toBe(true);
    // El Precio Límite no cambia: sale de lo que se vende.
    expect(ahora.precioLimite).toBe(antes.precioLimite);
  });
  it("textos: la Elegida de más no compensa la Común que falta", () => {
    expect(explicarRecomendado(ahora)).toContain("La Elegida de más (4,0 kg por taco) no compensa la Común que falta.");
    const fila = resumenPartida(ahora)!.filas.find((f) => f.nombre === "Elegida")!;
    expect(fila.diferencia).toBe("20\u00a0% más, pero cuenta solo hasta 20,0 kg");
  });
  it("y viceversa: la Común de más no compensa la Elegida que falta", () => {
    const r = calcularPartida(
      limpiarPartida({ ...partidaVacia(), productor: "X", tacos: "100", pesoPromedio: "32", precioSolicitado: "300",
        bolsas: { CUBITOS: "150", VEINTEX1: "", EXTRA: "", MONOS: "", MONITOS: "80", INDUSTRIAL: "" } }),
      CONFIG_INICIAL,
    );
    expect(explicarRecomendado(r)).toContain("La Común de más (3,0 kg por taco) no compensa la Elegida que falta.");
  });
  it("partidas guardadas antes del cambio: la fila de Elegida no dice 'cuenta solo hasta'", () => {
    const fila = resumenPartida(antes)!.filas.find((f) => f.nombre === "Elegida")!;
    expect(fila.diferencia).toBe("20\u00a0% más");
  });
});

describe("Lavadero: el descuento por rendimiento es solo con precio pedido (26/11/2026)", () => {
  // 100 tacos de 32 kg, configuración inicial, 190 bolsas de Cubitos y 50 de Moñitos:
  // le falta un poco de Elegida (rinde menos del óptimo).
  const con = (pide: string) =>
    limpiarPartida({ ...partidaVacia(), productor: "X", tacos: "100", pesoPromedio: "32", precioSolicitado: pide,
      bolsas: { CUBITOS: "190", VEINTEX1: "", EXTRA: "", MONOS: "", MONITOS: "50", INDUSTRIAL: "" } });
  it("sin precio pedido: antes límite × rendimiento, ahora no hay recomendado", () => {
    const antes = Nt(con(""), CONFIG_INICIAL) as ResultadoPartida;
    const ahora = calcularPartida(con(""), CONFIG_INICIAL);
    const factor = new Decimal(ahora.recomendado.factorRendimiento!);
    expect(factor.lt(1)).toBe(true);
    expect(antes.recomendado.precio).toBe(Decimal.max(new Decimal(antes.precioLimite!), 0).times(factor).toString());
    expect(ahora.recomendado.precio).toBeNull();
    expect(ahora.recomendado.precioPorRendimiento).toBeNull();
    expect(ahora.difRecomendadoLimite).toBeNull();
    // El rendimiento y el tope se siguen calculando igual.
    expect(ahora.recomendado.factorRendimiento).toBe(antes.recomendado.factorRendimiento);
    expect(ahora.precioLimite).toBe(antes.precioLimite);
    expect(explicarLimite(ahora).some((t) => t.includes("(recomendado)"))).toBe(false);
  });
  it("con precio pedido: lo que pide × rendimiento (pide 200, rinde menos → menos de 200)", () => {
    const r = calcularPartida(con("200"), CONFIG_INICIAL);
    const factor = new Decimal(r.recomendado.factorRendimiento!);
    expect(factor.lt(1)).toBe(true);
    expect(new Decimal(r.precioLimite!).gt(200)).toBe(true);
    expect(r.recomendado.precio).toBe(new Decimal(200).times(factor).toString());
    // Igual que antes del cambio.
    expect(r.recomendado.precio).toBe((Nt(con("200"), CONFIG_INICIAL) as ResultadoPartida).recomendado.precio);
  });
  it("partidas guardadas antes, sin precio pedido: el número viejo no se muestra en los textos", () => {
    const vieja = Nt(con(""), CONFIG_INICIAL) as ResultadoPartida;
    expect(vieja.recomendado.precio).not.toBeNull();
    expect(resumenPartida(vieja)!.conclusion[0]).toMatch(/^Sin precio pedido: no pases de/);
    expect(explicarLimite(vieja).some((t) => t.includes("(recomendado)"))).toBe(false);
  });
});

describe("Lavadero: precio pedido opcional (26/11/2026)", () => {
  const base = { ...partidaVacia(), productor: "X", tacos: "100", pesoPromedio: "32" };
  it("antes era obligatorio; ahora vacío o 0 se puede guardar", () => {
    expect((Ft({ ...base, precioSolicitado: "" }) as Record<string, string>).precioSolicitado).toBeDefined();
    expect(validarPartida(limpiarPartida({ ...base, precioSolicitado: "" })).precioSolicitado).toBeUndefined();
    expect(validarPartida(limpiarPartida({ ...base, precioSolicitado: "0" })).precioSolicitado).toBeUndefined();
  });
  it("inválido o negativo se sigue marcando", () => {
    expect(validarPartida(limpiarPartida({ ...base, precioSolicitado: "abc" })).precioSolicitado).toBeDefined();
    expect(validarPartida(limpiarPartida({ ...base, precioSolicitado: "-5" })).precioSolicitado).toBeDefined();
    expect(validarPartida(limpiarPartida({ ...base, precioSolicitado: "300" })).precioSolicitado).toBeUndefined();
  });
});

describe("Lavadero: explicación del límite, primera frase (26/11/2026)", () => {
  it("aclara que falta el pago al productor", () => {
    const r = calcularPartida(
      limpiarPartida({ ...partidaVacia(), productor: "Orlando", tacos: "100", pesoPromedio: "32", precioSolicitado: "200",
        bolsas: { CUBITOS: "190", VEINTEX1: "", EXTRA: "", MONOS: "", MONITOS: "50", INDUSTRIAL: "" } }),
      CONFIG_INICIAL,
    );
    expect(explicarLimite(r, "Orlando")[0]).toBe(
      `Sin contar el pago al productor, la zanahoria de Orlando te deja ${plata(r.precioLimite)} por kilo, ya con gastos y tu 10\u00a0% cubiertos.`,
    );
    // Antes: "Con tus ventas y tus costos, la zanahoria de Orlando deja $ X por kilo, con tu 10 % ya guardado."
    expect(In(r, "Orlando")[0]).toBe(`Con tus ventas y tus costos, la zanahoria de Orlando deja ${plata(r.precioLimite)} por kilo, con tu 10\u00a0% ya guardado.`);
  });
});
