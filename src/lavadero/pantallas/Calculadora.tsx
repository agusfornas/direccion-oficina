// Pantalla "Calculadora" de Lavadero: hasta cuánto se puede pagar por kilo con un
// taco óptimo, y si alcanza para lo que pide el productor.
import { useEffect, useMemo, useState } from "react";
import { leerEscrito, numeroFijo, plata, type Decimal } from "../../comun/numeros";
import { Campo, Cargando, mensajeDe, Numero } from "../../comun/ui";
import { calcularTacoOptimo } from "../calculadora";
import { fraccionesOptimas } from "../calculo";
import * as datos from "../datos";
import type { ConfigLavadero } from "../tipos";

export function Calculadora() {
  const [config, setConfig] = useState<ConfigLavadero | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kgTaco, setKgTaco] = useState("32");
  const [pide, setPide] = useState("");
  const [tacosViaje, setTacosViaje] = useState<string | null>(null);

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
  const d = useMemo(() => (cfg ? calcularTacoOptimo(cfg, kgTaco, pide) : null), [cfg, kgTaco, pide]);
  if (!config) return <Cargando error={error} />;

  const tuPct = numeroFijo(d ? d.gananciaPct.toString() : (config.gananciaPct ?? "0"), 0);
  const $ = (v: Decimal | string | number, decimales = 2) => plata(v.toString(), decimales);
  const fr = fraccionesOptimas(config);
  const tacos = leerEscrito(tacosUsados);
  const costoViaje = leerEscrito(config.flete.costoViaje);
  const fletePorTaco = tacos && tacos.gt(0) && costoViaje ? costoViaje.div(tacos) : null;
  const pideNum = leerEscrito(pide);

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
      {d && d.alcanza !== null && (
        <div className="card">
          <div className="calc-head">
            <h2>Precio solicitado</h2>
            <span className="sub">¿Se puede pagar este precio?</span>
          </div>
          {d.alcanza ? (
            <>
              <p className="calc-si">Sí, lo podés pagar.</p>
              {(() => {
                const sobra = d.maximoKg!.minus(pideNum ?? 0);
                return (
                  <p className="calc-nota2">
                    {sobra.gt(0.004)
                      ? `Si le pagás los ${$(pideNum ?? 0)} que pide, con tus ventas actuales cubrís todos los costos, guardás tu ${tuPct} % y te quedan ${$(sobra)} más por kilo (${$(sobra.times(d.kgTaco), 0)} por taco).`
                      : `Si le pagás los ${$(pideNum ?? 0)} que pide, con tus ventas actuales cubrís todos los costos y guardás tu ${tuPct} % justo.`}
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
                    {`Precios de venta para pagarlo guardando tu ${tuPct} % (+${numeroFijo(d.aumento!.times(100).toString(), 1)} % a todos):`}
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
              <div className="calc-grande">
                {$(d.maximoKg)} <small>/ kg</small>
              </div>
              <p className="calc-nota2">{`Cubre todos los costos y tu ${tuPct} %.`}</p>
              <p className="muted calc-opt">
                {`Rendimiento óptimo por taco de ${numeroFijo(d.kgTaco.toString(), 2)} kg: ${numeroFijo(d.kgTaco.times(fr.elegida).toString(), 1)} kg de Elegida, ${numeroFijo(d.kgTaco.times(fr.comun).toString(), 1)} kg de Común y ${numeroFijo(d.kgTaco.times(fr.descarte).toString(), 1)} kg de tierra y descarte.`}
              </p>
            </>
          )}
        </div>
      )}
      {d && d.maximoKg !== null && <ComoCalcula d={d} tuPct={tuPct} />}
    </>
  );
}

function ComoCalcula({ d, tuPct }: { d: NonNullable<ReturnType<typeof calcularTacoOptimo>>; tuPct: string }) {
  const x = d.detalle;
  const kg = numeroFijo(d.kgTaco.toString(), 2);
  const $ = (v: Decimal, decimales = 2) => plata(v.toString(), decimales);
  const filas: [string, Decimal][] = [
    ["Mano de obra", x.manoObra],
    ["Bolsas", x.bolsasCosto],
    ["Entacada", x.entacada],
    ["Flete", x.flete],
    ["Gastos generales", x.gastosGenerales],
    [`Tu ${tuPct} % de la venta`, x.ganancia],
  ];
  const bolsasDe = (id: string) => numeroFijo(x.bolsas.find((b) => b.id === id)?.bolsas.toString() ?? "0", 2);
  return (
    <div className="card">
      <details>
        <summary>Cómo calcula la Calculadora</summary>
        <div className="resumen-cuerpo calc-como">
          <p>
            <b>{`1. Qué sale de un taco óptimo de ${kg} kg`}</b>
          </p>
          <ul>
            <li>{`${numeroFijo(x.kgElegida.toString(), 1)} kg de Elegida = ${bolsasDe("CUBITOS")} bolsas de Cubitos`}</li>
            <li>{`${numeroFijo(x.kgComun.toString(), 1)} kg de Común = ${bolsasDe("MONITOS")} bolsas de Moñitos`}</li>
            <li>{`${numeroFijo(x.kgDescarte.toString(), 1)} kg de tierra y descarte`}</li>
          </ul>
          <p>
            <b>2. Cuánto vendés</b>
          </p>
          <p>
            {`${x.bolsas.map((b) => `${numeroFijo(b.bolsas.toString(), 2)} × ${$(b.precio, 0)}`).join(" + ")} = `}
            <b>{$(x.ventas)}</b>
          </p>
          <p>
            <b>{`3. Gastos del taco, con tu ${tuPct} %`}</b>
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
            <b>4. Lo que queda para pagar la zanahoria</b>
          </p>
          <p>
            {`${$(x.ventas)} − ${$(x.total)} = `}
            <b>{`${$(x.queda)} por taco`}</b>
          </p>
          <p>
            <b>5. Por kilo</b>
          </p>
          <p>
            {`${$(x.queda)} ÷ ${kg} kg = `}
            <b>{`${$(d.maximoKg!)} por kilo`}</b>
          </p>
          <p className="muted">
            {`En una línea: (ventas − gastos − tu ${tuPct} %) ÷ kg del taco. Es la misma cuenta del límite de cada partida, pero con un taco óptimo y todo Cubitos y Moñitos.`}
          </p>
        </div>
      </details>
    </div>
  );
}
