// Pantalla "Estadísticas" de Transporte: totales del día, mes o año y evolución mensual.
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { descargar } from "../../comun/servidor";
import { fechaCorta, hoy, MESES } from "../../comun/fechas";
import { COLOR, TICK } from "../../comun/graficos";
import { numero, plata, porcentaje } from "../../comun/numeros";
import { avisar, Campo, Cargando, Kpi, mensajeDe, Opciones, useCarga } from "../../comun/ui";
import { resumenViajes } from "../calculo";
import * as datos from "../datos";
import { excelViajes } from "../excel";

const dos = (n: number) => String(n).padStart(2, "0");
type Periodo = "DIA" | "MES" | "ANIO";

export function EstadisticasTransporte() {
  const ahora = new Date();
  const { datos: viajes, error } = useCarga(datos.viajes, []);
  const [periodo, setPeriodo] = useState<Periodo>("MES");
  const [dia, setDia] = useState(hoy());
  const [mes, setMes] = useState(String(ahora.getMonth() + 1));
  const [anio, setAnio] = useState(String(ahora.getFullYear()));

  const anios = useMemo(
    () => [...new Set([String(ahora.getFullYear()), ...(viajes ?? []).map((v) => v.input.fecha.slice(0, 4))])].sort().reverse(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viajes],
  );
  const anioGrafico = periodo === "DIA" ? dia.slice(0, 4) : anio;
  const delPeriodo = useMemo(
    () =>
      (viajes ?? []).filter((v) => {
        const f = v.input.fecha;
        return periodo === "DIA" ? f === dia : periodo === "MES" ? f.slice(0, 7) === `${anio}-${dos(Number(mes))}` : f.slice(0, 4) === anio;
      }),
    [viajes, periodo, dia, mes, anio],
  );
  const total = resumenViajes(delPeriodo);
  const titulo = periodo === "DIA" ? `Día ${fechaCorta(dia)}` : periodo === "MES" ? `${MESES[Number(mes) - 1]} ${anio}` : `Año ${anio}`;
  const grafico = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const clave = `${anioGrafico}-${dos(i + 1)}`;
        const s = resumenViajes((viajes ?? []).filter((v) => v.input.fecha.slice(0, 7) === clave));
        return { mes: MESES[i].slice(0, 3), Facturación: s.facturacion, Gastos: s.gastos, Ganancia: s.ganancia, viajes: s.viajes };
      }),
    [viajes, anioGrafico],
  );
  const hayDatos = grafico.some((g) => g.viajes > 0);
  const exportar = async () => {
    try {
      await descargar(`transporte-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx`, await excelViajes(delPeriodo, `Transporte · ${titulo}`));
    } catch (e) {
      avisar(mensajeDe(e));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Estadísticas</h1>
          <p>Transporte</p>
        </div>
        <div className="acciones">
          <button className="btn" onClick={exportar} disabled={!delPeriodo.length}>
            Exportar a Excel
          </button>
        </div>
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <Opciones etiqueta="Período" value={periodo} onChange={setPeriodo} options={[["DIA", "Día"], ["MES", "Mes"], ["ANIO", "Año"]]} />
        </div>
        <div className="grid g3 mt">
          {periodo === "DIA" && <Campo label="Día">{(id) => <input id={id} type="date" value={dia} onChange={(e) => setDia(e.target.value)} />}</Campo>}
          {periodo === "MES" && (
            <Campo label="Mes">
              {(id) => (
                <select id={id} value={mes} onChange={(e) => setMes(e.target.value)}>
                  {MESES.map((m, i) => (
                    <option key={m} value={String(i + 1)}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
          )}
          {periodo !== "DIA" && (
            <Campo label="Año">
              {(id) => (
                <select id={id} value={anio} onChange={(e) => setAnio(e.target.value)}>
                  {anios.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              )}
            </Campo>
          )}
        </div>
      </div>
      {!viajes ? (
        <Cargando error={error} />
      ) : (
        <>
          <div className="card">
            <div className="card-head">
              <h2>{titulo}</h2>
              <span className="sub">{`${total.viajes} viaje${total.viajes === 1 ? "" : "s"}`}</span>
            </div>
            <div className="kpis tres dos-movil">
              <Kpi t="Viajes" v={numero(String(total.viajes), 0)} />
              <Kpi t="Km" v={numero(String(total.km), 0)} />
              <Kpi t="Facturación" v={plata(String(total.facturacion), 0)} s="Vueltas completas (+ IVA si se tildó)" />
              <Kpi t="Gastos" v={plata(String(total.gastos), 0)} />
              <Kpi
                t="Ganancia"
                v={plata(String(total.ganancia), 0)}
                s={total.gananciaPct === null ? undefined : `${porcentaje(String(total.gananciaPct), 1)} de la facturación`}
                accent
              />
              <Kpi t="Ganancia por km" v={plata(total.gananciaKm === null ? null : String(total.gananciaKm))} />
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <h2>Evolución mensual</h2>
              <span className="sub">{anioGrafico}</span>
            </div>
            {hayDatos ? (
              <div className="chart-box" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafico} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={COLOR.grilla} vertical={false} />
                    <XAxis dataKey="mes" tick={TICK} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ ...TICK, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                      tickFormatter={(v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v))}
                    />
                    <Tooltip
                      formatter={(v) => plata(String(Number(v)), 0)}
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)" }}
                      cursor={{ fill: "var(--blue-soft)", fillOpacity: 0.6 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                    <Bar dataKey="Facturación" fill={COLOR.navy} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="Gastos" fill="var(--ink-3)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="Ganancia" fill={COLOR.azul} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="vacio">Sin viajes en {anioGrafico}.</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
