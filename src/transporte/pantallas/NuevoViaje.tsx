// Pantalla "Nuevo viaje" (y "Corregir viaje" cuando viene editarId).
import { useEffect, useMemo, useState } from "react";
import { ErrorApp } from "../../comun/claude";
import { hoy } from "../../comun/fechas";
import { plata, porcentaje } from "../../comun/numeros";
import { avisar, Campo, Cargando, ir, mensajeDe, Numero } from "../../comun/ui";
import { calcularViaje, viajeVacio } from "../calculo";
import * as datos from "../datos";
import type { ConfigTransporte, EntradaViaje } from "../tipos";
import { limpiarViaje } from "../validar";
import { ivaTexto, ResultadoViajeVista } from "./ResultadoViaje";

// "Duplicar": el detalle deja acá el viaje y abre #t-nuevo.
let paraRepetir: EntradaViaje | null = null;
export function repetirViaje(e: EntradaViaje) {
  paraRepetir = { ...JSON.parse(JSON.stringify(e)), fecha: hoy() };
  ir("#t-nuevo");
}

export function NuevoViaje({ editarId }: { editarId?: number }) {
  const [form, setForm] = useState<EntradaViaje>(() => {
    const e = paraRepetir;
    paraRepetir = null;
    return e ?? viajeVacio();
  });
  const [cfg, setCfg] = useState<ConfigTransporte | null>(null);
  const [rev, setRev] = useState<number | undefined>();
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (editarId
      ? datos.viaje(editarId).then((v) => {
          if (!v) {
            avisar("El viaje no existe.");
            ir("#t-historial");
            return;
          }
          setForm(v.input);
          setCfg(v.config);
          setRev(v.rev ?? 0);
        })
      : datos.configActual().then((v) => setCfg(v.config))
    ).catch((e) => setError(mensajeDe(e)));
  }, [editarId]);

  const poner = <K extends keyof EntradaViaje>(campo: K, v: EntradaViaje[K]) => {
    setForm((f) => ({ ...f, [campo]: v }));
    setErrores((e) => {
      const n = { ...e };
      delete n[campo];
      return n;
    });
  };
  const resultado = useMemo(() => (cfg ? calcularViaje(limpiarViaje(form), cfg) : null), [form, cfg]);
  const guardar = async () => {
    setGuardando(true);
    try {
      const v = editarId ? await datos.actualizarViaje(editarId, form, rev) : await datos.crearViaje(form);
      avisar(editarId ? "Viaje corregido" : "Viaje guardado");
      ir(`#t-historial-${v.id}`);
    } catch (e) {
      if (e instanceof ErrorApp) setErrores(e.errores);
      avisar(e instanceof ErrorApp ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{editarId ? `Corregir viaje ${editarId}` : "Nuevo viaje"}</h1>
        </div>
        <div className="acciones">
          {editarId ? (
            <button className="btn" onClick={() => ir(`#t-historial-${editarId}`)}>
              Cancelar
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => {
                setForm(viajeVacio());
                setErrores({});
              }}
            >
              Limpiar
            </button>
          )}
          <button className="btn primary" onClick={guardar} disabled={guardando || !cfg}>
            {guardando ? "Guardando…" : editarId ? "Guardar cambios" : "Guardar viaje"}
          </button>
        </div>
      </div>
      <div className="split">
        <div>
          <div className="card">
            <div className="card-head">
              <h2>Datos del viaje</h2>
            </div>
            <div className="grid g2">
              <Campo label="Fecha" error={errores.fecha}>
                {(id) => <input id={id} type="date" value={form.fecha} onChange={(e) => poner("fecha", e.target.value)} />}
              </Campo>
              <Campo label="Unidad (opcional)">
                {(id) => <input id={id} type="text" value={form.camion} onChange={(e) => poner("camion", e.target.value)} placeholder="Patente o nombre" />}
              </Campo>
              <Campo label="Origen">
                {(id) => <input id={id} type="text" value={form.origen} onChange={(e) => poner("origen", e.target.value)} placeholder="Desde" />}
              </Campo>
              <Campo label="Destino" error={errores.destino}>
                {(id) => (
                  <input
                    id={id}
                    type="text"
                    value={form.destino}
                    onChange={(e) => poner("destino", e.target.value)}
                    className={errores.destino ? "invalido" : ""}
                    placeholder="Hasta"
                  />
                )}
              </Campo>
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <h2>Flete y gastos</h2>
            </div>
            <div className="grid g2">
              <Campo label="Flete de ida" error={errores.fleteIda}>
                {(id) => <Numero id={id} value={form.fleteIda} onChange={(v) => poner("fleteIda", v)} pre="$" invalido={!!errores.fleteIda} />}
              </Campo>
              <Campo label="Flete de vuelta" error={errores.fleteVuelta}>
                {(id) => <Numero id={id} value={form.fleteVuelta} onChange={(v) => poner("fleteVuelta", v)} pre="$" invalido={!!errores.fleteVuelta} />}
              </Campo>
            </div>
            <label className="tilde mt-s">
              <input type="checkbox" checked={!!form.conIva} onChange={(e) => setForm((f) => ({ ...f, conIva: e.target.checked }))} />
              <span>
                <b>{`Me lo pagan con IVA (${cfg ? ivaTexto(cfg) : "21"} %) y lo sumo a la ganancia`}</b>
                <br />
                <span className="muted">El chofer se calcula sin IVA.</span>
              </span>
            </label>
            <div className="soft mt-s">
              <b>
                {form.conIva && resultado
                  ? `Vuelta completa: ${plata(resultado.vuelta, 0)} + IVA ${plata(resultado.iva ?? "0", 0)} = ${plata(resultado.cobrado ?? resultado.vuelta, 0)}`
                  : `Vuelta completa: ${plata(resultado?.vuelta ?? "0", 0)}`}
              </b>
            </div>
            <div className="grid g2 mt">
              <Campo label="Km totales" error={errores.km}>
                {(id) => <Numero id={id} value={form.km} onChange={(v) => poner("km", v)} suf="km" invalido={!!errores.km} />}
              </Campo>
              <Campo label="Peaje" error={errores.peaje}>
                {(id) => <Numero id={id} value={form.peaje} onChange={(v) => poner("peaje", v)} pre="$" invalido={!!errores.peaje} />}
              </Campo>
              <Campo
                label="Otros gastos (opcional)"
                ayuda={`El chofer (${porcentaje(cfg?.choferPct ?? "15", 0)} de la vuelta) ya está incluido en la cuenta: no lo cargues acá.`}
                error={errores.otros}
              >
                {(id) => <Numero id={id} value={form.otros} onChange={(v) => poner("otros", v)} pre="$" invalido={!!errores.otros} />}
              </Campo>
            </div>
          </div>
          <div className="card">
            <Campo label="Observaciones">
              {(id) => <textarea id={id} value={form.observaciones} onChange={(e) => poner("observaciones", e.target.value)} placeholder="Opcional" />}
            </Campo>
          </div>
        </div>
        <div className="sticky">
          {resultado && cfg ? <ResultadoViajeVista r={resultado} cfg={cfg} /> : <Cargando error={error} />}
          {cfg && editarId && (
            <p className="muted" style={{ fontSize: 13 }}>
              Se recalcula con la configuración guardada en este viaje.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
