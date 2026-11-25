// Pantalla de una partida guardada (#historial-12).
import { useEffect, useState } from "react";
import { Cambios } from "../../comun/Cambios";
import { descargar } from "../../comun/servidor";
import { fechaCorta } from "../../comun/fechas";
import { numero, numeroFijo, plata, porcentaje } from "../../comun/numeros";
import { avisar, BotonEliminar, Cargando, ir, Kpi, mensajeDe } from "../../comun/ui";
import * as datos from "../datos";
import { excelPartida } from "../excel";
import { CuentaLimite } from "./Resultado";
import { explicarLimite, explicarRecomendado, sinPrecioPedido } from "../explicaciones";
import type { Partida } from "../tipos";
import { repetirPartida } from "./NuevaPartida";

function Textos({ textos }: { textos: string[] }) {
  const bloques: (string | string[])[] = [];
  for (const t of textos)
    if (t.startsWith("• ")) {
      const u = bloques[bloques.length - 1];
      if (Array.isArray(u)) u.push(t.slice(2));
      else bloques.push([t.slice(2)]);
    } else bloques.push(t);
  return (
    <>
      {bloques.map((b, i) =>
        Array.isArray(b) ? (
          <ul key={i}>
            {b.map((x, j) => (
              <li key={j}>{x}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b}</p>
        ),
      )}
    </>
  );
}

export function DetallePartida({ id }: { id: number }) {
  const [p, setP] = useState<Partida | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    datos
      .partida(id)
      .then(setP)
      .catch((e) => (mensajeDe(e) === "La partida no existe" ? setP(null) : setError(mensajeDe(e))));
  }, [id]);
  if (p === undefined) return <Cargando error={error} />;
  if (p === null)
    return (
      <div className="vacio">
        La partida no existe. <a href="#historial">Volver al historial</a>
      </div>
    );
  const r = p.resultado;
  const rec = r.recomendado;
  const bajoLimite = rec.precio !== null && r.precioLimite !== null && Number(rec.precio) < Number(r.precioLimite) - 0.005;
  const totalBolsas = r.productos.reduce((s, x) => s + Number(x.bolsas), 0);
  const sinPedido = sinPrecioPedido(r);
  const exportar = async () => {
    try {
      await descargar(`partida-${p.numero}.xlsx`, await excelPartida(p));
    } catch (e) {
      avisar(mensajeDe(e));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <a href="#historial" className="btn sm ghost" style={{ marginLeft: -10 }}>
            ← Historial
          </a>
          <h1>{p.productor}</h1>
          <p>
            Partida {p.numero} · {fechaCorta(p.fecha)} · {numero(r.tacos)} tacos · {numero(r.kgBruto, 0)} kg
          </p>
        </div>
        <div className="acciones">
          <button className="btn primary" onClick={() => repetirPartida(p.input)}>
            Duplicar
          </button>
          <button className="btn" onClick={() => ir(`#editar-${p.id}`)}>
            Corregir datos
          </button>
          <button className="btn" onClick={exportar}>
            Excel
          </button>
          <BotonEliminar
            onEliminar={async () => {
              await datos.eliminarPartida(p.id, p.rev ?? 0);
              avisar("Partida eliminada");
              ir("#historial");
            }}
          />
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>Precios</h2>
          <span className="sub">$ por kg</span>
        </div>
        <div className="kpis tres apila">
          <Kpi t="Precio solicitado o de referencia" v={plata(r.precioSolicitado)} />
          <Kpi
            t="Precio límite"
            v={sinPedido ? "A negociar" : bajoLimite ? "No aplica" : plata(r.precioLimite)}
            s={sinPedido ? `No pases de ${plata(r.precioLimite)}.` : bajoLimite ? `Te deja hasta ${plata(r.precioLimite)} por kilo.` : undefined}
          />
          <Kpi t="Precio recomendado" v={plata(rec.precio)} accent />
        </div>
        {rec.factorRendimiento !== null && (
          <div className={`rinde mt ${Number(rec.factorRendimiento) >= 1 ? "bien" : Number(rec.factorRendimiento) >= 0.9 ? "medio" : "bajo"}`}>
            Rindió <b>el {porcentaje(String(Number(rec.factorRendimiento) * 100), 0)} del óptimo</b>.
          </div>
        )}
        <details className="mt">
          <summary>¿Por qué el precio límite?</summary>
          <div className="explicacion-detalle">
            <Textos textos={explicarLimite(r, p.productor)} />
            <CuentaLimite r={r} />
          </div>
        </details>
        <details className="mt-s">
          <summary>¿Por qué el precio recomendado?</summary>
          <div className="explicacion-detalle">
            <Textos textos={explicarRecomendado(r)} />
          </div>
        </details>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>Rendición</h2>
        </div>
        <div className="kpis">
          <Kpi t="Cubitos por taco" v={numeroFijo(r.cubitosPorTaco)} accent />
          <Kpi t="General por taco" v={numeroFijo(r.generalPorTaco)} accent />
          <Kpi t="% Elegida" v={porcentaje(r.pctElegida)} />
          <Kpi t="% Común" v={porcentaje(r.pctComun)} />
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>Bolsas obtenidas</h2>
          <span className="sub">Total {numero(String(totalBolsas))} bolsas</span>
        </div>
        {(["ELEGIDA", "COMUN"] as const).map((cat) => (
          <div className="mt-s" key={cat}>
            <div className="cat-title">
              <i className={`dot ${cat === "ELEGIDA" ? "e" : "c"}`} /> {cat === "ELEGIDA" ? "Elegida" : "Común"}
            </div>
            <div className="kpis tres mt-s">
              {r.productos
                .filter((x) => x.categoria === cat)
                .map((x) => (
                  <Kpi key={x.id} t={x.nombre} v={numero(x.bolsas)} s="bolsas" />
                ))}
            </div>
          </div>
        ))}
      </div>
      {p.input.notas && (
        <div className="card">
          <div className="lbl">Notas</div>
          <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{p.input.notas}</p>
        </div>
      )}
      <Cambios cambios={p.auditoria ?? []} />
    </>
  );
}
