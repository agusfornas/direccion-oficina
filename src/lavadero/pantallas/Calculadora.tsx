// Pantalla "Calculadora" de Lavadero: hasta cuánto se puede pagar por kilo con un
// taco óptimo, si alcanza para lo que pide el productor, cómo cambia con los precios
// de venta de hoy y a cuánto conviene vender cada producto.
import { useEffect, useMemo, useState } from "react";
import { leerEscrito, numeroFijo, plata, type Decimal } from "../../comun/numeros";
import { Campo, Cargando, mensajeDe, Numero } from "../../comun/ui";
import { calcularPrecioVenta, calcularTacoOptimo, conPreciosDeHoy } from "../calculadora";
import { fraccionesOptimas } from "../calculo";
import * as datos from "../datos";
import type { ConfigLavadero } from "../tipos";

export function Calculadora() {
  const [config, setConfig] = useState<ConfigLavadero | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kgTaco, setKgTaco] = useState("32");
  const [pide, setPide] = useState("");
  const [tacosViaje, setTacosViaje] = useState<string | null>(null);
  const [cubitosHoy, setCubitosHoy] = useState("");
  const [monitosHoy, setMonitosHoy] = useState("");
  const [paga, setPaga] = useState("");

  useEffect(() => {
    // Se vuelve a leer la configuración al volver a la pestaña (por si la cambiaron).
    const cargar = () =>
      datos
        .configActual()
        .then((v) => setConfig(v.config))
        .catch((e) => setError(mensajeDe(e)));
    cargar();
    const alVolver = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", cargar);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", cargar);
    };
  }, []);

  const tacosConfig = config?.flete.tacosPorViaje ?? "";
  const tacosUsados = tacosViaje ?? tacosConfig;
  const cfg = useMemo(() => {
    if (!config) return null;
    const t = leerEscrito(tacosUsados);
    return t && t.gt(0) ? { ...config, flete: { ...config.flete, tacosPorViaje: t.toString() } } : config;
  }, [config, tacosUsados]);
  const cfgHoy = useMemo(() => (cfg ? conPreciosDeHoy(cfg, cubitosHoy, monitosHoy) : null), [cfg, cubitosHoy, monitosHoy]);
  const d = useMemo(() => (cfg ? calcularTacoOptimo(cfg, kgTaco, pide) : null), [cfg, kgTaco, pide]);
  const dHoy = useMemo(() => (cfgHoy ? calcularTacoOptimo(cfgHoy, kgTaco, pide) : null), [cfgHoy, kgTaco, pide]);
  const pv = useMemo(() => (cfg ? calcularPrecioVenta(cfg, kgTaco, paga) : null), [cfg, kgTaco, paga]);
  if (!config) return <Cargando error={error} />;

  const hayHoy = (leerEscrito(cubitosHoy)?.gt(0) ?? false) || (leerEscrito(monitosHoy)?.gt(0) ?? false);
  const tuPct = numeroFijo(d ? d.gananciaPct.toString() : (config.gananciaPct ?? "0"), 0);
  const $ = (v: Decimal | string | number, decimales = 2) => plata(v.toString(), decimales);
  const fr = fraccionesOptimas(config);
  const tacos = leerEscrito(tacosUsados);
  const costoViaje = leerEscrito(config.flete.costoViaje);
  const fletePorTaco = tacos && tacos.gt(0) && costoViaje ? costoViaje.div(tacos) : null;
  const pideNum = leerEscrito(pide);
  const precioConfig = (id: string) => config.productos.find((p) => p.id === id)?.precioVenta ?? null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calculadora</h1>
          <p>
            Cuenta toda la Elegida como Cubitos y toda la Común como Moñitos. En una partida real, con 20×1, Moños (Ext), Moños o Industrial, el
            límite puede dar más.
          </p>
        </div>
      </div>
      <div className="card">
        <div className="grid g2">
          <Campo label="Kg por taco">{(id) => <Numero id={id} value={kgTaco} onChange={setKgTaco} suf="kg" placeholder="32" />}</Campo>
          <Campo
            label="Tacos por viaje"
            ayuda={fletePorTaco ? `Flete por taco: ${$(fletePorTaco)} (viaje de ${plata(config.flete.costoViaje, 0)}). Solo para esta cuenta.` : "Solo para esta cuenta."}
          >
            {(id) => <Numero id={id} value={tacosUsados} onChange={setTacosViaje} suf="tacos" placeholder={tacosConfig || "0"} />}
          </Campo>
          <Campo label="Precio que pide el productor">{(id) => <Numero id={id} value={pide} onChange={setPide} pre="$" suf="/kg" placeholder="0" />}</Campo>
        </div>
      </div>
      {d && d.faltantes.length > 0 && <div className="aviso warn">Falta configurar precio de venta o mano de obra de: {d.faltantes.join(", ")}.</div>}
      {d && (
        <div className="card">
          <div className="calc-head">
            <h2>Precio límite de compra</h2>
            <span className="sub">Hasta cuánto podés pagar según las ventas, con rendimiento óptimo</span>
          </div>
          {d.maximoKg === null ? (
            <p className="muted">Faltan datos en Configuración.</p>
          ) : (
            <>
              <div className="calc-modo">Con tus precios de Configuración</div>
              <div className="calc-grande">
                {$(d.maximoKg)} <small>/ kg</small>
              </div>
              <p className="calc-nota2">{`Cubre todos los costos y tu ${tuPct}\u00a0%.`}</p>
              {d.alcanza !== null && (
                <div className="calc-pide">
                  <div className="lbl">{`Precio que pide: ${$(pideNum ?? 0)} /kg`}</div>
                  {d.alcanza ? (
                    <>
                      <p className="calc-si">Sí, lo podés pagar.</p>
                      {(() => {
                        const sobra = d.maximoKg.minus(pideNum ?? 0);
                        return (
                          <p className="calc-nota2">
                            {sobra.gt(0.004)
                              ? `Si le pagás los ${$(pideNum ?? 0)} que pide, con tus ventas actuales cubrís todos los costos, guardás tu ${tuPct}\u00a0% y te quedan ${$(sobra)} más por kilo (${$(sobra.times(d.kgTaco), 0)} por taco).`
                              : `Si le pagás los ${$(pideNum ?? 0)} que pide, con tus ventas actuales cubrís todos los costos y guardás tu ${tuPct}\u00a0% justo.`}
                          </p>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <p className="calc-no">No lo podés pagar con tus precios actuales.</p>
                      {d.nuevosPrecios.length > 0 && (
                        <>
                          <p className="muted calc-nota">
                            {`Precios de venta para pagarlo guardando tu ${tuPct}\u00a0% (+${numeroFijo(d.aumento!.times(100).toString(), 1)}\u00a0% a todos):`}
                          </p>
                          <ul className="calc-precios">
                            {d.nuevosPrecios.map((p) => (
                              <li key={p.id}>
                                {p.nombre}: de {$(p.actual, 0)} a <b>{$(p.nuevo, 0)}</b>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              <p className="muted calc-opt">
                {`Rendimiento óptimo por taco de ${numeroFijo(d.kgTaco.toString(), 2)} kg: ${numeroFijo(d.kgTaco.times(fr.elegida).toString(), 1)} kg de Elegida, ${numeroFijo(d.kgTaco.times(fr.comun).toString(), 1)} kg de Común y ${numeroFijo(d.kgTaco.times(fr.descarte).toString(), 1)} kg de tierra y descarte.`}
              </p>
            </>
          )}
        </div>
      )}

      <div className={`card ${hayHoy ? "calc-hoy" : ""}`}>
        <div className="calc-head">
          <h2>Precios de venta de hoy</h2>
          <span className="sub">Si el precio cambió, cargalo acá. Solo para esta cuenta: Configuración no cambia.</span>
        </div>
        <div className="grid g2">
          <Campo label="Cubitos" ayuda={`En Configuración: ${plata(precioConfig("CUBITOS"), 0)} la bolsa`}>
            {(id) => <Numero id={id} value={cubitosHoy} onChange={setCubitosHoy} pre="$" suf="/bolsa" placeholder={precioConfig("CUBITOS") ?? "0"} />}
          </Campo>
          <Campo label="Moñitos (Común)" ayuda={`En Configuración: ${plata(precioConfig("MONITOS"), 0)} la bolsa`}>
            {(id) => <Numero id={id} value={monitosHoy} onChange={setMonitosHoy} pre="$" suf="/bolsa" placeholder={precioConfig("MONITOS") ?? "0"} />}
          </Campo>
        </div>
        {hayHoy && (
          <button
            type="button"
            className="btn sm ghost mt-s"
            onClick={() => {
              setCubitosHoy("");
              setMonitosHoy("");
            }}
          >
            Volver a los precios de Configuración
          </button>
        )}
      </div>

      {hayHoy && dHoy && dHoy.maximoKg !== null && (
        <div className="card calc-hoy">
          <div className="calc-head">
            <h2>Precio límite con los precios de hoy</h2>
            <span className="sub">Hasta cuánto podés pagar si vendés a esos precios</span>
          </div>
          <div className="calc-modo hoy">Con los precios de venta de hoy</div>
          <div className="calc-grande">
            {$(dHoy.maximoKg)} <small>/ kg</small>
          </div>
          {d?.maximoKg &&
            (() => {
              const cambio = dHoy.maximoKg.minus(d.maximoKg);
              return <p className="calc-nota2">{`Con los precios de Configuración: ${$(d.maximoKg)}. ${cambio.lt(0) ? "Bajó" : "Subió"} ${$(cambio.abs())} por kilo.`}</p>;
            })()}
          {dHoy.alcanza !== null &&
            (dHoy.alcanza ? (
              <p className="calc-si mt-s" style={{ fontSize: 17 }}>{`Con estos precios podés pagar los ${$(pideNum ?? 0)} que pide.`}</p>
            ) : (
              <p className="calc-no mt-s" style={{ fontSize: 17 }}>{`Con estos precios no podés pagar los ${$(pideNum ?? 0)} que pide.`}</p>
            ))}
          <p className="calc-nota2">{`Cubre todos los costos y tu ${tuPct}\u00a0%.`}</p>
        </div>
      )}

      <div className="card">
        <div className="calc-head">
          <h2>Precio de venta</h2>
          <span className="sub">A cuánto vender cada producto según tus costos</span>
        </div>
        <Campo label="Precio que pagás la zanahoria">{(id) => <Numero id={id} value={paga} onChange={setPaga} pre="$" suf="/kg" placeholder="0" />}</Campo>
        {pv && (
          <div className="pv-lista mt">
            {pv.filas.map((f) => (
              <div key={f.id} className="pv-fila">
                <div>
                  <div className="pv-nom">{f.nombre}</div>
                  <div className="pv-hoy">{`Hoy ${$(f.hoy, 0)}`}</div>
                </div>
                <div className="pv-der">
                  <div className="pv-min">{`Mín. ${$(f.minimo, 0)}`}</div>
                  {f.diferencia.isZero() ? (
                    <div className="pv-dif">Justo</div>
                  ) : (
                    <div className={`pv-dif ${f.diferencia.gt(0) ? "ok" : "mal"}`}>{`${f.diferencia.gt(0) ? "Te sobran" : "Te faltan"} ${$(f.diferencia.abs(), 0)}`}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="muted calc-opt">{`Incluye todos los costos de Configuración y tu ${numeroFijo(config.gananciaPct ?? "0", 0)}\u00a0% de ganancia.`}</p>
      </div>

      {d && d.maximoKg !== null && <ComoCalcula d={d} dHoy={hayHoy && dHoy && dHoy.maximoKg !== null ? dHoy : null} pv={pv} paga={paga} tuPct={tuPct} />}
    </>
  );
}

type Taco = NonNullable<ReturnType<typeof calcularTacoOptimo>>;
type PrecioVenta = NonNullable<ReturnType<typeof calcularPrecioVenta>>;

function ComoCalcula({ d, dHoy, pv, paga, tuPct }: { d: Taco; dHoy: Taco | null; pv: PrecioVenta | null; paga: string; tuPct: string }) {
  const x = d.detalle;
  const kg = numeroFijo(d.kgTaco.toString(), 2);
  const $ = (v: Decimal, decimales = 2) => plata(v.toString(), decimales);
  const filas: [string, Decimal][] = [
    ["Mano de obra", x.manoObra],
    ["Bolsas", x.bolsasCosto],
    ["Entacada", x.entacada],
    ["Flete", x.flete],
    ["Gastos generales", x.gastosGenerales],
    [`Tu ${tuPct}\u00a0% de la venta`, x.ganancia],
  ];
  const bolsasDe = (id: string) => numeroFijo(x.bolsas.find((b) => b.id === id)?.bolsas.toString() ?? "0", 2);
  const venta = (bolsas: Taco["detalle"]["bolsas"]) => bolsas.map((b) => `${numeroFijo(b.bolsas.toString(), 2)} × ${$(b.precio, 0)}`).join(" + ");
  return (
    <div className="card">
      <details>
        <summary>Cómo calcula la Calculadora</summary>
        <div className="resumen-cuerpo calc-como">
          <h3>1. Precio límite de compra</h3>
          <p>
            <b>{`Qué sale de un taco óptimo de ${kg}\u00a0kg`}</b>
          </p>
          <ul>
            <li>{`${numeroFijo(x.kgElegida.toString(), 1)} kg de Elegida = ${bolsasDe("CUBITOS")} bolsas de Cubitos`}</li>
            <li>{`${numeroFijo(x.kgComun.toString(), 1)} kg de Común = ${bolsasDe("MONITOS")} bolsas de Moñitos`}</li>
            <li>{`${numeroFijo(x.kgDescarte.toString(), 1)} kg de tierra y descarte`}</li>
          </ul>
          <p>
            <b>Cuánto vendés</b>
          </p>
          <p>
            {`${venta(x.bolsas)} = `}
            <b>{$(x.ventas)}</b>
          </p>
          <p>
            <b>{`Gastos del taco, con tu ${tuPct}\u00a0%`}</b>
          </p>
          <div className="tabla-wrap">
            <table className="envuelve gastos-tabla">
              <colgroup>
                <col style={{ width: "62%" }} />
                <col style={{ width: "38%" }} />
              </colgroup>
              <tbody>
                {filas.map(([n, v]) => (
                  <tr key={n}>
                    <td>{n}</td>
                    <td className="r">{$(v)}</td>
                  </tr>
                ))}
                <tr className="tot">
                  <td>Total</td>
                  <td className="r">{$(x.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt">
            <b>Lo que queda para la zanahoria</b>
          </p>
          <p>
            {`${$(x.ventas)} − ${$(x.total)} = ${$(x.queda)} por taco ÷ ${kg}\u00a0kg = `}
            <b>{`${$(d.maximoKg!)} por kilo`}</b>
          </p>

          <h3 className="mt">2. Con los precios de venta de hoy</h3>
          {dHoy ? (
            <>
              <p>
                {`Misma cuenta, cambiando solo la venta: ${venta(dHoy.detalle.bolsas)} = `}
                <b>{$(dHoy.detalle.ventas)}</b>
              </p>
              <p>{`Gastos con tu ${tuPct}\u00a0%: ${$(dHoy.detalle.total)} (tu ${tuPct}\u00a0% cambia porque es un % de la venta).`}</p>
              <p>
                {`${$(dHoy.detalle.ventas)} − ${$(dHoy.detalle.total)} = ${$(dHoy.detalle.queda)} por taco ÷ ${kg}\u00a0kg = `}
                <b>{`${$(dHoy.maximoKg!)} por kilo`}</b>
              </p>
            </>
          ) : (
            <p>
              Es la misma cuenta del punto 1, pero con los precios de Cubitos y Moñitos que cargues en "Precios de venta de hoy". Los gastos no
              cambian, salvo tu ganancia, que es un % de la venta.
            </p>
          )}

          <h3 className="mt">3. Precio de venta</h3>
          {pv ? (
            <>
              <p>
                {`Costo por taco: ${plata((leerEscrito(paga) ?? 0).toString())} × ${kg}\u00a0kg + mano de obra, bolsas, entacada, flete y gastos generales = `}
                <b>{$(pv.costoTaco)}</b>
              </p>
              <p>
                {`Venta mínima: ${$(pv.costoTaco)} ÷ (1 − ${tuPct}\u00a0%) = `}
                <b>{$(pv.ventaMinima)}</b>
              </p>
              <p>
                {`Factor: ${$(pv.ventaMinima)} ÷ ${$(pv.ventaActual)} (venta de hoy con precios de Configuración) = `}
                <b>{numeroFijo(pv.factor.toString(), 3)}</b>
              </p>
              <p>{`Precio mínimo de cada producto = precio de Configuración × ${numeroFijo(pv.factor.toString(), 3)}.`}</p>
            </>
          ) : (
            <p>
              Cargá el precio que pagás la zanahoria. Suma ese costo a los demás gastos del taco, le agrega tu ganancia y reparte la diferencia en el
              mismo % sobre el precio de cada producto.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
