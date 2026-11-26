// Validaciones y limpieza de lo que se carga en Lavadero (igual que la v1).
// Orden siempre: primero limpiar (interpreta lo que escribió la persona), después validar
// y calcular sobre lo limpio. Ver la explicación en comun/numeros.ts.
import { Decimal, esNumeroOVacio, leerNumero, normalizarNumero, normalizarPeso, numeroOCero } from "../comun/numeros";
import type { ConfigLavadero, EntradaPartida } from "./tipos";

export type Errores = Record<string, string>;

/** Revisa una partida YA LIMPIA. Devuelve { campo: mensaje } (vacío = todo bien). */
export function validarPartida(e: EntradaPartida): Errores {
  const t: Errores = {};
  if (!e.productor.trim()) t.productor = "Ingresá el productor.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha)) t.fecha = "Fecha inválida.";
  const positivo = (v: string) => leerNumero(v)?.gt(0) ?? false;
  const entero = (v: string) => leerNumero(v)?.isInteger() ?? false;
  if (e.pesoModo === "PROMEDIO") {
    if (!positivo(e.tacos)) t.tacos = "Ingresá la cantidad de tacos (mayor a 0).";
    else if (!entero(e.tacos)) t.tacos = "La cantidad de tacos debe ser un número entero.";
    if (!positivo(e.pesoPromedio)) t.pesoPromedio = "Ingresá el peso promedio por taco.";
  } else {
    if (e.grupos.length === 0) t.grupos = "Agregá al menos un grupo de tacos.";
    e.grupos.forEach((g, i) => {
      if (!(positivo(g.tacos) && entero(g.tacos))) t[`grupo${i}tacos`] = "Tacos: entero mayor a 0.";
      if (!positivo(g.pesoKg)) t[`grupo${i}peso`] = "Peso mayor a 0.";
    });
  }
  // Opcional desde el 26/11/2026: vacío o 0 = sin precio pedido ("A negociar" por debajo del tope).
  const pedido = leerNumero(e.precioSolicitado);
  if (!esNumeroOVacio(e.precioSolicitado) || (pedido !== null && pedido.lt(0)))
    t.precioSolicitado = "Precio inválido. Si no pide precio, dejalo vacío.";
  if (!esNumeroOVacio(e.precioPagado)) t.precioPagado = "Número inválido.";
  for (const [id, v] of Object.entries(e.bolsas)) {
    const n = leerNumero(v);
    if (!esNumeroOVacio(v) || (n !== null && n.lt(0))) t[`bolsas.${id}`] = "Cantidad inválida.";
  }
  return t;
}

/** Revisa una configuración YA LIMPIA. Devuelve { campo: mensaje } (vacío = todo bien). */
export function validarConfig(c: ConfigLavadero): Errores {
  const t: Errores = {};
  const obligatorio = (campo: string, v: string) => {
    const n = leerNumero(v);
    if (n === null) t[campo] = "Obligatorio.";
    else if (n.lt(0)) t[campo] = "No puede ser negativo.";
  };
  const opcional = (campo: string, v: string | null) => {
    if (v === null || v === "") return;
    const n = leerNumero(v);
    if (n === null) t[campo] = "Número inválido.";
    else if (n.lt(0)) t[campo] = "No puede ser negativo.";
  };
  for (const p of c.productos) {
    opcional(`${p.id}.precioVenta`, p.precioVenta);
    opcional(`${p.id}.manoObra`, p.manoObra);
    opcional(`${p.id}.costoBolsa`, p.costoBolsa ?? null);
  }
  obligatorio("entacadaPorTaco", c.entacadaPorTaco);
  obligatorio("flete.costoViaje", c.flete.costoViaje);
  obligatorio("flete.tacosPorViaje", c.flete.tacosPorViaje);
  if (leerNumero(c.flete.tacosPorViaje)?.isZero()) t["flete.tacosPorViaje"] = "Debe ser mayor a 0.";
  if (c.gastosGenerales.modo === "POR_TACO") obligatorio("gg.porTaco", c.gastosGenerales.porTaco);
  else {
    obligatorio("gg.mensualTotal", c.gastosGenerales.mensualTotal);
    obligatorio("gg.mensualTacos", c.gastosGenerales.mensualTacos);
    if (leerNumero(c.gastosGenerales.mensualTacos)?.isZero()) t["gg.mensualTacos"] = "Debe ser mayor a 0.";
  }
  const ro = c.rendimientoOptimo;
  obligatorio("ro.pesoTacoRef", ro.pesoTacoRef);
  obligatorio("ro.elegidaKg", ro.elegidaKg);
  obligatorio("ro.comunKg", ro.comunKg);
  obligatorio("ro.descarteKg", ro.descarteKg);
  if (leerNumero(ro.pesoTacoRef)?.isZero()) t["ro.pesoTacoRef"] = "Debe ser mayor a 0.";
  const suma = numeroOCero(ro.elegidaKg).plus(numeroOCero(ro.comunKg)).plus(numeroOCero(ro.descarteKg));
  if (!t["ro.pesoTacoRef"] && leerNumero(ro.pesoTacoRef) && !suma.eq(numeroOCero(ro.pesoTacoRef)))
    t["ro.suma"] = `Elegida + Común + Descarte (${suma.toString()} kg) debe sumar el peso del taco de referencia.`;
  obligatorio("precioReferencia", c.precioReferencia);
  if (c.gananciaPct !== undefined && c.gananciaPct !== "") {
    const g = leerNumero(c.gananciaPct);
    if (g === null || g.lt(0) || g.gte(100)) t.gananciaPct = "Ingresá un porcentaje entre 0 y 99.";
  }
  for (const id of Object.keys(c.recomendado.mezclaReferencia))
    opcional(`mezcla.${id}`, c.recomendado.mezclaReferencia[id]);
  if (c.recomendado.mezcla === "CONFIGURADA")
    for (const cat of ["ELEGIDA", "COMUN"] as const) {
      const s = c.productos
        .filter((p) => p.categoria === cat)
        .reduce((a, p) => a.plus(numeroOCero(c.recomendado.mezclaReferencia[p.id])), new Decimal(0));
      if (!s.eq(100))
        t[`mezcla.${cat}`] = `La mezcla de ${cat === "ELEGIDA" ? "Elegida" : "Común"} debe sumar 100% (suma ${s.toString()}%).`;
    }
  return t;
}

/** Deja la partida lista para guardar: números normalizados, textos sin espacios de más. */
export function limpiarPartida(e: EntradaPartida): EntradaPartida {
  const n = normalizarNumero;
  return {
    ...e,
    productor: e.productor.trim().replace(/\s+/g, " "),
    tacos: n(e.tacos),
    // Pesos por taco: el punto es decimal ("32.490" = 32,49 kg). Ver normalizarPeso.
    pesoPromedio: normalizarPeso(e.pesoPromedio),
    grupos: e.grupos.map((g) => ({ tacos: n(g.tacos), pesoKg: normalizarPeso(g.pesoKg) })),
    precioSolicitado: n(e.precioSolicitado),
    precioPagado: n(e.precioPagado),
    bolsas: Object.fromEntries(Object.entries(e.bolsas).map(([k, v]) => [k, n(v) || "0"])),
    notas: (e.notas ?? "").trim(),
  };
}

/**
 * Arma la configuración nueva a partir del formulario. Los datos fijos de cada
 * producto (nombre, kg por bolsa, equivalencias) salen de la configuración actual.
 */
export function limpiarConfig(form: ConfigLavadero, actual: ConfigLavadero): ConfigLavadero {
  const n = normalizarNumero;
  const nulo = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? null : n(v));
  return {
    productos: actual.productos.map((p) => {
      const f = form.productos.find((x) => x.id === p.id)!;
      return { ...p, precioVenta: nulo(f.precioVenta), manoObra: nulo(f.manoObra), costoBolsa: nulo(f.costoBolsa ?? null) };
    }),
    gananciaPct: n(form.gananciaPct ?? "0"),
    costoBolsa: n(form.costoBolsa),
    entacadaPorTaco: n(form.entacadaPorTaco),
    precioReferencia: n(form.precioReferencia),
    flete: { costoViaje: n(form.flete.costoViaje), tacosPorViaje: n(form.flete.tacosPorViaje) },
    gastosGenerales: {
      modo: form.gastosGenerales.modo,
      porTaco: n(form.gastosGenerales.porTaco),
      mensualTotal: n(form.gastosGenerales.mensualTotal),
      mensualTacos: n(form.gastosGenerales.mensualTacos),
    },
    rendimientoOptimo: {
      pesoTacoRef: n(form.rendimientoOptimo.pesoTacoRef),
      elegidaKg: n(form.rendimientoOptimo.elegidaKg),
      comunKg: n(form.rendimientoOptimo.comunKg),
      descarteKg: n(form.rendimientoOptimo.descarteKg),
    },
    recomendado: {
      mezcla: form.recomendado.mezcla,
      mezclaReferencia: Object.fromEntries(Object.entries(form.recomendado.mezclaReferencia).map(([k, v]) => [k, n(v)])),
    },
  };
}
