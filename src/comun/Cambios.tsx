// Tarjeta "Historial de cambios": quién creó, corrigió o eliminó un registro y cuándo.
// Nuevo en la v2 (en la v1 se guardaba la fecha pero no la persona).
import { useEffect, useState } from "react";
import { nombres } from "./claude";

interface Cambio {
  accion: "crear" | "modificar" | "eliminar";
  fecha: string;
  quien?: string | null;
}

const VERBO = { crear: "Creada", modificar: "Corregida", eliminar: "Eliminada" } as const;

export function Cambios({ cambios, femenino = true }: { cambios: Cambio[]; femenino?: boolean }) {
  const [quienes, setQuienes] = useState<Record<string, string>>({});
  useEffect(() => {
    // Los nombres se piden cada vez (no se guardan): si alguien cambia su nombre, se ve el nuevo.
    nombres(cambios.map((c) => c.quien ?? "").filter(Boolean)).then(setQuienes);
  }, [cambios]);
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
                {c.quien ? (quienes[c.quien] ?? "una persona del equipo") : "sin registro de quién (v1)"}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
