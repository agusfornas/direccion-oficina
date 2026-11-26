// Panel de resultado de una partida: precios, rendimiento, planilla, resumen y gastos.
// Se usa en "Nueva partida" (en vivo mientras se carga) y en el detalle del historial.
import { Fragment, type ReactNode } from "react";
import { Kpi, useDesplegable } from "../../comun/ui";
import { numero, numeroFijo, numeroOCero, plata, porcentaje, type Decimal } from "../../comun/numeros";
import { explicarLimite, explicarRecomendado, resumenPartida, sinPrecioPedido } from "../explicaciones";
import type { ResultadoPartida } from "../tipos";

/** Texto con **negritas**. */
function ConNegritas({ t }: { t: string }) {
  return (
    <>
      {t.split("**").map((parte, i) => (i % 2 ? <b key={i}>{parte}</b> : <Fragment key={i}>{parte}</Fragment>))}
    </>
  );
}

/** Párrafos; las líneas que empiezan con "• " se agrupan en una lista. */
function Textos({ textos }: { textos: string[] }) {
  const bloques: (string | string[])[] = [];
  for (const t of textos)
    if (t.startsWith("• ")) {
      const ultimo = bloques[bloques.length - 1];
      if (Array.isArray(ultimo)) ultimo.push(t.slice(2));
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

/**
 * La cuenta del Precio Límite en números: qué se vendió, qué se resta y lo que queda
 * para la zanahoria, dividido por los kg brutos. Montos redondeados a pesos enteros.
 */
export function CuentaLimite({ r }: { r: ResultadoPartida }) {
  if (r.precioLimite === null || !numeroOCero(r.ingresos).gt(0)) return null;
  const $ = (v: string | null | Decimal) => plata(v === null ? null : numeroOCero(v.toString()).toDecimalPlaces(0).toString(), 0);
  const vendidos = r.productos.filter((p) => numeroOCero(p.bolsas).gt(0));
  const gastos: [string, string | null][] = [
    ["Mano de obra", r.costoManoObra],
    ["Bolsas", r.costoBolsas],
    ["Entacada", r.costoEntacada],
    ["Flete", r.costoFlete],
    ["Gastos generales", r.costoGastosGenerales],
  ];
  const tuPct = numeroFijo(r.gananciaPct ?? "0", 0);
  const queda = numeroOCero(r.ingresos).minus(numeroOCero(r.costosOperativos));
  return (
    <div className="cuenta-lim">
      <table className="prod">
        <thead>
          <tr>
            <th>Producto</th>
            <th className="r">Bolsas</th>
            <th className="r">Venta</th>
          </tr>
        </thead>
        <tbody>
          {vendidos.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td className="r">{numero(p.bolsas, 0)}</td>
              <td className="r">{$(p.ingreso)}</td>
            </tr>
          ))}
          <tr className="tot">
            <td colSpan={2}>Total vendido</td>
            <td className="r">{$(r.ingresos)}</td>
          </tr>
        </tbody>
      </table>
      <table className="mt-s cta">
        <tbody>
          <tr>
            <td>Venta</td>
            <td className="r">{$(r.ingresos)}</td>
          </tr>
          {gastos.map(([n, v]) => (
            <tr key={n}>
              <td>{`− ${n}`}</td>
              <td className="r">{$(v)}</td>
            </tr>
          ))}
          {numeroOCero(r.costoGanancia).gt(0) && (
            <tr>
              <td>{`− Tu ${tuPct}\u00a0%`}</td>
              <td className="r">{$(r.costoGanancia)}</td>
            </tr>
          )}
          <tr className="tot">
            <td>= Queda para la zanahoria</td>
            <td className="r">{$(queda)}</td>
          </tr>
          <tr className="tot">
            <td>{`÷ ${numero(r.kgBruto, 0)}\u00a0kg`}</td>
            <td className="r">{`${plata(r.precioLimite)} por kilo`}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Explicacion({ abierta, textos, extra }: { abierta: boolean; textos: string[]; extra?: ReactNode }) {
  return abierta ? (
    <div className="exp">
      <Textos textos={textos} />
      {extra}
      <span className="exp-hint">Tocá para cerrar</span>
    </div>
  ) : (
    <span className="exp-hint">Tocá para ver la explicación</span>
  );
}

function ResumenPartida({ r }: { r: ResultadoPartida }) {
  const t = resumenPartida(r);
  if (!t) return null;
  return (
    <div className="card">
      <details>
        <summary>Resumen de la partida</summary>
        <div className="resumen-cuerpo">
          <p className="resumen-enc">{t.encabezado}</p>
          <h3 className="mt">{t.titulo}</h3>
          <div className="tabla-wrap">
            <table className="envuelve resumen-tabla">
              <colgroup>
                <col style={{ width: "25%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "37%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Categoría</span>
                  </th>
                  <th className="r">Esperado</th>
                  <th className="r">Dio</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {t.filas.map((f) => (
                  <tr key={f.nombre}>
                    <td className="nom">
                      <i className={`dot ${f.nombre === "Elegida" ? "e" : "c"}`} /> <b>{f.nombre}</b>
                    </td>
                    <td className="r">{numeroFijo(String(f.esperado), 1)} kg</td>
                    <td className="r">{numeroFijo(String(f.dio), 1)} kg</td>
                    <td className={f.diferencia.includes("menos") ? "neg" : ""}>{f.diferencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {t.conclusion.length > 0 && (
            <>
              <h3 className="mt">Conclusión</h3>
              <ul className="resumen-concl">
                {t.conclusion.map((c, i) => (
                  <li key={i}>
                    <ConNegritas t={c} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </details>
    </div>
  );
}

function GastosPartida({ r }: { r: ResultadoPartida }) {
  const tacos = Number(r.tacos);
  if (!(tacos > 0) || !(Number(r.eqGeneral) > 0)) return null;
  const $ = (n: number) => plata(String(n), 0);
  const filas: [string, number][] = [
    ["Mano de obra", Number(r.costoManoObra)],
    ["Bolsas", Number(r.costoBolsas)],
    ["Entacada", Number(r.costoEntacada)],
    ["Flete", Number(r.costoFlete)],
    ["Gastos generales", Number(r.costoGastosGenerales)],
  ];
  const total = filas.reduce((s, [, v]) => s + v, 0);
  const ganancia = Number(r.costoGanancia ?? 0);
  const pct = numeroFijo(r.gananciaPct ?? "0", 0);
  const celdas = (v: number) => (
    <>
      <td className="r">{$(v)}</td>
      <td className="r">{$(v / tacos)}</td>
    </>
  );
  return (
    <div className="card">
      <details>
        <summary>Gastos de la partida</summary>
        <div className="resumen-cuerpo">
          <p className="resumen-enc">
            {`${numero(r.tacos, 0)} tacos · ${numero(r.kgBruto, 2)} kg brutos${r.pesoPromedioTaco ? ` · ${numeroFijo(r.pesoPromedioTaco, 2)} kg por taco` : ""}.`}
          </p>
          <div className="tabla-wrap mt">
            <table className="envuelve gastos-tabla">
              <colgroup>
                <col style={{ width: "44%" }} />
                <col style={{ width: "31%" }} />
                <col style={{ width: "25%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Gasto</span>
                  </th>
                  <th className="r">Total</th>
                  <th className="r">Por taco</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(([n, v]) => (
                  <tr key={n}>
                    <td>{n}</td>
                    {celdas(v)}
                  </tr>
                ))}
                <tr className="sub">
                  <td>Total gastos</td>
                  {celdas(total)}
                </tr>
                {ganancia > 0 && (
                  <>
                    <tr>
                      <td>
                        {`Tu ${pct} %`}
                        <span className="mut">de {$(Number(r.ingresos))} de ventas</span>
                      </td>
                      {celdas(ganancia)}
                    </tr>
                    <tr className="tot">
                      <td>{`Gastos + tu ${pct} %`}</td>
                      {celdas(total + ganancia)}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}

export function Resultado({ r, productor }: { r: ResultadoPartida; productor?: string }) {
  const rec = r.recomendado;
  const hayProduccion = Number(r.eqGeneral) > 0;
  const rindioOptimo = rec.factorRendimiento !== null && Number(rec.factorRendimiento) >= 1;
  const recomendadoBajoLimite = rec.precio !== null && r.precioLimite !== null && Number(rec.precio) < Number(r.precioLimite) - 0.005;
  const pctElegida = Number(r.pctElegida ?? 0);
  const [limiteAbierto, propsLimite] = useDesplegable();
  const [recAbierto, propsRec] = useDesplegable();
  const tuPct = Number(r.gananciaPct ?? 0) > 0 ? numeroFijo(r.gananciaPct ?? "0", 0) : null;
  const sinPedido = sinPrecioPedido(r);
  // El productor pide más de lo que podés pagar: se avisa debajo del "No aplica" (26/11/2026).
  const pctRinde = porcentaje(String(Number(rec.factorRendimiento) * 100), 0);
  const pideSobreTope = rec.base === "PEDIDO" && rec.limitadoPor === "LIMITE";
  const pideDeMas = !sinPedido && r.precioSolicitado !== null && r.precioLimite !== null && Number(r.precioSolicitado) > Number(r.precioLimite) + 0.005;
  const porKg = (v: string | null) => (
    <div className="v">
      {v === null ? "—" : plata(v)} <small>/ kg</small>
    </div>
  );

  return (
    <div>
      <div className={`precios ${sinPedido ? "solo" : ""}`}>
        <div className="precio-card clic" {...propsLimite}>
          <div className="t">Precio Límite de Compra</div>
          {sinPedido ? (
            <>
              <div className="v">A negociar</div>
              <div className="d">Sin precio pedido. No pases de {plata(r.precioLimite)}.</div>
            </>
          ) : recomendadoBajoLimite ? (
            <>
              <div className="v">No aplica</div>
              <div className="d">
                {pideDeMas ? `No te alcanza para los ${plata(r.precioSolicitado)} que pide. ` : ""}Te deja hasta {plata(r.precioLimite)} por kilo.
              </div>
            </>
          ) : (
            <>
              {porKg(r.precioLimite)}
              <div className="d">
                Tope por kilo para cubrir costos{tuPct ? ` y ganar tu ${tuPct} %` : ""}.
              </div>
            </>
          )}
          <Explicacion abierta={limiteAbierto} textos={explicarLimite(r, productor)} extra={<CuentaLimite r={r} />} />
        </div>
        {/* Sin precio pedido no hay recomendado: se negocia por debajo del Límite (26/11/2026). */}
        {!sinPedido && (
          <div className="precio-card blue clic" {...propsRec}>
            <div className="t">Precio Recomendado</div>
            {/* Lo que pide pasa el tope: el número queda solo en el Límite (26/11/2026). */}
            {pideSobreTope ? (
              <>
                <div className="v">A negociar</div>
                <div className="d">
                  Pide {plata(r.precioSolicitado)}. No pases de {plata(r.precioLimite)}.
                </div>
              </>
            ) : (
              <>
              {porKg(rec.precio)}
              <div className="d">
                {sinPedido
                  ? rindioOptimo
                    ? "Rindió el óptimo o más: tu tope."
                    : `Tu tope × lo que rindió (${porcentaje(String(Number(rec.factorAplicado) * 100), 0)}).`
                  : rec.base === "PEDIDO"
                    ? rindioOptimo
                      ? rec.limitadoPor === "LIMITE"
                        ? "Rindió bien, pero tus ventas no cubren lo que pide. Es tu tope: negociá por debajo."
                        : "Rindió el óptimo o más."
                      : rec.limitadoPor === "LIMITE"
                        ? "Lo que pide pasa tu tope. Es lo máximo que podés pagar: negociá por debajo."
                        : "Precio pedido ajustado por rendimiento."
                    : rindioOptimo
                      ? rec.limitadoPor === "SOLICITADO"
                        ? "Rindió igual o más que el óptimo."
                        : "Rindió bien, pero con tus precios de venta no alcanza para pagarle lo que pide."
                      : "Lo que conviene pagar según el rendimiento real de la mercadería. Nunca supera el límite."}
            </div>
              </>
            )}
            <Explicacion abierta={recAbierto} textos={explicarRecomendado(r)} />
          </div>
        )}
      </div>

      {rec.factorRendimiento !== null && hayProduccion && (
        <div className={`rinde mt ${Number(rec.factorRendimiento) >= 1 ? "bien" : Number(rec.factorRendimiento) >= 0.9 ? "medio" : "bajo"}`}>
          Rindió <b>el {porcentaje(String(Number(rec.factorRendimiento) * 100), 0)} del óptimo</b>.
        </div>
      )}
      {rec.base === "PEDIDO" && rec.limitadoPor === "LIMITE" && (
        <div className="aviso warn mt">
          <span aria-hidden>⚠</span>
          <span>
            {/* 26/11/2026: antes "Rindió para $ X el kilo", que parecía lo que vale la partida. */}
            Pide <b>{plata(r.precioSolicitado)}</b>.{" "}
            {rindioOptimo ? (
              <>Rindió el óptimo, pero </>
            ) : (
              <>
                Como rindió el {pctRinde} del óptimo, eso baja a <b>{plata(rec.precioPorRendimiento)}</b> ({plata(r.precioSolicitado)} × {pctRinde}). Pero{" "}
              </>
            )}
            por tus ventas y costos{tuPct ? `, guardando tu ${tuPct}\u00a0%,` : ""} podés pagar hasta <b>{plata(r.precioLimite)}</b> por kilo.
          </span>
        </div>
      )}
      {r.faltantes.length > 0 && (
        <div className="aviso warn mt">
          <span aria-hidden>⚠</span>
          <span>
            Falta precio o mano de obra de <b>{r.faltantes.join(", ")}</b> en Configuración.
          </span>
        </div>
      )}
      {rec.precio === null && rec.motivoNoDisponible && r.faltantes.length === 0 && hayProduccion && (
        <div className="aviso info mt">
          <span aria-hidden>ℹ</span>
          <span>{rec.motivoNoDisponible}</span>
        </div>
      )}

      <div className="card mt">
        <div className="card-head">
          <h2>Planilla de rendición</h2>
          <span className="sub">
            {numero(r.tacos)} tacos · {numero(r.kgBruto)} kg brutos
          </span>
        </div>
        <div className="kpis">
          <Kpi t="Cubitos por taco" v={numeroFijo(r.cubitosPorTaco)} s="Equiv. bolsas de 10 kg" accent />
          <Kpi t="General por taco" v={numeroFijo(r.generalPorTaco)} s="Equiv. bolsas de 20 kg" accent />
          <Kpi t="% Elegida" v={hayProduccion ? porcentaje(r.pctElegida) : "No disp."} s={`${numeroFijo(r.eqElegida, 2)} equiv. 20 kg`} />
          <Kpi t="% Común" v={hayProduccion ? porcentaje(r.pctComun) : "No disp."} s={`${numeroFijo(r.eqComun, 2)} equiv. 20 kg`} />
        </div>
        {hayProduccion && (
          <div className="mt">
            <div className="barra" aria-hidden>
              <div style={{ width: `${pctElegida}%`, background: "var(--elegida)" }} />
              <div style={{ width: `${100 - pctElegida}%`, background: "var(--comun)" }} />
            </div>
            <div className="legend mt-s">
              <span>
                <i className="dot e" /> Elegida {porcentaje(r.pctElegida)}
              </span>
              <span>
                <i className="dot c" /> Común {porcentaje(r.pctComun)}
              </span>
            </div>
          </div>
        )}
        <div className="kpis mt">
          <Kpi t="Bolsas físicas" v={numero(r.bolsasFisicas)} />
          <Kpi t="Kg terminados" v={numero(r.kgTerminados)} s={`${numeroFijo(r.kgPorTaco, 2)} kg por taco`} />
          <Kpi t="Kg Elegida" v={numero(r.kgElegida)} />
          <Kpi t="Kg Común" v={numero(r.kgComun)} />
          <Kpi t="Kg brutos recibidos" v={numero(r.kgBruto)} s={`${numeroFijo(r.pesoPromedioTaco, 2)} kg por taco`} />
          <Kpi
            t="Diferencia bruto − terminado"
            v={numero(r.kgPerdida)}
            s={r.pctPerdida ? `${porcentaje(r.pctPerdida)} · tierra, descarte y pérdidas` : "Tierra, descarte y pérdidas"}
          />
        </div>
      </div>
      <ResumenPartida r={r} />
      <GastosPartida r={r} />
    </div>
  );
}
