// Piezas comunes de los gráficos (Recharts). Los colores salen de las variables CSS,
// así los gráficos se ven bien en modo claro y oscuro.
import { MESES, nombreMes } from "./fechas";

export const COLOR = {
  azul: "var(--blue)",
  navy: "var(--comun)",
  grilla: "var(--line)",
  texto: "var(--ink-2)",
  fondo: "var(--surface)",
};
export const TICK = { fill: COLOR.texto, fontSize: 12, fontWeight: 600 };
/** "2026-11" → "Nov 26" */
export const mesCorto = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1].slice(0, 3)} ${m.slice(2, 4)}`;
export const CURSOR_BARRA = { fill: "var(--blue-soft)", fillOpacity: 0.6 };

/** Cuadrito que aparece al pasar el mouse por un gráfico. */
export function Tooltip({
  active,
  payload,
  label,
  fmt,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  fmt: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--surface)",
        color: "var(--ink)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "8px 12px",
        boxShadow: "var(--shadow)",
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 4 }}>{label ? nombreMes(label) : ""}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
          <i style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
          {p.name}: <b>{fmt(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

/** Encabezado de tabla que ordena al tocarlo (también con teclado). */
export function ColumnaOrdenable<K extends string>({
  clave,
  texto,
  orden,
  setOrden,
  derecha = true,
}: {
  clave: K;
  texto: string;
  orden: { k: K; asc: boolean };
  setOrden: (o: { k: K; asc: boolean }) => void;
  derecha?: boolean;
}) {
  const activa = orden.k === clave;
  return (
    <th className={`sortable ${derecha ? "r" : ""}`} aria-sort={activa ? (orden.asc ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        style={{ all: "inherit", cursor: "pointer", padding: 0, border: 0 }}
        onClick={() => setOrden({ k: clave, asc: activa && !orden.asc })}
      >
        {texto}
        {activa ? (orden.asc ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
}
