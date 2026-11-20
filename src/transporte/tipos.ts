// Forma de los datos de Transporte. Es LA MISMA que en la v1 (para poder mudar los datos
// copiándolos tal cual); solo se agregaron campos opcionales (rev, quien).
// Todos los números se guardan como texto ("1234.5").

export interface ConfigTransporte {
  /** $ por litro de gasoil. */
  precioGasoil: string;
  /** Litros cada 100 km. */
  consumoL100: string;
  /** Multiplica los litros para cubrir desgaste (cubiertas, service…). Ej: 1.5 */
  factorDesgaste: string;
  /** % del flete que se lleva el chofer. */
  choferPct: string;
  ivaPct: string;
}

export interface VersionConfigTransporte {
  version: number;
  creado: string;
  nota: string;
  config: ConfigTransporte;
  quien?: string | null;
}

export interface EntradaViaje {
  fecha: string;
  chofer: string;
  camion: string;
  origen: string;
  destino: string;
  fleteIda: string;
  fleteVuelta: string;
  km: string;
  peaje: string;
  otros: string;
  observaciones: string;
  /** Si se le suma IVA a lo cobrado. */
  conIva?: boolean;
}

export interface ResultadoViaje {
  vuelta: string;
  iva: string;
  cobrado: string;
  km: string;
  litros: string | null;
  litrosDesgaste: string | null;
  gastoCamion: string | null;
  chofer: string;
  peaje: string;
  otros: string;
  gastos: string | null;
  ganancia: string | null;
  gananciaPct: string | null;
  gananciaKm: string | null;
  faltantes: string[];
}

/** Un viaje tal como se guarda (colección "tviajes", documento "v<id>"). */
export interface Viaje {
  id: number;
  numero: number;
  creado: string;
  actualizado: string;
  configVersion: number;
  config: ConfigTransporte;
  input: EntradaViaje;
  resultado: ResultadoViaje;
  eliminado: boolean;
  rev?: number;
  /** Historial de cambios (v2 en adelante). */
  auditoria?: { accion: "crear" | "modificar" | "eliminar"; fecha: string; quien?: string | null }[];
}
