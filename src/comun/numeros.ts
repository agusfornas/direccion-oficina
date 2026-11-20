// Números: lectura de lo que escribe la gente y formato para mostrar.
//
// Todas las cuentas de plata se hacen con Decimal (decimal.js), nunca con
// números comunes de JavaScript, que redondean mal (0,1 + 0,2 = 0,30000000000000004).
import DecimalBase from "decimal.js";

export const Decimal = DecimalBase.clone({ precision: 40, rounding: DecimalBase.ROUND_HALF_UP });
export type Decimal = InstanceType<typeof Decimal>;

// HAY DOS TIPOS DE TEXTO NUMÉRICO, y no se mezclan:
//
// 1. Lo que ESCRIBE UNA PERSONA ("1.500", "1.234,5", "$ 32,5"). Se interpreta UNA sola
//    vez, con normalizarNumero(), al limpiar el formulario (funciones limpiar… de cada
//    sección). Nunca se calcula directamente con lo que escribió la persona.
// 2. Lo que YA ESTÁ LIMPIO o GUARDADO ("1500", "1234.5", "2.415"): punto decimal, sin
//    miles. Se lee con leerNumero(), que es estricto.
//
// Por qué: "2.415" puede ser "dos mil cuatrocientos quince" escrito por una persona o
// "dos coma cuatrocientos quince" calculado por el programa. Si las dos cosas pasan por
// la misma función, una de las dos sale mal. (La v1 de Transporte tenía ese error:
// un factor de desgaste "1,250" se guardaba como "1.250" y se volvía a leer como 1250.)

/**
 * Pasa un número escrito por una persona al formato que se guarda ("1234.5").
 * - Se ignoran espacios y el signo $.
 * - Con coma, la coma es el decimal y los puntos son miles: "1.234,5" → "1234.5".
 * - Sin coma, si los puntos separan grupos de 3 cifras son miles: "1.500" → "1500",
 *   "21.000" → "21000". (En la v1 de Lavadero "1.500" se leía como 1,5.)
 * - En cualquier otro caso el punto es decimal: "32.5" → "32.5".
 * Si no es un número, devuelve el texto tal cual (y la validación lo marca).
 */
export function normalizarNumero(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  let t = String(valor).trim().replace(/\s|\$/g, "");
  if (t.includes(",")) return t.replace(/\./g, "").replace(",", ".");
  if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  return t;
}

const FORMATO_LIMPIO = /^-?\d+(\.\d+)?$/;

/** Lee un número YA LIMPIO ("1234.5"). null si está vacío o no es un número. */
export function leerNumero(valor: unknown): Decimal | null {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).trim();
  return FORMATO_LIMPIO.test(t) ? new Decimal(t) : null;
}

/** Como leerNumero, pero 0 si está vacío o no es un número. */
export const numeroOCero = (valor: unknown): Decimal => leerNumero(valor) ?? new Decimal(0);

/** true si está vacío o es un número limpio válido. */
export function esNumeroOVacio(valor: unknown): boolean {
  const t = valor === null || valor === undefined ? "" : String(valor).trim();
  return t === "" || FORMATO_LIMPIO.test(t);
}

/** Para lo que escribe una persona en un solo campo (calculadoras): normaliza y lee. */
export const leerEscrito = (valor: unknown): Decimal | null => leerNumero(normalizarNumero(valor));

/** a / b, o null si b es cero. */
export const dividir = (a: Decimal, b: Decimal): Decimal | null => (b.isZero() ? null : a.div(b));

export const texto = (d: Decimal): string => d.toString();
export const textoONulo = (d: Decimal | null): string | null => (d === null ? null : d.toString());

// ---------- Formato para mostrar (es-AR) ----------

type Valor = string | number | null | undefined;

function formatear(valor: Valor, maxDecimales: number, minDecimales = maxDecimales): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return new Decimal(valor)
    .toDecimalPlaces(maxDecimales)
    .toNumber()
    .toLocaleString("es-AR", { minimumFractionDigits: minDecimales, maximumFractionDigits: maxDecimales });
}

/** $ 1.234,56 */
export const plata = (v: Valor, decimales = 2) =>
  v === null || v === undefined || v === "" ? "—" : `$ ${formatear(v, decimales)}`;
/** 0,1234 (siempre con los decimales pedidos) */
export const numeroFijo = (v: Valor, decimales = 4) => formatear(v, decimales);
/** 1.234,5 (hasta los decimales pedidos) */
export const numero = (v: Valor, decimales = 2) => formatear(v, decimales, 0);
/** 12,34 % */
export const porcentaje = (v: Valor, decimales = 2) =>
  v === null || v === undefined ? "—" : `${formatear(v, decimales)} %`;
/** +1,5 / -1,5 */
export const conSigno = (v: Valor, decimales = 2) =>
  v === null || v === undefined ? "—" : `${new Decimal(v).gt(0) ? "+" : ""}${formatear(v, decimales)}`;
/** Para Excel: número común o null. */
export const paraExcel = (v: Valor): number | null => (v === null || v === undefined || v === "" ? null : Number(v));
