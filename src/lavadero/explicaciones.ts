// Textos que explican, en criollo, los precios de una partida.
// Se muestran al tocar las tarjetas "Precio Límite" y "Precio Recomendado" y en el
// "Resumen de la partida". Traducción fiel de la v1.
import { numero, numeroFijo, plata } from "../comun/numeros";
import type { ResultadoPartida } from "./tipos";

const $ = (n: number) => plata(String(n));
/** 0,92 → "92 %" */
export const pctRedondo = (n: number) => `${Math.round(n * 100)}\u00a0%`;
const nul = (v: string | null) => (v === null ? null : Number(v));

/** true si no hay precio pedido pero sí se puede calcular un tope. */
export function sinPrecioPedido(r: ResultadoPartida): boolean {
  const pedido = nul(r.precioSolicitado);
  return (pedido === null || pedido <= 0) && r.precioLimite !== null && Number(r.precioLimite) > 0 && Number(r.eqGeneral) > 0;
}

/** Explicación del Precio Límite de Compra. Las líneas que empiezan con "• " van como lista. */
export function explicarLimite(r: ResultadoPartida, productor?: string): string[] {
  const limite = nul(r.precioLimite);
  const pedido = nul(r.precioSolicitado);
  // Sin precio pedido no hay recomendado (las partidas viejas lo traen guardado: no se muestra).
  const recomendado = pedido === null || pedido <= 0 ? null : nul(r.recomendado.precio);
  const rinde = nul(r.recomendado.factorRendimiento);
  const gananciaPct = Number(r.gananciaPct ?? 0);
  if (limite === null || r.margenOperativo === null || r.ingresos === null)
    return ["Faltan datos de la partida o algún precio en Configuración."];
  const kg = Number(r.kgBruto);
  const ventas = Number(r.ingresos);
  const ganancia = Number(r.costoGanancia ?? 0);
  const tuPct = `${numeroFijo(String(gananciaPct), 0)}\u00a0%`;
  const de = productor && productor.trim() ? `de ${productor.trim()}` : "de esta partida";
  const t: string[] = [];
  t.push(
    gananciaPct > 0
      ? `Sin contar el pago al productor, la zanahoria ${de} te deja ${$(limite)} por kilo, ya con gastos y tu ${tuPct} cubiertos.`
      : `Sin contar el pago al productor, la zanahoria ${de} te deja ${$(limite)} por kilo, ya con los gastos cubiertos.`,
  );
  const pagando = (precio: number) => {
    const extraKg = limite - precio;
    const total = ganancia + extraKg * kg;
    const pctTotal = `${numeroFijo(String(ventas > 0 ? (total / ventas) * 100 : 0), 1)}\u00a0%`;
    if (Math.abs(extraKg) < 0.005) return gananciaPct > 0 ? `ganás tu ${tuPct}` : "quedás hecho";
    if (extraKg > 0)
      return gananciaPct > 0 ? `ganás tu ${tuPct} + ${$(extraKg)} por kilo (${pctTotal} en total)` : `ganás ${$(extraKg)} por kilo (${pctTotal})`;
    return total >= 0 ? `ganás solo el ${pctTotal}` : `perdés ${$(-total / kg)} por kilo`;
  };
  t.push(`• Pagando hasta ${$(limite)}, ${pagando(limite)}.`);
  if (pedido !== null && Math.abs(pedido - limite) >= 0.005) t.push(`• Pagando ${$(pedido)} (lo que pide): ${pagando(pedido)}.`);
  if (recomendado !== null && Math.abs(recomendado - limite) >= 0.005 && (pedido === null || Math.abs(recomendado - pedido) >= 0.005))
    t.push(`• Pagando ${$(recomendado)} (recomendado): ${pagando(recomendado)}.`);
  if (pedido !== null && pedido > limite)
    t.push(`Tus ventas no cubren los ${$(pedido)} que pide. Para pagarlo: vender más caro o gastar menos.`);
  if (rinde !== null && rinde >= 1) t.push(`Rindió el ${pctRedondo(rinde)} del óptimo.`);
  else if (pedido !== null && pedido < limite) {
    t.push("El tope da más que lo que pide porque solo mira tus ventas, no lo que pide el productor.");
    if (rinde !== null && rinde < 0.9)
      t.push(`Pide poco porque su mercadería es floja: rindió el ${pctRedondo(rinde)}. Se paga por rendimiento, no por el tope.`);
    else if (rinde !== null) t.push(`Rindió bien (${pctRedondo(rinde)}) y pide barato: buena compra.`);
  }
  return t;
}

/** Explicación del Precio Recomendado. */
export function explicarRecomendado(r: ResultadoPartida): string[] {
  const rec = r.recomendado;
  if (rec.precio === null && !sinPrecioPedido(r)) return [rec.motivoNoDisponible ?? "Faltan datos para calcularlo."];
  const tacos = Number(r.tacos);
  const rinde = nul(rec.factorRendimiento);
  const limite = nul(r.precioLimite);
  const pedido = nul(r.precioSolicitado);
  const precio = Number(rec.precio);
  const gananciaPct = Number(r.gananciaPct ?? 0);
  const tuPct = gananciaPct > 0 ? `tu ${numeroFijo(String(gananciaPct), 0)}\u00a0%` : null;
  const t: string[] = [];
  if (tacos > 0 && r.optimo.kgElegidaPorTaco && r.optimo.kgComunPorTaco)
    t.push(
      `Taco de ${numeroFijo(r.pesoPromedioTaco, 2)} kg: lo esperado es ${numeroFijo(r.optimo.kgElegidaPorTaco, 1)} kg de Elegida y ${numeroFijo(r.optimo.kgComunPorTaco, 1)} kg de Común. Este dio ${numeroFijo(String(Number(r.kgElegida) / tacos), 1)} y ${numeroFijo(String(Number(r.kgComun) / tacos), 1)}.`,
    );
  // Lo que sobra de una calidad no compensa lo que falta de la otra.
  const comunDeMas = rec.comunExcedenteKg ? Number(rec.comunExcedenteKg) : 0;
  const elegidaDeMas = rec.elegidaExcedenteKg ? Number(rec.elegidaExcedenteKg) : 0;
  if (tacos > 0) {
    if (comunDeMas > 0.5 && elegidaDeMas > 0.5)
      t.push("La Elegida y la Común de más no suman: cada una cuenta solo hasta su óptimo.");
    else if (comunDeMas > 0.5)
      t.push(`La Común de más (${numeroFijo(String(comunDeMas / tacos), 1)} kg por taco) no compensa la Elegida que falta.`);
    else if (elegidaDeMas > 0.5)
      t.push(`La Elegida de más (${numeroFijo(String(elegidaDeMas / tacos), 1)} kg por taco) no compensa la Común que falta.`);
  }
  if (sinPrecioPedido(r) && limite !== null) {
    if (rinde !== null) t.push(`Rindió el ${pctRedondo(rinde)} del óptimo.`);
    if (rec.precio !== null) {
      const p = Number(rec.precio);
      t.push(
        rinde !== null && rinde >= 1
          ? `Sin precio pedido: rindió el óptimo o más, así que es tu tope, ${$(p)}.`
          : `Sin precio pedido: tu tope ${$(limite)} × ${pctRedondo(Number(rec.factorAplicado))} = ${$(p)}.`,
      );
      if (limite - p >= 0.005) t.push(`Pagando ${$(p)}, ganás ${tuPct ? `${tuPct} y ` : ""}${$(limite - p)} más por kilo.`);
    }
    return t;
  }
  if (rinde === null || limite === null) return t;
  if (rinde >= 1) {
    const pagaLoQuePide = rec.base === "PEDIDO" ? rec.limitadoPor !== "LIMITE" : rec.limitadoPor === "SOLICITADO";
    if (pagaLoQuePide && pedido !== null) {
      const extra = limite - pedido;
      t.push(`Rindió el ${pctRedondo(rinde)} del óptimo.`);
      t.push(`Si le pagás ${$(pedido)}, ganás ${tuPct ? `${tuPct} y ` : ""}${$(extra)} más por kilo.`);
      t.push(`En toda la partida son ${plata(String(extra * Number(r.kgBruto)), 0)} extra.`);
    } else {
      t.push(
        pedido === null
          ? `Rindió el ${pctRedondo(rinde)} del óptimo.`
          : `Rindió el ${pctRedondo(rinde)} del óptimo, pero tus ventas no cubren los ${$(pedido)} que pide.`,
      );
      t.push(`Tope${tuPct ? ` con ${tuPct}` : ""}: ${$(precio)}. Para pagar más: vender más caro o gastar menos.`);
    }
    return t;
  }
  if (rec.base === "PEDIDO" && pedido !== null) {
    t.push(`Rindió el ${pctRedondo(rinde)} del óptimo: ${$(pedido)} × ${pctRedondo(rinde)} = ${plata(rec.precioPorRendimiento)}.`);
    if (rec.limitadoPor === "LIMITE")
      t.push(`Tu tope${tuPct ? ` para ganar ${tuPct}` : ""} es ${$(limite)}. No pagues más que eso: lo que negocies por debajo es ganancia extra.`);
    return t;
  }
  t.push(`Rindió el ${pctRedondo(rinde)} del óptimo: tope ${$(limite)} × ${pctRedondo(rinde)} = ${plata(rec.precioPorRendimiento)}.`);
  if (rec.limitadoPor === "SOLICITADO") t.push(`Pide ${$(pedido ?? 0)}, menos que eso: queda su precio.`);
  return t;
}

/** Datos del "Resumen de la partida" (tabla esperado vs. dio, y conclusión). */
export function resumenPartida(r: ResultadoPartida) {
  const tacos = Number(r.tacos);
  if (!(tacos > 0) || !r.optimo.kgElegidaPorTaco || !r.optimo.kgComunPorTaco || r.pesoPromedioTaco === null) return null;
  const pesoTaco = Number(r.pesoPromedioTaco);
  const kgBruto = Number(r.kgBruto);
  const pesoTxt = numeroFijo(r.pesoPromedioTaco, 2);
  const tuPct = numeroFijo(r.gananciaPct ?? "0", 0);
  const encabezado = `${numero(r.tacos, 0)} tacos · ${numero(r.kgBruto, 2)} kg brutos · ${pesoTxt} kg por taco.`;
  const titulo = `Rendimiento por taco (taco de ${pesoTxt} kg)`;
  const espElegida = Number(r.optimo.kgElegidaPorTaco);
  const dioElegida = Number(r.kgElegida) / tacos;
  const espComun = Number(r.optimo.kgComunPorTaco);
  const dioComun = Number(r.kgComun) / tacos;
  const dif = (dio: number, esp: number) => (esp > 0 ? Math.round(Math.abs((dio - esp) / esp) * 100) : 0);
  const filas = [
    {
      nombre: "Elegida",
      esperado: espElegida,
      dio: dioElegida,
      diferencia:
        dioElegida < espElegida
          ? `${dif(dioElegida, espElegida)}\u00a0% menos de lo que debería`
          : dioElegida > espElegida
            ? // Desde el 26/11/2026 la Elegida de más tampoco suma (las partidas anteriores no traen el dato).
              r.recomendado.elegidaExcedenteKg !== undefined
              ? `${dif(dioElegida, espElegida)}\u00a0% más, pero cuenta solo hasta ${numeroFijo(String(espElegida), 1)} kg`
              : `${dif(dioElegida, espElegida)}\u00a0% más`
            : "igual",
    },
    {
      nombre: "Común",
      esperado: espComun,
      dio: dioComun,
      diferencia:
        dioComun < espComun
          ? `${dif(dioComun, espComun)}\u00a0% menos de lo que debería`
          : dioComun > espComun
            ? `${dif(dioComun, espComun)}\u00a0% más, pero cuenta solo hasta ${numeroFijo(String(espComun), 1)} kg`
            : "igual",
    },
  ];
  const limite = nul(r.precioLimite);
  const pedido = r.precioSolicitado === null || Number(r.precioSolicitado) <= 0 ? null : Number(r.precioSolicitado);
  // Sin precio pedido no hay recomendado (las partidas viejas lo traen guardado: no se muestra).
  const rec = pedido === null ? null : nul(r.recomendado.precio);
  const conclusion: string[] = [];
  if (limite !== null) {
    if (pedido === null || rec === null) {
      if (rec !== null) conclusion.push(`Por cómo rindió, la partida da para ${$(rec)} por kilo.`);
      conclusion.push(`Sin precio pedido: no pases de ${$(Math.max(limite, 0))} por kilo.`);
      conclusion.push(`Lo que arregles por debajo es ganancia extra, aparte de tu ${tuPct}\u00a0%.`);
    } else if (rec < limite - 0.005) {
      const ahorroKg = limite - rec;
      const total = Math.round((ahorroKg * kgBruto) / 1000) * 1000;
      conclusion.push(`Por cómo rindió, la partida da para ${$(rec)} por kilo.`);
      conclusion.push(`Con lo que vendés, esta zanahoria vale hasta ${$(limite)} por kilo para vos, guardando tu ${tuPct}\u00a0%.`);
      conclusion.push(`Si le pagás ${$(rec)}, te ahorrás **${$(ahorroKg)} por cada kilo**.`);
      conclusion.push(`Cada taco tiene ${pesoTxt} kilos, así que ganás ${$(ahorroKg * pesoTaco)} de más por taco.`);
      conclusion.push(`En toda la partida (${numero(r.tacos, 0)} tacos) son unos ${plata(String(total), 0)} de ganancia extra, aparte de tu ${tuPct}\u00a0%.`);
    } else {
      const vale = r.recomendado.precioPorRendimiento === null ? pedido : Number(r.recomendado.precioPorRendimiento);
      conclusion.push(`Por cómo rindió, vale ${$(vale)} por kilo.`);
      conclusion.push(`Con lo que vendés, no pagues más de ${$(limite)} si querés guardar tu ${tuPct}\u00a0%.`);
    }
  }
  return { encabezado, titulo, filas, conclusion };
}
