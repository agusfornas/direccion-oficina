// Forma de los datos de Lavadero. Es LA MISMA que en la v1 (para poder mudar los datos
// copiándolos tal cual); solo se agregaron campos opcionales (rev, auditoria[].quien).
// Todos los números se guardan como texto ("1234.5") para no perder precisión.

export type Categoria = "ELEGIDA" | "COMUN";
export type IdProducto = "CUBITOS" | "VEINTEX1" | "EXTRA" | "MONOS" | "MONITOS" | "INDUSTRIAL";

export interface Producto {
  id: IdProducto;
  nombre: string;
  categoria: Categoria;
  /** Kg que trae una bolsa de esta presentación. */
  kgBolsa: string;
  /** Equivalencia en "cubitos" (para el índice cubitos por taco). */
  eqCubitos: string;
  /** Equivalencia general (para el índice general por taco y los %). */
  eqGeneral: string;
  /** Precio de venta por bolsa. null = sin configurar. */
  precioVenta: string | null;
  /** Mano de obra por bolsa. null = sin configurar. */
  manoObra: string | null;
  /** Costo de la bolsa vacía de este producto. null = usa el costo general. */
  costoBolsa?: string | null;
}

export interface ConfigLavadero {
  productos: Producto[];
  gananciaPct: string;
  /** Costo de bolsa general (si el producto no tiene el suyo). */
  costoBolsa: string;
  entacadaPorTaco: string;
  precioReferencia: string;
  flete: { costoViaje: string; tacosPorViaje: string };
  gastosGenerales: { modo: "POR_TACO" | "MENSUAL"; porTaco: string; mensualTotal: string; mensualTacos: string };
  /** El taco "óptimo" de referencia: cuántos kg de cada categoría rinde. */
  rendimientoOptimo: { pesoTacoRef: string; elegidaKg: string; comunKg: string; descarteKg: string };
  recomendado: {
    /** REAL = valuar el óptimo con la mezcla de la partida; CONFIGURADA = con mezclaReferencia. */
    mezcla: "REAL" | "CONFIGURADA";
    mezclaReferencia: Record<string, string>;
  };
}

export interface VersionConfig {
  version: number;
  creado: string;
  nota: string;
  config: ConfigLavadero;
  quien?: string | null;
}

/** Lo que se carga en el formulario de una partida. */
export interface EntradaPartida {
  productor: string;
  fecha: string;
  pesoModo: "PROMEDIO" | "GRUPOS";
  tacos: string;
  pesoPromedio: string;
  grupos: { tacos: string; pesoKg: string }[];
  precioSolicitado: string;
  precioPagado: string;
  bolsas: Record<string, string>;
  notas: string;
}

export type EstadoCompra = "MARGEN" | "EQUILIBRIO" | "PERDIDA";

export interface ResultadoProducto {
  id: string;
  nombre: string;
  categoria: Categoria;
  bolsas: string;
  kg: string;
  ingreso: string | null;
  manoObra: string | null;
  costoBolsas: string;
  netoPorBolsa: string | null;
}

export interface Recomendado {
  valorNetoReal: string | null;
  comunExcedenteKg: string | null;
  valorNetoOptimo: string | null;
  factorRendimiento: string | null;
  factorAplicado: string | null;
  descuentoPorKg: string | null;
  limiteOptimo: string | null;
  referenciaAlta: boolean;
  precioBase: string | null;
  base: "LIMITE" | "PEDIDO";
  precioPorRendimiento: string | null;
  precio: string | null;
  limitadoPorSolicitado: boolean;
  limitadoPor: "LIMITE" | "SOLICITADO" | null;
  motivoNoDisponible: string | null;
}

export interface ResultadoPartida {
  tacos: string;
  kgBruto: string;
  pesoPromedioTaco: string | null;
  eqCubitos: string;
  eqGeneral: string;
  eqElegida: string;
  eqComun: string;
  cubitosPorTaco: string | null;
  generalPorTaco: string | null;
  pctElegida: string | null;
  pctComun: string | null;
  bolsasFisicas: string;
  kgTerminados: string;
  kgElegida: string;
  kgComun: string;
  kgPorTaco: string | null;
  kgPerdida: string;
  pctPerdida: string | null;
  optimo: {
    kgElegida: string;
    kgComun: string;
    kgDescarte: string;
    kgElegidaPorTaco: string | null;
    kgComunPorTaco: string | null;
    difKgElegida: string;
    difKgComun: string;
  };
  productos: ResultadoProducto[];
  faltantes: string[];
  ingresos: string | null;
  costoBolsas: string;
  costoManoObra: string | null;
  costoEntacada: string;
  costoFlete: string;
  fletePorTaco: string | null;
  costoGastosGenerales: string;
  costoGanancia: string | null;
  gananciaPct: string;
  gastosGeneralesPorTaco: string | null;
  costosOperativos: string | null;
  margenOperativo: string | null;
  precioLimite: string | null;
  recomendado: Recomendado;
  precioSolicitado: string | null;
  difSolicitadoLimite: string | null;
  difSolicitadoRecomendado: string | null;
  difRecomendadoLimite: string | null;
  estadoCompra: EstadoCompra | null;
}

export interface Auditoria {
  accion: "crear" | "modificar" | "eliminar";
  detalle: Record<string, unknown>;
  fecha: string;
  /** Id de la persona (v2 en adelante). */
  quien?: string | null;
}

/** Una partida tal como se guarda en la base (colección "partidas", documento "p<id>"). */
export interface Partida {
  id: number;
  numero: string;
  productorId: number;
  productor: string;
  fecha: string;
  input: EntradaPartida;
  configVersionId: number;
  configVersion: number;
  /** Copia de la configuración con la que se calculó (los cálculos viejos no cambian). */
  config: ConfigLavadero;
  formulas: unknown;
  resultado: ResultadoPartida;
  creado: string;
  actualizado: string;
  eliminada: boolean;
  auditoria: Auditoria[];
  rev?: number;
}
