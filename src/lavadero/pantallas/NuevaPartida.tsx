// Pantalla "Nueva partida" (y "Corregir partida" cuando viene editarId).
// El resultado se calcula en vivo mientras se carga. El borrador se guarda en este
// navegador, así no se pierde si se cierra la pestaña.
import { useEffect, useMemo, useState } from "react";
import { ErrorApp } from "../../comun/claude";
import { hoy } from "../../comun/fechas";
import { numero } from "../../comun/numeros";
import { avisar, Campo, Cargando, ir, mensajeDe, Numero } from "../../comun/ui";
import { calcularPartida } from "../calculo";
import { partidaVacia } from "../config-inicial";
import * as datos from "../datos";
import type { ConfigLavadero, EntradaPartida, Producto } from "../tipos";
import { tacosYKilos } from "../calculo";
import { limpiarPartida, validarPartida } from "../validar";
import { Resultado } from "./Resultado";

const CLAVE_BORRADOR = "lavadero.borrador";
const leerBorrador = (): EntradaPartida | null => {
  try {
    const t = localStorage.getItem(CLAVE_BORRADOR);
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
};
const guardarBorrador = (e: EntradaPartida | null) => {
  try {
    if (e) localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(e));
    else localStorage.removeItem(CLAVE_BORRADOR);
  } catch {
    /* sin almacenamiento local: no pasa nada */
  }
};

/** El formulario carga por peso promedio: si venía por grupos, los convierte. */
function paraFormulario(e: EntradaPartida): EntradaPartida {
  if (e.pesoModo !== "GRUPOS") return { ...e, precioPagado: "" };
  const { tacos, kgBruto } = tacosYKilos(e);
  return {
    ...e,
    pesoModo: "PROMEDIO",
    precioPagado: "",
    tacos: tacos.toString(),
    pesoPromedio: tacos.isZero() ? "32" : kgBruto.div(tacos).toDecimalPlaces(4).toString(),
  };
}

// "Repetir partida": el detalle deja acá los datos y abre #nueva.
let paraRepetir: EntradaPartida | null = null;
export function repetirPartida(e: EntradaPartida) {
  paraRepetir = paraFormulario({ ...JSON.parse(JSON.stringify(e)), fecha: hoy() });
  ir("#nueva");
}

export function NuevaPartida({ editarId }: { editarId?: number }) {
  const [cfg, setCfg] = useState<{ config: ConfigLavadero; version: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EntradaPartida>(() => {
    if (editarId) return partidaVacia();
    if (paraRepetir) {
      const e = paraRepetir;
      paraRepetir = null;
      return e;
    }
    const b = leerBorrador();
    return b ? paraFormulario(b) : partidaVacia();
  });
  const [numeroPartida, setNumeroPartida] = useState("");
  const [rev, setRev] = useState<number | undefined>();
  const [productores, setProductores] = useState<{ id: number; nombre: string }[]>([]);
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    datos.productores().then(setProductores).catch(() => {});
    (editarId
      ? datos.partida(editarId).then((p) => {
          setForm(paraFormulario(p.input));
          setCfg({ config: p.config, version: p.configVersion });
          setNumeroPartida(p.numero);
          setRev(p.rev ?? 0);
        })
      : datos.configActual().then((v) => setCfg({ config: v.config, version: v.version }))
    ).catch((e) => setError(mensajeDe(e)));
  }, [editarId]);

  useEffect(() => {
    if (!editarId) guardarBorrador(form);
  }, [form, editarId]);

  // Se calcula y valida sobre lo limpio (así "1.500" ya se entiende como mil quinientos).
  const limpia = useMemo(() => limpiarPartida(form), [form]);
  const resultado = useMemo(() => (cfg ? calcularPartida(limpia, cfg.config) : null), [limpia, cfg]);
  const errores = useMemo(() => validarPartida(limpia), [limpia]);
  const marcados = intentoGuardar ? { ...errores, ...erroresServidor } : erroresServidor;
  const poner = <K extends keyof EntradaPartida>(campo: K, v: EntradaPartida[K]) => setForm((f) => ({ ...f, [campo]: v }));
  const ponerBolsas = (id: string, v: string) => setForm((f) => ({ ...f, bolsas: { ...f.bolsas, [id]: v } }));

  const guardar = async () => {
    setIntentoGuardar(true);
    if (Object.keys(errores).length) {
      avisar("Revisá los campos marcados.");
      return;
    }
    setGuardando(true);
    try {
      const p = editarId ? await datos.actualizarPartida(editarId, form, rev) : await datos.crearPartida(form);
      if (!editarId) guardarBorrador(null);
      avisar(editarId ? `Partida ${p.numero} actualizada` : `Partida ${p.numero} guardada`);
      ir(`#historial-${p.id}`);
    } catch (e) {
      if (e instanceof ErrorApp) setErroresServidor(e.errores);
      avisar(e instanceof ErrorApp ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };
  const limpiar = () => {
    setForm(partidaVacia());
    setIntentoGuardar(false);
    setErroresServidor({});
  };

  if (!cfg || !resultado) return <Cargando error={error} />;
  const fila = (p: Producto) => (
    <div className="prod-row" key={p.id}>
      <div>
        <div className="prod-name">
          {p.nombre} <span className="muted">{numero(p.kgBolsa)} kg</span>
        </div>
        {(p.precioVenta === null || p.manoObra === null) && (
          <div className="prod-meta">
            <span style={{ color: "var(--warn)" }}>Falta precio en Configuración</span>
          </div>
        )}
      </div>
      <div>
        <Numero
          value={form.bolsas[p.id]}
          onChange={(v) => ponerBolsas(p.id, v)}
          suf="bol."
          invalido={!!marcados[`bolsas.${p.id}`]}
          ariaLabel={`Bolsas de ${p.nombre}`}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{editarId ? `Corregir partida ${numeroPartida}` : "Nueva partida"}</h1>
        </div>
        <div className="acciones">
          {!editarId && (
            <button className="btn" onClick={limpiar}>
              Limpiar
            </button>
          )}
          {editarId && (
            <button className="btn" onClick={() => ir(`#historial-${editarId}`)}>
              Cancelar
            </button>
          )}
          <button className="btn primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : editarId ? "Guardar cambios" : "Guardar partida"}
          </button>
        </div>
      </div>
      <div className="split">
        <div>
          <div className="card">
            <div className="card-head">
              <h2>Datos generales</h2>
            </div>
            <div className="grid g2">
              <Campo label="Productor" error={marcados.productor}>
                {(id) => (
                  <>
                    <input
                      id={id}
                      type="text"
                      list="lista-productores"
                      value={form.productor}
                      onChange={(e) => poner("productor", e.target.value)}
                      className={marcados.productor ? "invalido" : ""}
                      placeholder="Nombre del productor"
                      autoComplete="off"
                    />
                    <datalist id="lista-productores">
                      {productores.map((p) => (
                        <option key={p.id} value={p.nombre} />
                      ))}
                    </datalist>
                  </>
                )}
              </Campo>
              <Campo label="Fecha" error={marcados.fecha}>
                {(id) => <input id={id} type="date" value={form.fecha} onChange={(e) => poner("fecha", e.target.value)} />}
              </Campo>
            </div>
            <div className="grid g2 mt">
              <Campo label="Cantidad de tacos" error={marcados.tacos}>
                {(id) => <Numero id={id} value={form.tacos} onChange={(v) => poner("tacos", v)} invalido={!!marcados.tacos} suf="tacos" />}
              </Campo>
              <Campo label="Peso promedio por taco" error={marcados.pesoPromedio}>
                {(id) => (
                  <Numero id={id} value={form.pesoPromedio} onChange={(v) => poner("pesoPromedio", v)} invalido={!!marcados.pesoPromedio} suf="kg" />
                )}
              </Campo>
            </div>
            <div className="soft mt-s row" style={{ fontWeight: 700, fontSize: 14 }}>
              <span>Total: {numero(resultado.tacos)} tacos</span>
              <span className="muted">·</span>
              <span>{numero(resultado.kgBruto)} kg brutos</span>
            </div>
            <div className="grid mt">
              <Campo
                label="Precio solicitado o de referencia por kg"
                ayuda="Si no pide precio, poné la referencia de otros productores."
                error={marcados.precioSolicitado}
              >
                {(id) => (
                  <Numero
                    id={id}
                    value={form.precioSolicitado}
                    onChange={(v) => poner("precioSolicitado", v)}
                    pre="$"
                    suf="/kg"
                    invalido={!!marcados.precioSolicitado}
                  />
                )}
              </Campo>
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <h2>Producción</h2>
              <span className="sub">Bolsas obtenidas · admite cero y decimales</span>
            </div>
            <div className="cat-title">
              <i className="dot e" /> Elegida
            </div>
            {cfg.config.productos.filter((p) => p.categoria === "ELEGIDA").map(fila)}
            <div className="cat-title mt">
              <i className="dot c" /> Común
            </div>
            {cfg.config.productos.filter((p) => p.categoria === "COMUN").map(fila)}
          </div>
          <div className="card">
            <Campo label="Notas">
              {(id) => (
                <textarea id={id} value={form.notas} onChange={(e) => poner("notas", e.target.value)} placeholder="Observaciones de la partida (opcional)" />
              )}
            </Campo>
          </div>
        </div>
        <div className="sticky">
          <Resultado r={resultado} productor={form.productor} />
        </div>
      </div>
    </>
  );
}
