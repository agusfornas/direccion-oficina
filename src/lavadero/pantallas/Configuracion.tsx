// Pantalla "Configuración" de Lavadero. Cada vez que se guarda se crea una versión
// nueva: las partidas viejas quedan calculadas con la versión que tenían.
import { useEffect, useMemo, useState } from "react";
import { ErrorApp } from "../../comun/claude";
import { Decimal, numeroFijo, plata, porcentaje } from "../../comun/numeros";
import { avisar, Campo, Cargando, mensajeDe, Numero, Opciones } from "../../comun/ui";
import { fletePorTaco, fraccionesOptimas, gastoGeneralPorTaco } from "../calculo";
import * as datos from "../datos";
import type { ConfigLavadero, Producto, VersionConfig } from "../tipos";
import { limpiarConfig, validarConfig } from "../validar";

const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function Configuracion() {
  const [guardada, setGuardada] = useState<VersionConfig | null>(null);
  const [form, setForm] = useState<ConfigLavadero | null>(null);
  const [nota, setNota] = useState("");
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () =>
    datos
      .configActual()
      .then((v) => {
        setGuardada(v);
        setForm(copia(v.config));
      })
      .catch((e) => setError(mensajeDe(e)));
  useEffect(() => {
    cargar();
  }, []);

  // Lo que se muestra calculado (flete por taco, proporciones) sale de la versión limpia del formulario.
  const limpia = useMemo(() => (form && guardada ? limpiarConfig(form, guardada.config) : null), [form, guardada]);
  const errores = useMemo(() => (limpia ? { ...validarConfig(limpia), ...erroresServidor } : {}), [limpia, erroresServidor]);
  const hayCambios = !!form && !!guardada && JSON.stringify(form) !== JSON.stringify(guardada.config);
  if (!form || !guardada || !limpia) return <Cargando error={error} />;

  const cambiar = (f: (c: ConfigLavadero) => void) =>
    setForm((c) => {
      const n = copia(c!);
      f(n);
      return n;
    });
  const cambiarProducto = (id: string, campo: keyof Producto, v: string) =>
    cambiar((c) => {
      const p = c.productos.find((x) => x.id === id)!;
      (p as unknown as Record<string, string | null>)[campo] = v === "" ? null : v;
    });
  const guardar = async () => {
    if (Object.keys(validarConfig(limpia)).length) {
      avisar("Revisá los campos marcados.");
      return;
    }
    setGuardando(true);
    try {
      const v = await datos.guardarConfig(form, nota, guardada.version);
      setErroresServidor({});
      setNota("");
      avisar(v.version === guardada.version ? "Sin cambios" : `Configuración guardada como versión ${v.version}`);
      await cargar();
    } catch (e) {
      if (e instanceof ErrorApp) setErroresServidor(e.errores);
      avisar(mensajeDe(e));
    } finally {
      setGuardando(false);
    }
  };
  const fr = fraccionesOptimas(limpia);
  const flete = fletePorTaco(limpia);
  const gg = gastoGeneralPorTaco(limpia);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Configuración</h1>
          <p>Versión vigente: {guardada.version}</p>
        </div>
        <div className="acciones">
          <button
            className="btn"
            disabled={!hayCambios || guardando}
            onClick={() => {
              setErroresServidor({});
              cargar();
            }}
          >
            Descartar cambios
          </button>
          <button className="btn primary" disabled={!hayCambios || guardando} onClick={guardar}>
            {guardando ? "Guardando…" : "Guardar nueva versión"}
          </button>
        </div>
      </div>
      {hayCambios && (
        <div className="card" style={{ borderColor: "var(--blue)" }}>
          <Campo label="Motivo del cambio (opcional)">
            {(id) => (
              <input id={id} type="text" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: actualización de precios de noviembre" />
            )}
          </Campo>
        </div>
      )}
      <div className="card">
        <div className="card-head">
          <h2>Productos: precio de venta, mano de obra y bolsa</h2>
          <span className="sub">$ por bolsa · vacío = por configurar</span>
        </div>
        <div className="tabla-wrap">
          <table className="productos-cfg">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio de venta</th>
                <th>Mano de obra</th>
                <th>Costo de bolsa</th>
              </tr>
            </thead>
            <tbody>
              {form.productos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.nombre}</b>
                  </td>
                  <td>
                    <Numero
                      value={p.precioVenta ?? ""}
                      onChange={(v) => cambiarProducto(p.id, "precioVenta", v)}
                      pre="$"
                      placeholder="Por configurar"
                      invalido={!!errores[`${p.id}.precioVenta`]}
                      ariaLabel={`Precio de venta de ${p.nombre}`}
                    />
                  </td>
                  <td>
                    <Numero
                      value={p.manoObra ?? ""}
                      onChange={(v) => cambiarProducto(p.id, "manoObra", v)}
                      pre="$"
                      placeholder="Por configurar"
                      invalido={!!errores[`${p.id}.manoObra`]}
                      ariaLabel={`Mano de obra de ${p.nombre}`}
                    />
                  </td>
                  <td>
                    <Numero
                      value={p.costoBolsa ?? form.costoBolsa}
                      onChange={(v) => cambiarProducto(p.id, "costoBolsa", v)}
                      pre="$"
                      placeholder="0"
                      invalido={!!errores[`${p.id}.costoBolsa`]}
                      ariaLabel={`Costo de bolsa de ${p.nombre}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid g2 mt">
        <div className="card" style={{ margin: 0 }}>
          <div className="card-head">
            <h2>Costos de procesamiento</h2>
          </div>
          <div className="grid">
            <Campo label="Entacada" ayuda="Costo de llenar y armar cada taco." error={errores.entacadaPorTaco}>
              {(id) => <Numero id={id} value={form.entacadaPorTaco} onChange={(v) => cambiar((c) => (c.entacadaPorTaco = v))} pre="$" suf="/taco" />}
            </Campo>
          </div>
          <div className="mt">
            <Campo
              label="Ganancia de la empresa"
              ayuda="Porcentaje de las ventas que se reserva como ganancia. Se descuenta como un costo más antes de calcular el Precio Límite."
              error={errores.gananciaPct}
            >
              {(id) => (
                <Numero id={id} value={form.gananciaPct ?? ""} onChange={(v) => cambiar((c) => (c.gananciaPct = v))} suf="% de las ventas" placeholder="0" />
              )}
            </Campo>
          </div>
          <div className="lbl mt">Flete</div>
          <div className="grid g2 mt-s">
            <Campo label="Costo total del viaje" error={errores["flete.costoViaje"]}>
              {(id) => <Numero id={id} value={form.flete.costoViaje} onChange={(v) => cambiar((c) => (c.flete.costoViaje = v))} pre="$" />}
            </Campo>
            <Campo label="Tacos por viaje" error={errores["flete.tacosPorViaje"]}>
              {(id) => <Numero id={id} value={form.flete.tacosPorViaje} onChange={(v) => cambiar((c) => (c.flete.tacosPorViaje = v))} suf="tacos" />}
            </Campo>
          </div>
          <div className="soft mt-s">
            <b>Flete por taco: {plata(flete?.toString() ?? null)}</b>
          </div>
          <div className="row mt" style={{ justifyContent: "space-between" }}>
            <span className="lbl">Gastos generales</span>
            <Opciones
              etiqueta="Cómo se cargan los gastos generales"
              value={form.gastosGenerales.modo}
              onChange={(v) => cambiar((c) => (c.gastosGenerales.modo = v))}
              options={[
                ["POR_TACO", "Por taco"],
                ["MENSUAL", "Desde gasto mensual"],
              ]}
            />
          </div>
          {form.gastosGenerales.modo === "POR_TACO" ? (
            <div className="mt-s">
              <Campo
                label="Gasto general por taco"
                ayuda="Sueldos, electricidad, agua, impuestos y otros gastos operativos."
                error={errores["gg.porTaco"]}
              >
                {(id) => (
                  <Numero id={id} value={form.gastosGenerales.porTaco} onChange={(v) => cambiar((c) => (c.gastosGenerales.porTaco = v))} pre="$" suf="/taco" />
                )}
              </Campo>
            </div>
          ) : (
            <div className="grid g2 mt-s">
              <Campo label="Gastos generales del mes" error={errores["gg.mensualTotal"]}>
                {(id) => (
                  <Numero id={id} value={form.gastosGenerales.mensualTotal} onChange={(v) => cambiar((c) => (c.gastosGenerales.mensualTotal = v))} pre="$" />
                )}
              </Campo>
              <Campo label="Tacos procesados en el mes" error={errores["gg.mensualTacos"]}>
                {(id) => (
                  <Numero id={id} value={form.gastosGenerales.mensualTacos} onChange={(v) => cambiar((c) => (c.gastosGenerales.mensualTacos = v))} suf="tacos" />
                )}
              </Campo>
            </div>
          )}
          <div className="soft mt-s">
            <b>Gasto general por taco: {plata(gg?.toString() ?? null)}</b>
          </div>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <div className="card-head">
            <h2>Rendimiento óptimo</h2>
            <span className="sub">Referencia de calidad esperada</span>
          </div>
          <div className="grid g2">
            <Campo label="Peso del taco de referencia" error={errores["ro.pesoTacoRef"]}>
              {(id) => <Numero id={id} value={form.rendimientoOptimo.pesoTacoRef} onChange={(v) => cambiar((c) => (c.rendimientoOptimo.pesoTacoRef = v))} suf="kg" />}
            </Campo>
            <Campo label="Elegida" error={errores["ro.elegidaKg"]}>
              {(id) => <Numero id={id} value={form.rendimientoOptimo.elegidaKg} onChange={(v) => cambiar((c) => (c.rendimientoOptimo.elegidaKg = v))} suf="kg" />}
            </Campo>
            <Campo label="Común" error={errores["ro.comunKg"]}>
              {(id) => <Numero id={id} value={form.rendimientoOptimo.comunKg} onChange={(v) => cambiar((c) => (c.rendimientoOptimo.comunKg = v))} suf="kg" />}
            </Campo>
            <Campo label="Tierra y descarte" error={errores["ro.descarteKg"]}>
              {(id) => <Numero id={id} value={form.rendimientoOptimo.descarteKg} onChange={(v) => cambiar((c) => (c.rendimientoOptimo.descarteKg = v))} suf="kg" />}
            </Campo>
          </div>
          {errores["ro.suma"] && <div className="aviso bad mt-s">{errores["ro.suma"]}</div>}
          <div className="tabla-wrap mt">
            <table>
              <thead>
                <tr>
                  <th>Taco de</th>
                  <th className="r">Elegida</th>
                  <th className="r">Común</th>
                  <th className="r">Descarte</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="muted">Proporción</td>
                  <td className="r">{porcentaje(fr.elegida.times(100).toString(), 3)}</td>
                  <td className="r">{porcentaje(fr.comun.times(100).toString(), 3)}</td>
                  <td className="r">{porcentaje(fr.descarte.times(100).toString(), 3)}</td>
                </tr>
                {["32", "34", "34.42"].map((kg) => {
                  const t = new Decimal(kg);
                  return (
                    <tr key={kg}>
                      <td>{numeroFijo(kg, 2)} kg</td>
                      <td className="r">{numeroFijo(t.times(fr.elegida).toString(), 2)} kg</td>
                      <td className="r">{numeroFijo(t.times(fr.comun).toString(), 2)} kg</td>
                      <td className="r">{numeroFijo(t.times(fr.descarte).toString(), 2)} kg</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
            Cada partida compara su producción real contra el óptimo escalado a su propio peso por taco.
          </p>
        </div>
      </div>
    </>
  );
}
