// Excel: la librería (ExcelJS, ~1 MB) se baja recién la primera vez que alguien exporta.
// En la v1 se cargaba siempre, y era el 80 % del peso de la app.
import type { Worksheet } from "exceljs";

export async function nuevoLibro() {
  const ExcelJS = (await import("exceljs")).default;
  return new ExcelJS.Workbook();
}

/** Encabezado azul oscuro y primera fila fija. */
export function encabezado(hoja: Worksheet) {
  const fila = hoja.getRow(1);
  fila.font = { bold: true, color: { argb: "FFFFFFFF" } };
  fila.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1B3F" } };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
}

export const PESOS = '"$"#,##0.00';
