// Pantalla "Configuración" de Transporte. Cada viaje guarda una copia de la
// configuración con la que se cargó: cambiar algo acá no toca los viajes viejos.
import { useEffect, useMemo, useState } from "react";
import { ErrorApp } from "../../comun/claude";
import { normalizarNumero, numeroFijo } from "../../comun/numeros";
import { avisar, Campo, Cargando, mensajeDe, Numero } from "../../comun/ui";
import { consumoCada100 } from "../calculo";
import * as datos from "../datos";
import type { ConfigTransporte, VersionConfigTransporte } from "../tipos";
import { limpiarConfigTransporte, validarConfigTransporte } from "../validar";

export function ConfiguracionTransporte() {
  const [guardada, setGuardada] = useState<VersionConfigTransporte | null>(null);
  const [form, setForm] = useState<ConfigTransporte | null>(null);
  const [litros, setLitros] = useState("");
  const [km, setKm] = useState("");
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [listo, setListo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () =>
    datos
      .configActual()
      .then((v) => {
        setGuardada(v);
        setForm({ ...v.config });
      })
      .catch((e) => setError(mensajeDe(e)));
  useEffect(() => {
    cargar();
  }, []);
  const errores = useMemo(() => (form ? { ...validarConfigTransporte(limpiarConfigTransporte(form)), ...erroresServidor } : {}), [form, erroresServidor]);
  if (!form || !guardada) return <Cargando error={error} />;

  const hayCambios = JSON.stringify(limpiarConfigTransporte(form)) !== JSON.stringify(limpiarConfigTransporte(guardada.config));
  const poner = (campo: keyof ConfigTransporte, v: string) => {
    setForm((f) => ({ ...f!, [campo]: v }));
    setErroresServidor({});
    setListo("");
  };
  const consumo = consumoCada100(litros, km);
  const guardar = async () => {
    if (Object.keys(errores).length) {
      avisar("Revisá los campos marcados.");
      return;
    }
    setGuardando(true);
    try {
      await datos.guardarConfig(form, "", guardada.version);
      avisar("Configuración guardada");
      await cargar();
      setListo(`Guardado a las ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`);
    } catch (e) {
      if (e instanceof ErrorApp) setErroresServidor(e.errores);
      avisar(mensajeDe(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Configuración</h1>
          <p>Transporte · versión vigente: {guardada.version}</p>
        </div>
        <div className="acciones">
          <button className="btn" disabled={!hayCambios || guardando} onClick={() => setForm({ ...guardada.config })}>
            Descartar cambios
          </button>
          <button className="btn primary" disabled={!hayCambios || guardando} onClick={guardar}>
            {guardando ? "Guardando…" : hayCambios ? "Guardar" : "Guardado"}
          </button>
        </div>
      </div>
      {listo && (
        <div className="aviso ok mb" role="status">
          {listo}. Los viajes nuevos usan esta configuración.
        </div>
      )}
      <div className="grid g2">
        <div className="card" style={{ margin: 0 }}>
          <div className="card-head">
            <h2>Gasoil y camión</h2>
          </div>
          <div className="grid">
            <Campo label="Precio del gasoil" error={errores.precioGasoil}>
              {(id) => <Numero id={id} value={form.precioGasoil} onChange={(v) => poner("precioGasoil", v)} pre="$" suf="/litro" invalido={!!errores.precioGasoil} />}
            </Campo>
            <Campo label="Consumo del camión" error={errores.consumoL100}>
              {(id) => <Numero id={id} value={form.consumoL100} onChange={(v) => poner("consumoL100", v)} suf="L/100 km" invalido={!!errores.consumoL100} />}
            </Campo>
          </div>
          <div className="soft mt">
            <div className="lbl">Calcular el consumo</div>
            <div className="grid g2 mt-s">
              <Campo label="Litros gastados">{(id) => <Numero id={id} value={litros} onChange={setLitros} suf="L" />}</Campo>
              <Campo label="Km recorridos">{(id) => <Numero id={id} value={km} onChange={setKm} suf="km" />}</Campo>
            </div>
            <div className="row mt-s" style={{ justifyContent: "space-between" }}>
              <b>
                {consumo
                  ? `${numeroFijo(normalizarNumero(litros), 0)} L ÷ ${numeroFijo(normalizarNumero(km), 0)} km × 100 = ${numeroFijo(consumo.toString(), 1)} L/100 km`
                  : "Litros ÷ km × 100"}
              </b>
              <button className="btn sm" disabled={!consumo} onClick={() => consumo && poner("consumoL100", consumo.toDecimalPlaces(2).toString())}>
                Usar este valor
              </button>
            </div>
          </div>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <div className="card-head">
            <h2>Desgaste, chofer e IVA</h2>
          </div>
          <div className="grid">
            <Campo
              label="Factor de desgaste"
              ayuda="Multiplica los litros. Cubre desgaste, seguro, cubiertas, etc. Por defecto 1,5."
              error={errores.factorDesgaste}
            >
              {(id) => <Numero id={id} value={form.factorDesgaste} onChange={(v) => poner("factorDesgaste", v)} suf="×" invalido={!!errores.factorDesgaste} />}
            </Campo>
            <Campo label="Chofer" ayuda="Porcentaje sobre la vuelta completa (ida + vuelta). Por defecto 15 %." error={errores.choferPct}>
              {(id) => <Numero id={id} value={form.choferPct} onChange={(v) => poner("choferPct", v)} suf="% de la vuelta" invalido={!!errores.choferPct} />}
            </Campo>
            <Campo label="IVA" ayuda="Solo para los viajes que tildás “con IVA”. Se suma a la ganancia, no al chofer." error={errores.ivaPct}>
              {(id) => <Numero id={id} value={form.ivaPct ?? "21"} onChange={(v) => poner("ivaPct", v)} suf="%" invalido={!!errores.ivaPct} />}
            </Campo>
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
            Cada viaje guarda la configuración con la que se cargó: si cambiás algo acá, los viajes viejos no cambian.
          </p>
        </div>
      </div>
    </>
  );
}
