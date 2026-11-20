// Pruebas del motor de Transporte: la v2 da lo mismo que la v1 (copiada en src/pruebas/original/).
import { describe, expect, it } from "vitest";
// @ts-expect-error: archivo JS copiado de la v1, sin tipos
import { BH, HH, UH, WH, GH, KH, VH } from "../pruebas/original/transporte-v1.js";
import { calcularViaje, consumoCada100, resumenViajes, viajeVacio } from "./calculo";
import { limpiarConfigTransporte, limpiarViaje, validarConfigTransporte, validarViaje } from "./validar";
import type { ConfigTransporte, EntradaViaje } from "./tipos";

function azar(semilla: number) {
  let s = semilla >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const entero = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const elegir = <T,>(xs: T[]): T => xs[entero(0, xs.length - 1)];
  const num = (max: number) =>
    elegir([
      () => String(entero(0, max)),
      () => `${entero(0, max)}.${entero(1, 9)}`,
      () => `${entero(0, max)},${entero(10, 99)}`,
      () => `${entero(1, 999)}.${String(entero(0, 999)).padStart(3, "0")}`, // miles con punto
      () => "",
      () => "0",
      () => elegir(["abc", "$ 50"]),
    ])();
  return { r, entero, elegir, num };
}

describe("Transporte: la v2 calcula igual que la v1", () => {
  it("5000 viajes al azar", () => {
    for (let i = 0; i < 5000; i++) {
      const a = azar(i + 7);
      const c: ConfigTransporte = {
        precioGasoil: a.num(2000),
        consumoL100: a.elegir([a.num(60), "200"]),
        factorDesgaste: a.elegir(["1.5", "", a.num(3)]),
        choferPct: a.elegir(["15", "", "120", a.num(40)]),
        ivaPct: a.elegir(["21", "", "10.5", a.num(30)]),
      };
      const e: EntradaViaje = {
        ...viajeVacio(),
        fecha: a.elegir(["2026-11-20", "20/11/2026"]),
        destino: a.elegir(["Rosario", "  ", ""]),
        chofer: a.elegir([" Juan ", ""]),
        fleteIda: a.num(3000000),
        fleteVuelta: a.num(3000000),
        km: a.num(2000),
        peaje: a.num(50000),
        otros: a.num(50000),
        conIva: a.r() < 0.5,
      };
      const ev = limpiarViaje(e);
      const cv = limpiarConfigTransporte(c);
      expect(validarViaje(ev), `validar viaje #${i}`).toEqual(UH(e));
      expect(validarConfigTransporte(cv), `validar config #${i}`).toEqual(HH(c));
      expect(ev, `limpiar viaje #${i}`).toEqual(WH(e));
      expect(cv, `limpiar config #${i}`).toEqual(GH(c));
      expect(calcularViaje(ev, cv), `cálculo #${i}`).toEqual(BH(ev, cv));
      const cons = consumoCada100(e.fleteIda, e.km);
      const consV1 = VH(e.fleteIda, e.km);
      expect(cons?.toString() ?? null).toEqual(consV1?.toString() ?? null);
    }
  });

  it("resumen de viajes igual", () => {
    const viajes = Array.from({ length: 30 }, (_, i) => {
      const e = { ...viajeVacio(), destino: "X", fleteIda: String(1000 * i), fleteVuelta: "500", km: String(10 + i), peaje: "100" };
      return { input: e, resultado: calcularViaje(e, { precioGasoil: "1200", consumoL100: "35", factorDesgaste: "1.5", choferPct: "15", ivaPct: "21" }) };
    });
    expect(resumenViajes(viajes)).toEqual(KH(viajes));
  });
});

describe("Transporte: arreglos de la v2", () => {
  it("un valor con tres decimales no se vuelve a leer como miles", () => {
    const c = limpiarConfigTransporte({ precioGasoil: "1.000", consumoL100: "35", factorDesgaste: "1,250", choferPct: "15", ivaPct: "21" });
    expect(c.precioGasoil).toBe("1000"); // escrito con punto de miles
    expect(c.factorDesgaste).toBe("1.250"); // escrito con coma decimal: 1,25
    const e = limpiarViaje({ ...viajeVacio(), destino: "X", fleteIda: "100.000", fleteVuelta: "0", km: "100" });
    const r = calcularViaje(e, c);
    // 100 km × 35 L/100 = 35 L × 1,25 = 43,75 L × $1000 = $43.750 (la v1 multiplicaba por 1250)
    expect(r.gastoCamion).toBe("43750");
    expect(BH(e, c).gastoCamion).toBe("43750000");
  });
});
