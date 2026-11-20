// Pantalla "Historial": lista de partidas con filtros y exportación a Excel.
import { useEffect, useState } from "react";
import { descargar } from "../../comun/claude";
import { fechaCorta, MESES } from "../../comun/fechas";
import { numero } from "../../comun/numeros";
import { avisar, Campo, Cargando, FilaLink, mensajeDe } from "../../comun/ui";
import * as datos from "../datos";
import { excelPartidas } from "../excel";
import type { Partida } from "../tipos";

export function Historial() {
  const [filtros, setFiltros] = useState<datos.Filtros>({});
  const [lista, setLista] = useState<Partida[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(
      () =>
        datos
          .partidas(filtros)
          .then((l) => (setLista(l), setError(null)))
          .catch((e) => setError(mensajeDe(e))),
      200,
    );
    return () => clearTimeout(t);
  }, [filtros]);
  const poner = (k: keyof datos.Filtros, v: string) => setFiltros((f) => ({ ...f, [k]: v }));
  const anios = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));
  const exportar = async () => {
    try {
      await descargar("partidas.xlsx", await excelPartidas(await datos.partidas(filtros)));
    } catch (e) {
      avisar(mensajeDe(e));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Historial</h1>
        </div>
        <div className="acciones">
          <button className="btn" onClick={exportar}>
            Exportar a Excel
          </button>
        </div>
      </div>
      <div className="card">
        <div className="grid filtros">
          <Campo label="Productor">
            {(id) => <input id={id} type="search" value={filtros.productor ?? ""} onChange={(e) => poner("productor", e.target.value)} placeholder="Buscar productor…" />}
          </Campo>
          <Campo label="Desde">{(id) => <input id={id} type="date" value={filtros.desde ?? ""} onChange={(e) => poner("desde", e.target.value)} />}</Campo>
          <Campo label="Hasta">{(id) => <input id={id} type="date" value={filtros.hasta ?? ""} onChange={(e) => poner("hasta", e.target.value)} />}</Campo>
          <Campo label="Mes">
            {(id) => (
              <select id={id} value={filtros.mes ?? ""} onChange={(e) => poner("mes", e.target.value)}>
                <option value="">Todos</option>
                {MESES.map((m, i) => (
                  <option key={m} value={String(i + 1)}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo label="Año">
            {(id) => (
              <select id={id} value={filtros.anio ?? ""} onChange={(e) => poner("anio", e.target.value)}>
                <option value="">Todos</option>
                {anios.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            )}
          </Campo>
        </div>
        {Object.values(filtros).some(Boolean) && (
          <button className="btn sm ghost mt-s" onClick={() => setFiltros({})}>
            Quitar filtros
          </button>
        )}
      </div>
      <div className="card">
        <div className="card-head">
          <h2>Partidas</h2>
          <span className="sub">{lista ? `${lista.length} partida${lista.length === 1 ? "" : "s"}` : ""}</span>
        </div>
        {!lista ? (
          <Cargando error={error} />
        ) : lista.length === 0 ? (
          <div className="vacio">
            No hay partidas con estos filtros. <a href="#nueva">Cargar una nueva partida</a>
          </div>
        ) : (
          <div className="tabla-wrap">
            <table className="lista-partidas">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Productor</th>
                  <th className="r">Tacos</th>
                  <th className="r">Kg totales</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <FilaLink key={p.id} hash={`#historial-${p.id}`} etiqueta={`Partida de ${p.productor} del ${fechaCorta(p.fecha)}`}>
                    <td>{fechaCorta(p.fecha)}</td>
                    <td className="nombre">{p.productor}</td>
                    <td className="r">{numero(p.resultado.tacos)}</td>
                    <td className="r">{numero(p.resultado.kgBruto, 0)}</td>
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
