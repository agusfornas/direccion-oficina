// Pantalla "Estadísticas" de Lavadero: totales del día, mes o año, gráficos por mes,
// tabla mensual y comparación por productor.
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { descargar } from "../../comun/claude";
import { agrupar, hoy, mesDe, MESES, nombreMes } from "../../comun/fechas";
import { ColumnaOrdenable, COLOR, CURSOR_BARRA, mesCorto, TICK, Tooltip } from "../../comun/graficos";
import { conSigno, numero, numeroFijo, plata, porcentaje } from "../../comun/numeros";
import { avisar, Campo, Cargando, Kpi, mensajeDe, Opciones } from "../../comun/ui";
import * as datos from "../datos";
import { paraEstadistica, resumen, type FilaEstadistica, type Resumen } from "../estadisticas";
import { excelEstadisticas } from "../excel";

const dos = (n: number) => String(n).padStart(2, "0");
const ultimoDia = (anio: number, mes: number) => `${anio}-${dos(mes)}-${dos(new Date(anio, mes, 0).getDate())}`;
type Periodo = "DIA" | "MES" | "ANIO";
type Orden = "nombre" | "partidas" | "tacos" | "kgBruto" | "generalPorTaco" | "cubitosPorTaco" | "pctElegida" | "pctComun" | "precioSolicitadoProm" | "precioRecomendadoProm";

export function Estadisticas() {
  const ahora = new Date();
  const [periodo, setPeriodo] = useState<Periodo>("MES");
  const [dia, setDia] = useState(hoy());
  const [anio, setAnio] = useState(String(ahora.getFullYear()));
  const [mes, setMes] = useState(String(ahora.getMonth() + 1));
  const [productor, setProductor] = useState("");
  const [productores, setProductores] = useState<{ id: number; nombre: string }[]>([]);
  const [filas, setFilas] = useState<FilaEstadistica[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orden, setOrden] = useState<{ k: Orden; asc: boolean }>({ k: "generalPorTaco", asc: false });

  const filtros = useMemo<datos.Filtros>(() => {
    const a = Number(anio);
    const base = { productor: productor || undefined };
    if (periodo === "DIA") return { ...base, desde: dia, hasta: dia };
    if (periodo === "MES") return { ...base, desde: `${a}-${dos(Number(mes))}-01`, hasta: ultimoDia(a, Number(mes)) };
    return { ...base, desde: `${a}-01-01`, hasta: `${a}-12-31` };
  }, [periodo, anio, mes, dia, productor]);

  useEffect(() => {
    datos.productores().then(setProductores).catch(() => {});
  }, []);
  useEffect(() => {
    setFilas(null);
    datos
      .partidas(filtros)
      .then((ps) => setFilas(ps.map(paraEstadistica)))
      .catch((e) => setError(mensajeDe(e)));
  }, [filtros]);

  const total = useMemo(() => (filas ? resumen(filas) : null), [filas]);
  const porMes = useMemo(
    () => (filas ? [...agrupar(filas, (f) => mesDe(f.fecha))].sort(([a], [b]) => a.localeCompare(b)).map(([m, fs]) => ({ mes: m, a: resumen(fs) })) : []),
    [filas],
  );
  const porProductor = useMemo(() => {
    if (!filas) return [];
    const lista = [...agrupar(filas, (f) => f.productor)].map(([nombre, fs]) => ({ nombre, a: resumen(fs) }));
    const valor = (x: { nombre: string; a: Resumen }) => (orden.k === "nombre" ? x.nombre : x.a[orden.k]);
    return lista.sort((x, y) => {
      const a = valor(x);
      const b = valor(y);
      const d = orden.k === "nombre" ? String(a).localeCompare(String(b)) : Number(a ?? -Infinity) - Number(b ?? -Infinity);
      return orden.asc ? d : -d;
    });
  }, [filas, orden]);
  const grafico = porMes.map(({ mes: m, a }) => ({
    mes: m,
    tacos: Number(a.tacos),
    kg: Number(a.kgBruto),
    general: a.generalPorTaco === null ? null : Number(a.generalPorTaco),
    elegida: a.pctElegida === null ? 0 : Number(a.pctElegida),
    comun: a.pctComun === null ? 0 : Number(a.pctComun),
  }));
  const anios = Array.from({ length: 6 }, (_, i) => String(ahora.getFullYear() - i));
  const titulo = periodo === "DIA" ? `Día ${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}` : periodo === "MES" ? `${MESES[Number(mes) - 1]} ${anio}` : `Año ${anio}`;
  const exportar = async () => {
    try {
      const fs = (await datos.partidas(filtros)).map(paraEstadistica);
      await descargar("estadisticas.xlsx", await excelEstadisticas(fs, Object.values(filtros).filter(Boolean).join(" · ") || "Todos los registros"));
    } catch (e) {
      avisar(mensajeDe(e));
    }
  };
  const col = (k: Orden, t: string, derecha = true) => <ColumnaOrdenable clave={k} texto={t} orden={orden} setOrden={setOrden} derecha={derecha} />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Estadísticas</h1>
          <p>Totales y promedios ponderados del día, mes o año elegido.</p>
        </div>
        <div className="acciones">
          <button className="btn" onClick={exportar}>
            Excel
          </button>
        </div>
      </div>
      <div className="card">
        <div className="row" style={{ alignItems: "flex-end", gap: 14 }}>
          <div className="campo">
            <span className="lbl">Período</span>
            <Opciones etiqueta="Período" value={periodo} onChange={setPeriodo} options={[["DIA", "Día"], ["MES", "Mes"], ["ANIO", "Año"]]} />
          </div>
          {periodo === "DIA" && <Campo label="Día">{(id) => <input id={id} type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} />}</Campo>}
          {periodo === "MES" && (
            <Campo label="Mes">
              {(id) => (
                <select id={id} value={mes} onChange={(e) => setMes(e.target.value)}>
                  {MESES.map((m, i) => (
                    <option key={m} value={i + 1}>
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
          <Campo label="Productor">
            {(id) => (
              <select id={id} value={productor} onChange={(e) => setProductor(e.target.value)}>
                <option value="">Todos</option>
                {productores.map((p) => (
                  <option key={p.id} value={p.nombre}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        </div>
      </div>
      {!filas || !total ? (
        <Cargando error={error} />
      ) : filas.length === 0 ? (
        <div className="card vacio">No hay partidas en el período seleccionado.</div>
      ) : (
        <>
          <div className="card">
            <div className="card-head">
              <h2>{titulo}</h2>
              <span className="sub">
                {total.partidas} partida{total.partidas === 1 ? "" : "s"} · {total.productores} productor{total.productores === 1 ? "" : "es"}
              </span>
            </div>
            <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <Kpi t="Total de tacos procesados" v={numero(total.tacos)} />
              <Kpi t="Kg procesados" v={numero(total.kgBruto, 0)} s="Kg brutos recibidos" />
              <Kpi t="Rendimiento general promedio" v={numeroFijo(total.generalPorTaco)} s="Por taco · equiv. bolsas de 20 kg" accent />
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <h2>Bolsas producidas</h2>
              <span className="sub">Total del período</span>
            </div>
            {(["ELEGIDA", "COMUN"] as const).map((cat) => (
              <div className="mt-s" key={cat}>
                <div className="cat-title">
                  <i className={`dot ${cat === "ELEGIDA" ? "e" : "c"}`} /> {cat === "ELEGIDA" ? "Elegida" : "Común"}
                </div>
                <div className="kpis mt-s" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                  {total.bolsas
                    .filter((b) => b.categoria === cat)
                    .map((b) => (
                      <Kpi key={b.id} t={b.nombre} v={numero(b.bolsas)} s={`bolsas · ${numero(b.kg, 0)} kg`} />
                    ))}
                </div>
              </div>
            ))}
            <div className="soft mt row" style={{ fontWeight: 700, fontSize: 14 }}>
              <span>Total: {numero(total.bolsas.reduce((s, b) => s + Number(b.bolsas), 0).toString())} bolsas</span>
              <span className="muted">·</span>
              <span>{numero(total.kgTerminados, 0)} kg terminados</span>
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <h2>Rendimiento</h2>
              <span className="sub">Ponderado</span>
            </div>
            <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              <Kpi t="Cubitos por taco" v={numeroFijo(total.cubitosPorTaco)} accent />
              <Kpi t="% Elegida" v={porcentaje(total.pctElegida)} />
              <Kpi t="% Común" v={porcentaje(total.pctComun)} />
              <Kpi t="Kg producidos por taco" v={numeroFijo(total.kgPorTaco, 2)} />
            </div>
          </div>
          <div className="grid g2 mt">
            <div className="card" style={{ margin: 0 }}>
              <div className="card-head">
                <h3>Tacos procesados por mes</h3>
              </div>
              <div className="chart-box">
                <ResponsiveContainer>
                  <BarChart data={grafico} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={COLOR.grilla} />
                    <XAxis dataKey="mes" tickFormatter={mesCorto} tick={TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={TICK} axisLine={false} tickLine={false} width={48} />
                    <RTooltip cursor={CURSOR_BARRA} content={<Tooltip fmt={(v) => numero(String(v))} />} />
                    <Bar dataKey="tacos" name="Tacos" fill={COLOR.azul} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="card-head">
                <h3>Kg brutos procesados por mes</h3>
              </div>
              <div className="chart-box">
                <ResponsiveContainer>
                  <BarChart data={grafico} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={COLOR.grilla} />
                    <XAxis dataKey="mes" tickFormatter={mesCorto} tick={TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={TICK} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => `${(v / 1000).toLocaleString("es-AR")} t`} />
                    <RTooltip cursor={CURSOR_BARRA} content={<Tooltip fmt={(v) => `${numero(String(v), 0)} kg`} />} />
                    <Bar dataKey="kg" name="Kg brutos" fill={COLOR.navy} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="card-head">
                <h3>Rendimiento general por taco, por mes</h3>
              </div>
              <div className="chart-box">
                <ResponsiveContainer>
                  <LineChart data={grafico} margin={{ top: 18, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={COLOR.grilla} />
                    <XAxis dataKey="mes" tickFormatter={mesCorto} tick={TICK} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={TICK}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => Number(v).toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                    />
                    <RTooltip cursor={{ stroke: "var(--ink-3)", strokeDasharray: "3 3" }} content={<Tooltip fmt={(v) => numeroFijo(String(v))} />} />
                    <Line
                      type="monotone"
                      dataKey="general"
                      name="General por taco"
                      stroke={COLOR.azul}
                      strokeWidth={2}
                      dot={{ r: 4, fill: COLOR.azul, stroke: COLOR.fondo, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="card-head">
                <h3>% Elegida y % Común por mes</h3>
                <div className="legend">
                  <span>
                    <i className="dot e" /> Elegida
                  </span>
                  <span>
                    <i className="dot c" /> Común
                  </span>
                </div>
              </div>
              <div className="chart-box">
                <ResponsiveContainer>
                  <BarChart data={grafico} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={COLOR.grilla} />
                    <XAxis dataKey="mes" tickFormatter={mesCorto} tick={TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <RTooltip cursor={CURSOR_BARRA} content={<Tooltip fmt={(v) => porcentaje(String(v))} />} />
                    <Bar dataKey="elegida" name="Elegida" stackId="a" fill={COLOR.azul} stroke={COLOR.fondo} strokeWidth={2} maxBarSize={36} isAnimationActive={false}>
                      {grafico.length <= 8 && (
                        <LabelList dataKey="elegida" position="center" fill="#fff" fontSize={11} fontWeight={800} formatter={(v: number) => `${Math.round(Number(v))}%`} />
                      )}
                    </Bar>
                    <Bar dataKey="comun" name="Común" stackId="a" fill={COLOR.navy} stroke={COLOR.fondo} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="card mt">
            <div className="card-head">
              <h2>Evolución mensual</h2>
              <span className="sub">Tabla de los gráficos y resultados económicos por mes</span>
            </div>
            <div className="tabla-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th className="r">Partidas</th>
                    <th className="r">Tacos</th>
                    <th className="r">Kg brutos</th>
                    <th className="r">General/taco</th>
                    <th className="r">Cubitos/taco</th>
                    <th className="r">% Elegida</th>
                    <th className="r">% Común</th>
                    <th className="r">Solicitado prom.</th>
                    <th className="r">Límite prom.</th>
                    <th className="r">Recomendado prom.</th>
                    <th className="r">Solic. − recom.</th>
                    <th className="r">Ingresos est.</th>
                    <th className="r">Costos oper. est.</th>
                  </tr>
                </thead>
                <tbody>
                  {porMes.map(({ mes: m, a }) => (
                    <tr key={m}>
                      <td>
                        <b>{nombreMes(m)}</b>
                      </td>
                      <td className="r">{a.partidas}</td>
                      <td className="r">{numero(a.tacos)}</td>
                      <td className="r">{numero(a.kgBruto, 0)}</td>
                      <td className="r">{numeroFijo(a.generalPorTaco)}</td>
                      <td className="r">{numeroFijo(a.cubitosPorTaco)}</td>
                      <td className="r">{porcentaje(a.pctElegida)}</td>
                      <td className="r">{porcentaje(a.pctComun)}</td>
                      <td className="r">{plata(a.precioSolicitadoProm)}</td>
                      <td className="r">{plata(a.precioLimiteProm)}</td>
                      <td className="r">{plata(a.precioRecomendadoProm)}</td>
                      <td className="r">{conSigno(a.difSolicitadoRecomendado)}</td>
                      <td className="r">{plata(a.ingresos, 0)}</td>
                      <td className="r">{plata(a.costosOperativos, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
              Precios promedio ponderados por kg brutos. Ingresos y costos operativos estimados según la configuración guardada en cada partida.
            </p>
          </div>
          <div className="card">
            <div className="card-head">
              <h2>Comparación por productor</h2>
              <span className="sub">Tocá un encabezado para ordenar</span>
            </div>
            <div className="tabla-wrap">
              <table>
                <thead>
                  <tr>
                    {col("nombre", "Productor", false)}
                    {col("partidas", "Partidas")}
                    {col("tacos", "Tacos")}
                    {col("kgBruto", "Kg entregados")}
                    {col("generalPorTaco", "General/taco")}
                    {col("cubitosPorTaco", "Cubitos/taco")}
                    {col("pctElegida", "% Elegida")}
                    {col("pctComun", "% Común")}
                    {col("precioSolicitadoProm", "Solicitado prom.")}
                    {col("precioRecomendadoProm", "Recomendado prom.")}
                  </tr>
                </thead>
                <tbody>
                  {porProductor.map(({ nombre, a }) => (
                    <tr key={nombre}>
                      <td>
                        <b>{nombre}</b>
                      </td>
                      <td className="r">{a.partidas}</td>
                      <td className="r">{numero(a.tacos)}</td>
                      <td className="r">{numero(a.kgBruto, 0)}</td>
                      <td className="r">
                        <b>{numeroFijo(a.generalPorTaco)}</b>
                      </td>
                      <td className="r">{numeroFijo(a.cubitosPorTaco)}</td>
                      <td className="r">{porcentaje(a.pctElegida)}</td>
                      <td className="r">{porcentaje(a.pctComun)}</td>
                      <td className="r">{plata(a.precioSolicitadoProm)}</td>
                      <td className="r">{plata(a.precioRecomendadoProm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
