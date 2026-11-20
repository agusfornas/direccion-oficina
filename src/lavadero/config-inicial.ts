// Valores con los que arranca Lavadero la primera vez (igual que la v1).
// Después se cambian desde la pantalla Configuración y quedan versionados en la base.
import type { ConfigLavadero, EntradaPartida } from "./tipos";
import { hoy } from "../comun/fechas";

export const CONFIG_INICIAL: ConfigLavadero = {
  productos: [
    { id: "CUBITOS", nombre: "Cubitos", categoria: "ELEGIDA", kgBolsa: "10", eqCubitos: "1", eqGeneral: "0.5", precioVenta: "6000", manoObra: "487", costoBolsa: "250" },
    { id: "VEINTEX1", nombre: "20×1", categoria: "ELEGIDA", kgBolsa: "20", eqCubitos: "2", eqGeneral: "1", precioVenta: "21000", manoObra: "824", costoBolsa: "1150" },
    { id: "EXTRA", nombre: "Moños (Ext)", categoria: "ELEGIDA", kgBolsa: "20", eqCubitos: "2", eqGeneral: "1", precioVenta: "19000", manoObra: "636", costoBolsa: "350" },
    { id: "MONOS", nombre: "Moños", categoria: "COMUN", kgBolsa: "20", eqCubitos: "0", eqGeneral: "1", precioVenta: null, manoObra: null, costoBolsa: "350" },
    { id: "MONITOS", nombre: "Moñitos", categoria: "COMUN", kgBolsa: "10", eqCubitos: "0", eqGeneral: "0.5", precioVenta: "3000", manoObra: "242", costoBolsa: "250" },
    { id: "INDUSTRIAL", nombre: "Industrial", categoria: "COMUN", kgBolsa: "20", eqCubitos: "0", eqGeneral: "1", precioVenta: "8000", manoObra: "411", costoBolsa: "350" },
  ],
  costoBolsa: "250",
  entacadaPorTaco: "1000",
  flete: { costoViaje: "300000", tacosPorViaje: "900" },
  gastosGenerales: { modo: "POR_TACO", porTaco: "2000", mensualTotal: "", mensualTacos: "" },
  rendimientoOptimo: { pesoTacoRef: "32", elegidaKg: "20", comunKg: "5", descarteKg: "7" },
  gananciaPct: "10",
  precioReferencia: "350",
  recomendado: {
    mezcla: "REAL",
    mezclaReferencia: { CUBITOS: "", VEINTEX1: "", EXTRA: "", MONOS: "", MONITOS: "", INDUSTRIAL: "" },
  },
};

export const bolsasVacias = (): Record<string, string> => ({
  CUBITOS: "", VEINTEX1: "", EXTRA: "", MONOS: "", MONITOS: "", INDUSTRIAL: "",
});

export const partidaVacia = (): EntradaPartida => ({
  productor: "",
  fecha: hoy(),
  pesoModo: "PROMEDIO",
  tacos: "",
  pesoPromedio: "32",
  grupos: [{ tacos: "", pesoKg: "32" }],
  precioSolicitado: "",
  precioPagado: "",
  bolsas: bolsasVacias(),
  notas: "",
});
