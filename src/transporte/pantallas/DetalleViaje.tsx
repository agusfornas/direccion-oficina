// Pantalla de un viaje guardado (#t-historial-7).
import { useEffect, useState } from "react";
import { Cambios } from "../../comun/Cambios";
import { fechaCorta } from "../../comun/fechas";
import { numero, numeroFijo, plata, porcentaje } from "../../comun/numeros";
import { avisar, BotonEliminar, Cargando, ir, Kpi, mensajeDe } from "../../comun/ui";
import * as datos from "../datos";
import type { Viaje } from "../tipos";
import { repetirViaje } from "./NuevoViaje";
import { ivaTexto, ResultadoViajeVista } from "./ResultadoViaje";

export function DetalleViaje({ id }: { id: number }) {
  const [v, setV] = useState<Viaje | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    datos
      .viaje(id)
      .then(setV)
      .catch((e) => setError(mensajeDe(e)));
  }, [id]);
  if (v === undefined) return <Cargando error={error} />;
  if (v === null)
    return (
      <div className="vacio">
        El viaje no existe. <a href="#t-historial">Volver al historial</a>
      </div>
    );
  const e = v.input;
  const ruta = [e.origen, e.destino].filter(Boolean).join(" → ");
  return (
    <>
      <div className="page-head">
        <div>
          <a href="#t-historial" className="btn sm ghost" style={{ marginLeft: -10 }}>
            ← Historial
          </a>
          <h1>{ruta || e.destino}</h1>
          <p>
            {fechaCorta(e.fecha)} · {numero(v.resultado.km, 0)} km{e.chofer ? ` · ${e.chofer}` : ""}
            {e.camion ? ` · Unidad ${e.camion}` : ""}
          </p>
        </div>
        <div className="acciones">
          <button className="btn primary" onClick={() => repetirViaje(e)}>
            Duplicar
          </button>
          <button className="btn" onClick={() => ir(`#t-editar-${v.id}`)}>
            Corregir
          </button>
          <BotonEliminar
            onEliminar={async () => {
              await datos.eliminarViaje(v.id, v.rev ?? 0);
              avisar("Viaje eliminado");
              ir("#t-historial");
            }}
          />
        </div>
      </div>
      <ResultadoViajeVista r={v.resultado} cfg={v.config} />
      <div className="card">
        <div className="card-head">
          <h2>Datos cargados</h2>
        </div>
        <div className="kpis tres dos-movil">
          <Kpi t="Flete de ida" v={plata(e.fleteIda, 0)} />
          <Kpi t="Flete de vuelta" v={plata(e.fleteVuelta || "0", 0)} />
          <Kpi t="Km totales" v={numero(v.resultado.km, 0)} />
          {e.conIva && <Kpi t="IVA" v={`${ivaTexto(v.config)} % sumado`} s="El chofer, sin IVA" />}
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
          Configuración usada: gasoil {plata(v.config.precioGasoil)} el litro · consumo {numeroFijo(v.config.consumoL100, 1)} L/100 km · desgaste{" "}
          {numeroFijo(v.config.factorDesgaste, 2)} · chofer {porcentaje(v.config.choferPct, 0)}.
        </p>
      </div>
      {e.observaciones && (
        <div className="card">
          <div className="lbl">Observaciones</div>
          <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{e.observaciones}</p>
        </div>
      )}
      <Cambios cambios={v.auditoria ?? []} femenino={false} />
    </>
  );
}
