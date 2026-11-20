// Pantalla "Historial" de Transporte: lista de viajes con buscador.
import { useMemo, useState } from "react";
import { fechaCorta } from "../../comun/fechas";
import { plata } from "../../comun/numeros";
import { Campo, Cargando, FilaLink, useCarga } from "../../comun/ui";
import * as datos from "../datos";

export function HistorialViajes() {
  const { datos: viajes, error } = useCarga(datos.viajes, []);
  const [busqueda, setBusqueda] = useState("");
  const lista = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!viajes || !t) return viajes;
    return viajes.filter((v) =>
      [v.input.destino, v.input.origen, v.input.chofer, v.input.camion, v.input.observaciones, fechaCorta(v.input.fecha)].some((x) =>
        (x ?? "").toLowerCase().includes(t),
      ),
    );
  }, [viajes, busqueda]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Historial</h1>
          <p>Transporte</p>
        </div>
        <div className="acciones">
          <a className="btn primary" href="#t-nuevo">
            Nuevo viaje
          </a>
        </div>
      </div>
      <div className="card">
        <Campo label="Buscar">
          {(id) => <input id={id} type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Destino, origen, unidad…" />}
        </Campo>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>Viajes</h2>
          <span className="sub">{lista ? `${lista.length} viaje${lista.length === 1 ? "" : "s"}` : ""}</span>
        </div>
        {!lista ? (
          <Cargando error={error} />
        ) : lista.length === 0 ? (
          <div className="vacio">
            No hay viajes{busqueda ? " con esa búsqueda" : ""}. <a href="#t-nuevo">Cargar un viaje</a>
          </div>
        ) : (
          <div className="tabla-wrap">
            <table className="lista-partidas lista-viajes">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Destino</th>
                  <th className="r">Vuelta</th>
                  <th className="r">Gastos</th>
                  <th className="r">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => (
                  <FilaLink key={v.id} hash={`#t-historial-${v.id}`} etiqueta={`Viaje a ${v.input.destino} del ${fechaCorta(v.input.fecha)}`}>
                    <td>{fechaCorta(v.input.fecha)}</td>
                    <td className="nombre">{v.input.destino}</td>
                    <td className="r">{plata(v.resultado.vuelta, 0)}</td>
                    <td className="r">{plata(v.resultado.gastos, 0)}</td>
                    <td className={`r ${v.resultado.ganancia !== null && Number(v.resultado.ganancia) < 0 ? "neg" : ""}`}>
                      <b>{plata(v.resultado.ganancia, 0)}</b>
                    </td>
                  </FilaLink>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
