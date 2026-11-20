// Fechas. Siempre en la hora de la computadora de quien usa la app.
//
// En la v1 se usaba new Date().toISOString(), que da la hora de Londres (UTC):
// en Argentina, todo lo cargado después de las 21 h quedaba con la fecha del día siguiente.

const dosCifras = (n: number) => String(n).padStart(2, "0");

/** Hoy, como "2026-11-20". */
export function hoy(fecha = new Date()): string {
  return `${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}`;
}

/** Ahora, como "2026-11-20 21:45:03" (hora local). Es el formato de los registros guardados. */
export function ahora(fecha = new Date()): string {
  return `${hoy(fecha)} ${dosCifras(fecha.getHours())}:${dosCifras(fecha.getMinutes())}:${dosCifras(fecha.getSeconds())}`;
}

/** "2026-11-20" → "20/11/2026" */
export const fechaCorta = (f: string | null | undefined) =>
  f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : "";

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** "2026-11" o "2026-11-20" → "Noviembre 2026" */
export const nombreMes = (f: string) => `${MESES[Number(f.slice(5, 7)) - 1]} ${f.slice(0, 4)}`;

/** "2026-11-20" → "2026-11" */
export const mesDe = (f: string) => f.slice(0, 7);

/** Agrupa una lista según una clave. */
export function agrupar<T>(lista: T[], clave: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of lista) {
    const k = clave(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(x);
  }
  return m;
}
