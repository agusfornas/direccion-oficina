// Panel de resultado de un viaje: ganancia, rendición, datos rápidos y la cuenta del camión.
import { Kpi, useDesplegable } from "../../comun/ui";
import { numero, numeroFijo, plata, porcentaje } from "../../comun/numeros";
import { ivaDe } from "../calculo";
import type { ConfigTransporte, ResultadoViaje } from "../tipos";

const $ = (v: string | number | null | undefined, d = 2) => plata(v === null || v === undefined ? null : String(v), d);
const n1 = (v: string | number | null | undefined, d = 1) => numeroFijo(v === null || v === undefined ? null : String(v), d);
const negativo = (v: string | null) => (v !== null && Number(v) < 0 ? "neg" : "");
/** 21 → "21", 10,5 → "10,5" */
export const ivaTexto = (c: ConfigTransporte) => n1(ivaDe(c), 1).replace(/,0$/, "");

/** Explicación de la ganancia (y cuánto habría que cobrar para no perder). */
export function explicarGanancia(r: ResultadoViaje, c: ConfigTransporte): string[] {
  const ganancia = Number(r.ganancia);
  const cobrado = Number(r.cobrado ?? r.vuelta);
  const conIva = Number(r.iva ?? 0) > 0;
  if (ganancia >= 0) return [`Cobraste ${$(cobrado, 0)}${conIva ? " (con IVA)" : ""} y te quedaron ${$(ganancia, 0)} limpios.`];
  const gastosFijos = Number(r.gastoCamion ?? 0) + Number(r.peaje) + Number(r.otros);
  const parteQueQueda = 1 + (conIva ? ivaDe(c) / 100 : 0) - Number(c.choferPct || 0) / 100;
  const t = [`Cobraste ${$(cobrado, 0)}${conIva ? " (con IVA)" : ""} y gastaste ${$(r.gastos, 0)}: perdiste ${$(-ganancia, 0)}.`];
  if (parteQueQueda > 0)
    t.push(`Para no perder, la vuelta completa tiene que ser de al menos ${$(gastosFijos / parteQueQueda, 0)}${conIva ? " sin IVA" : ""}.`);
  return t;
}

export function ResultadoViajeVista({ r, cfg }: { r: ResultadoViaje; cfg: ConfigTransporte }) {
  const hayKm = Number(r.km) > 0;
  const completo = r.ganancia !== null && Number(r.vuelta) > 0 && hayKm;
  const [abierta, propsDesplegable] = useDesplegable();
  const conIva = Number(r.iva ?? 0) > 0;
  return (
    <div>
      {r.faltantes.length > 0 && (
        <div className="aviso warn mb">
          <span>
            Falta configurar {r.faltantes.join(" y ")} en <a href="#t-configuracion">Configuración de Transporte</a>.
          </span>
        </div>
      )}
      <div
        className={`precio-card ${r.ganancia !== null && Number(r.ganancia) < 0 ? "" : "blue"} ${completo ? "clic" : ""}`}
        {...(completo ? propsDesplegable : {})}
      >
        <div className="t">Ganancia del viaje</div>
        <div className="v">{$(r.ganancia)}</div>
        <div className="d">
          {r.ganancia === null || !(Number(r.vuelta) > 0) || !hayKm
            ? "Completá el flete y los km para calcularla."
            : Number(r.ganancia) < 0
              ? "Perdiste plata en este viaje."
              : "Lo que te queda limpio del viaje."}
        </div>
        {completo &&
          (abierta ? (
            <div className="exp">
              {explicarGanancia(r, cfg).map((t, i) => (
                <p key={i}>{t}</p>
              ))}
              <span className="exp-hint">Ver menos</span>
            </div>
          ) : (
            <span className="exp-hint">Ver más</span>
          ))}
      </div>
      <div className="card mt">
        <div className="card-head">
          <h2>Rendición del viaje</h2>
        </div>
        <div className="kpis tres dos-movil">
          <Kpi t="Vuelta completa" v={$(r.vuelta, 0)} s="Flete de ida + vuelta, sin IVA" accent />
          {conIva && <Kpi t={`IVA (${ivaTexto(cfg)} %)`} v={$(r.iva, 0)} s="Se suma a la ganancia" accent />}
          <Kpi t="Gasto del camión" v={$(r.gastoCamion, 0)} s="Gasoil con desgaste" />
          <Kpi t="Chofer" v={$(r.chofer, 0)} s={`${porcentaje(cfg.choferPct, 0)} de la vuelta`} />
          <Kpi t="Peaje" v={$(r.peaje, 0)} />
          <Kpi t="Otros gastos" v={$(r.otros, 0)} />
          <Kpi t="Gastos totales" v={$(r.gastos, 0)} />
        </div>
      </div>
      {completo && (
        <div className="card">
          <div className="card-head">
            <h2>Datos rápidos</h2>
          </div>
          <div className="kpis tres dos-movil">
            <Kpi t="Queda limpio" v={porcentaje(r.gananciaPct, 1)} s={`De lo que cobraste (${$(r.cobrado ?? r.vuelta, 0)}), esta parte es ganancia.`} />
            <Kpi t="Ganancia por km" v={$(r.gananciaKm, 0)} s={`Ganancia ÷ ${numero(r.km, 0)} km. Sirve para comparar viajes.`} />
          </div>
        </div>
      )}
      <div className="card">
        <details>
          <summary>Gasto del camión, paso a paso</summary>
          <div className="resumen-cuerpo calc-como">
            {!hayKm || r.litros === null ? (
              <p className="muted">Cargá los km y el consumo para ver la cuenta.</p>
            ) : (
              <>
                <p>
                  {`1. Litros: ${n1(r.km, 0)} km ÷ 100 × ${n1(cfg.consumoL100, 1)} L/100 km = `}
                  <b>{`${n1(r.litros, 1)} L`}</b>
                </p>
                <p>
                  {`2. Con desgaste: ${n1(r.litros, 1)} L × ${n1(cfg.factorDesgaste, 2)} = `}
                  <b>{`${n1(r.litrosDesgaste, 1)} L`}</b>
                </p>
                <p>
                  {`3. En pesos: ${n1(r.litrosDesgaste, 1)} L × ${$(cfg.precioGasoil)} el litro = `}
                  <b>{$(r.gastoCamion)}</b>
                </p>
                <p className="muted">El factor de desgaste cubre desgaste, seguro, cubiertas y otros gastos del camión.</p>
              </>
            )}
            <p className="mt">
              <b>Gastos totales</b> = camión {$(r.gastoCamion, 0)} + peaje {$(r.peaje, 0)} + chofer {$(r.chofer, 0)} + otros {$(r.otros, 0)} ={" "}
              <b>{$(r.gastos, 0)}</b>
            </p>
            <p>
              <b>Ganancia</b> = {conIva ? `vuelta ${$(r.vuelta, 0)} + IVA ${$(r.iva, 0)}` : `vuelta ${$(r.vuelta, 0)}`} − gastos {$(r.gastos, 0)} ={" "}
              <b className={negativo(r.ganancia)}>{$(r.ganancia, 0)}</b>
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
