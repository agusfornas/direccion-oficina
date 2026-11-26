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
import type { ConfigLavadero, EntradaPartida } from "./tipos";

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

describe("Lavadero: la v2 calcula igual que la v1", () => {
  it("5000 partidas al azar: cálculo, validaciones y limpieza idénticos", () => {
    for (let i = 0; i < 5000; i++) {
      const a = azar(i + 1);
      const c = configAlAzar(a);
      const e = partidaAlAzar(a);
      // La v2 valida lo ya limpio; la v1 validaba lo escrito. El resultado tiene que ser el mismo.
      expect(validarPartida(limpiarPartida(e)), `validar partida #${i}`).toEqual(Ft(e));
      expect(validarConfig(limpiarConfig(c, CONFIG_INICIAL)), `validar config #${i}`).toEqual(It(c));
      expect(limpiarPartida(e), `limpiar partida #${i}`).toEqual(Gt(e));
      expect(limpiarConfig(c, CONFIG_INICIAL), `limpiar config #${i}`).toEqual(Ut(c, CONFIG_INICIAL));
      // El motor recibe datos limpios y válidos (no se puede guardar otra cosa). Con valores
      // inválidos ("1,2,3") la v1 adivinaba un número y la v2 lo toma como vacío: no se compara.
      const limpia = limpiarPartida(e);
      const cfg = limpiarConfig(c, CONFIG_INICIAL);
      if (!Object.keys(validarConfig(cfg)).length && !Object.keys(validarPartida(limpia)).length)
        expect(calcularPartida(limpia, cfg), `cálculo #${i}`).toEqual(Nt(limpia, cfg));
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

describe("Lavadero: explicaciones y formatos iguales a la v1", () => {
  it("partidas válidas al azar", () => {
    let comparadas = 0;
    for (let i = 0; i < 60000 && comparadas < 1500; i++) {
      const a = azar(i + 99);
      const cfg = limpiarConfig(configValida(a), CONFIG_INICIAL);
      const e = limpiarPartida(partidaValida(a));
      if (Object.keys(validarConfig(cfg)).length || Object.keys(validarPartida(e)).length) continue;
      const r = calcularPartida(e, cfg);
      expect(r, `cálculo válido #${i}`).toEqual(Nt(e, cfg));
      comparadas++;
      expect(explicarLimite(r, e.productor), `límite #${i}`).toEqual(In(r, e.productor));
      expect(explicarRecomendado(r), `recomendado #${i}`).toEqual(Rn(r));
      expect(resumenPartida(r), `resumen #${i}`).toEqual(Vn(r));
      for (const v of [r.precioLimite, r.kgBruto, r.pctElegida, r.difSolicitadoLimite]) {
        expect(plata(v)).toBe(on(v));
        expect(numeroFijo(v)).toBe(sn(v));
        expect(numero(v)).toBe(cn(v));
        expect(porcentaje(v)).toBe(ln(v));
        expect(conSigno(v)).toBe(un(v));
      }
    }
    expect(comparadas).toBe(1500);
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
