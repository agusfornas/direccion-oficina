// Tarjeta "Historial de cambios": quién creó, corrigió o eliminó un registro y cuándo.
// "Quién" es el nombre de la tarjeta con la que la persona entró (lo anota el servidor).

interface Cambio {
  accion: "crear" | "modificar" | "eliminar";
  fecha: string;
  quien?: string | null;
}

const VERBO = { crear: "Creada", modificar: "Corregida", eliminar: "Eliminada" } as const;

export function Cambios({ cambios, femenino = true }: { cambios: Cambio[]; femenino?: boolean }) {
  if (!cambios.length) return null;
  const verbo = (a: Cambio["accion"]) => (femenino ? VERBO[a] : VERBO[a].replace(/a$/, "o"));
  return (
    <div className="card">
      <details>
        <summary>Historial de cambios ({cambios.length})</summary>
        <ul className="mt-s" style={{ paddingLeft: 20, margin: "8px 0 0" }}>
          {[...cambios].reverse().map((c, i) => (
            <li key={i}>
              {verbo(c.accion)} el {c.fecha.slice(8, 10)}/{c.fecha.slice(5, 7)}/{c.fecha.slice(0, 4)} a las {c.fecha.slice(11, 16)}
              <span className="quien">
                {" · "}
                {c.quien && !c.quien.startsWith("u_") ? c.quien : "sin registro de quién (app vieja)"}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
