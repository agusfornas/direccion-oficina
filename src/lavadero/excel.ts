// Exportaciones a Excel de Lavadero (mismas planillas que la v1).
import { costoBolsaDe } from "./calculo";
import { encabezado, nuevoLibro, PESOS } from "../comun/excel";
import { agrupar, fechaCorta, mesDe, nombreMes } from "../comun/fechas";
import { paraExcel as n } from "../comun/numeros";
import { resumen, type FilaEstadistica } from "./estadisticas";
import { FORMULAS } from "./calculo";
import type { Partida } from "./tipos";

/** Lista de partidas (pantalla Historial). */
export async function excelPartidas(partidas: Partida[]) {
  const libro = await nuevoLibro();
  const h = libro.addWorksheet("Partidas");
  h.columns = [
    { header: "N°", key: "numero", width: 8 },
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Productor", key: "productor", width: 24 },
    { header: "Tacos", key: "tacos", width: 8 },
    { header: "Kg brutos", key: "kg", width: 12 },
    { header: "Cubitos", key: "CUBITOS", width: 9 },
    { header: "20×1", key: "VEINTEX1", width: 9 },
    { header: "Moños (Ext)", key: "EXTRA", width: 12 },
    { header: "Moños", key: "MONOS", width: 9 },
    { header: "Moñitos", key: "MONITOS", width: 9 },
    { header: "Industrial", key: "INDUSTRIAL", width: 10 },
    { header: "Cubitos por taco", key: "cpt", width: 14 },
    { header: "General por taco", key: "gpt", width: 14 },
    { header: "% Elegida", key: "pe", width: 10 },
    { header: "% Común", key: "pc", width: 10 },
    { header: "Kg terminados", key: "kgt", width: 13 },
    { header: "Ingresos", key: "ing", width: 14 },
    { header: "Costos operativos", key: "cos", width: 16 },
    { header: "Precio solicitado", key: "sol", width: 14 },
    { header: "Precio Límite de Compra", key: "lim", width: 18 },
    { header: "Precio Recomendado", key: "rec", width: 16 },
    { header: "Versión config.", key: "cv", width: 12 },
  ];
  encabezado(h);
  for (const p of partidas) {
    const r = p.resultado;
    h.addRow({
      numero: p.numero,
      fecha: p.fecha,
      productor: p.productor,
      tacos: n(r.tacos),
      kg: n(r.kgBruto),
      ...Object.fromEntries(Object.entries(p.input.bolsas).map(([k, v]) => [k, n(v) ?? 0])),
      cpt: n(r.cubitosPorTaco),
      gpt: n(r.generalPorTaco),
      pe: r.pctElegida ? Number(r.pctElegida) / 100 : null,
      pc: r.pctComun ? Number(r.pctComun) / 100 : null,
      kgt: n(r.kgTerminados),
      ing: n(r.ingresos),
      cos: n(r.costosOperativos),
      sol: n(r.precioSolicitado),
      lim: n(r.precioLimite),
      rec: n(r.recomendado.precio),
      cv: p.configVersion,
    });
  }
  for (const k of ["cpt", "gpt"]) h.getColumn(k).numFmt = "0.0000";
  for (const k of ["pe", "pc"]) h.getColumn(k).numFmt = "0.00%";
  for (const k of ["ing", "cos", "sol", "lim", "rec"]) h.getColumn(k).numFmt = PESOS;
  return libro.xlsx.writeBuffer();
}

/** Una partida completa, con la configuración que se usó (pantalla de detalle). */
export async function excelPartida(p: Partida) {
  const libro = await nuevoLibro();
  const r = p.resultado;
  const h = libro.addWorksheet(`Partida ${p.numero}`);
  h.columns = [{ width: 36 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
  const titulo = (t: string) => {
    h.addRow([t]).font = { bold: true, size: 13, color: { argb: "FF1F4BFF" } };
  };
  const fila = (t: string, v: unknown, formato?: string) => {
    const f = h.addRow([t, v]);
    if (formato) f.getCell(2).numFmt = formato;
  };
  titulo(`Rendición — Partida ${p.numero}`);
  fila("Productor", p.productor);
  fila("Fecha", fechaCorta(p.fecha));
  fila("Tacos", n(r.tacos));
  fila("Kg brutos", n(r.kgBruto));
  fila("Peso promedio por taco", n(r.pesoPromedioTaco), "0.00");
  fila("Configuración usada", `Versión ${p.configVersion}`);
  h.addRow([]);
  titulo("Precios");
  fila("Precio solicitado ($/kg)", n(r.precioSolicitado), PESOS);
  fila("Precio Límite de Compra ($/kg)", n(r.precioLimite), PESOS);
  fila("Precio Recomendado ($/kg)", n(r.recomendado.precio), PESOS);
  h.addRow([]);
  titulo("Planilla de rendición");
  fila("Cubitos por taco", n(r.cubitosPorTaco), "0.0000");
  fila("General por taco", n(r.generalPorTaco), "0.0000");
  fila("% Elegida", r.pctElegida ? Number(r.pctElegida) / 100 : null, "0.00%");
  fila("% Común", r.pctComun ? Number(r.pctComun) / 100 : null, "0.00%");
  fila("Bolsas físicas", n(r.bolsasFisicas));
  fila("Kg terminados", n(r.kgTerminados));
  fila("Kg Elegida", n(r.kgElegida));
  fila("Kg Común", n(r.kgComun));
  fila("Kg producidos por taco", n(r.kgPorTaco), "0.00");
  fila("Diferencia kg brutos − terminados", n(r.kgPerdida), "0.00");
  h.addRow([]);
  titulo("Rendimiento óptimo (escalado al peso real)");
  fila("Kg Elegida esperados", n(r.optimo.kgElegida), "0.00");
  fila("Kg Común esperados", n(r.optimo.kgComun), "0.00");
  fila("Kg descarte esperado", n(r.optimo.kgDescarte), "0.00");
  h.addRow([]);
  titulo("Producción y economía por producto");
  h.addRow(["Producto", "Categoría", "Bolsas", "Kg", "Ingreso", "Mano de obra"]).font = { bold: true };
  for (const x of r.productos) {
    const f = h.addRow([x.nombre, x.categoria === "ELEGIDA" ? "Elegida" : "Común", n(x.bolsas), n(x.kg), n(x.ingreso), n(x.manoObra)]);
    f.getCell(5).numFmt = PESOS;
    f.getCell(6).numFmt = PESOS;
  }
  h.addRow([]);
  titulo("Resumen económico");
  fila("Ingresos totales", n(r.ingresos), PESOS);
  fila("Costo de bolsas", n(r.costoBolsas), PESOS);
  fila("Mano de obra", n(r.costoManoObra), PESOS);
  fila("Entacada", n(r.costoEntacada), PESOS);
  fila("Flete", n(r.costoFlete), PESOS);
  fila("Gastos generales", n(r.costoGastosGenerales), PESOS);
  fila(`Ganancia de la empresa (${r.gananciaPct ?? "0"} % de las ventas)`, n(r.costoGanancia ?? "0"), PESOS);
  fila("Costos operativos", n(r.costosOperativos), PESOS);
  fila("Disponible para materia prima", n(r.margenOperativo), PESOS);
  h.addRow([]);
  titulo("Fórmulas usadas");
  const formulas = (p.formulas as typeof FORMULAS) ?? FORMULAS;
  fila("Versión", formulas.version);
  for (const [k, v] of Object.entries(formulas.descripciones)) fila(k, v);

  const c = libro.addWorksheet("Configuración usada");
  c.columns = [{ width: 32 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
  const cfg = p.config;
  c.addRow(["Producto", "Presentación (kg)", "Precio de venta", "Mano de obra", "Costo de bolsa", "Categoría"]).font = { bold: true };
  for (const x of cfg.productos)
    c.addRow([
      x.nombre,
      n(x.kgBolsa),
      x.precioVenta === null ? "Por configurar" : n(x.precioVenta),
      x.manoObra === null ? "Por configurar" : n(x.manoObra),
      n(costoBolsaDe(x, cfg).toString()),
      x.categoria,
    ]);
  c.addRow([]);
  c.addRow(["Entacada por taco", n(cfg.entacadaPorTaco)]);
  c.addRow(["Flete: costo por viaje", n(cfg.flete.costoViaje)]);
  c.addRow(["Flete: tacos por viaje", n(cfg.flete.tacosPorViaje)]);
  c.addRow(["Gastos generales: modo", cfg.gastosGenerales.modo === "POR_TACO" ? "Por taco" : "Mensual"]);
  c.addRow(["Gastos generales por taco", n(r.gastosGeneralesPorTaco)]);
  c.addRow(["Ganancia de la empresa (% de las ventas)", n(cfg.gananciaPct ?? "0")]);
  c.addRow(["Taco de referencia (kg)", n(cfg.rendimientoOptimo.pesoTacoRef)]);
  c.addRow(["Elegida óptima (kg)", n(cfg.rendimientoOptimo.elegidaKg)]);
  c.addRow(["Común óptima (kg)", n(cfg.rendimientoOptimo.comunKg)]);
  c.addRow(["Descarte (kg)", n(cfg.rendimientoOptimo.descarteKg)]);
  return libro.xlsx.writeBuffer();
}

/** Estadísticas por mes y por productor. `titulo` va en la fila de totales. */
export async function excelEstadisticas(filas: FilaEstadistica[], titulo: string) {
  const libro = await nuevoLibro();
  const productos = resumen(filas).bolsas;
  const columnas = (h: import("exceljs").Worksheet, primera: string) => {
    h.columns = [
      { header: primera, key: "k", width: 24 },
      { header: "Partidas", key: "partidas", width: 9 },
      { header: "Productores", key: "productores", width: 11 },
      { header: "Tacos", key: "tacos", width: 10 },
      { header: "Kg brutos", key: "kg", width: 12 },
      ...productos.map((p) => ({ header: `Bolsas ${p.nombre}`, key: `b_${p.id}`, width: 12 })),
      { header: "General por taco", key: "gpt", width: 14 },
      { header: "Cubitos por taco", key: "cpt", width: 14 },
      { header: "% Elegida", key: "pe", width: 10 },
      { header: "% Común", key: "pc", width: 10 },
      { header: "Kg por taco", key: "kpt", width: 11 },
      { header: "Precio solicitado prom.", key: "pag", width: 18 },
      { header: "Precio límite prom.", key: "lim", width: 16 },
      { header: "Precio recomendado prom.", key: "rec", width: 18 },
      { header: "Ingresos", key: "ing", width: 15 },
      { header: "Costos operativos", key: "cos", width: 16 },
    ];
    encabezado(h);
  };
  const filaDe = (k: string, s: ReturnType<typeof resumen>) => ({
    ...Object.fromEntries(s.bolsas.map((b) => [`b_${b.id}`, n(b.bolsas)])),
    k,
    partidas: s.partidas,
    productores: s.productores,
    tacos: n(s.tacos),
    kg: n(s.kgBruto),
    gpt: n(s.generalPorTaco),
    cpt: n(s.cubitosPorTaco),
    pe: s.pctElegida ? Number(s.pctElegida) / 100 : null,
    pc: s.pctComun ? Number(s.pctComun) / 100 : null,
    kpt: n(s.kgPorTaco),
    pag: n(s.precioSolicitadoProm),
    lim: n(s.precioLimiteProm),
    rec: n(s.precioRecomendadoProm),
    ing: n(s.ingresos),
    cos: n(s.costosOperativos),
  });
  const formatos = (h: import("exceljs").Worksheet) => {
    for (const k of ["gpt", "cpt"]) h.getColumn(k).numFmt = "0.0000";
    for (const k of ["pe", "pc"]) h.getColumn(k).numFmt = "0.00%";
    for (const k of ["pag", "lim", "rec", "ing", "cos"]) h.getColumn(k).numFmt = PESOS;
  };
  const porMes = libro.addWorksheet("Por mes");
  columnas(porMes, "Mes");
  for (const [mes, fs] of [...agrupar(filas, (f) => mesDe(f.fecha))].sort()) porMes.addRow(filaDe(nombreMes(mes), resumen(fs)));
  porMes.addRow(filaDe(`TOTAL (${titulo})`, resumen(filas))).font = { bold: true };
  formatos(porMes);
  const porProductor = libro.addWorksheet("Por productor");
  columnas(porProductor, "Productor");
  for (const [prod, fs] of [...agrupar(filas, (f) => f.productor)].sort()) porProductor.addRow(filaDe(prod, resumen(fs)));
  formatos(porProductor);
  return libro.xlsx.writeBuffer();
}
