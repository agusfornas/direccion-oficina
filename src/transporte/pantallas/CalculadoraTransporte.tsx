// Pantalla "Calculadora" de Transporte: cuánto combustible se gasta en X km (sin desgaste).
import { useEffect, useState } from "react";
import { leerEscrito, numeroFijo, plata } from "../../comun/numeros";
import { Campo, Cargando, mensajeDe, Numero } from "../../comun/ui";
import * as datos from "../datos";
import type { ConfigTransporte } from "../tipos";

const n = (v: string) => leerEscrito(v)?.toNumber() ?? 0;
const sinComaCero = (t: string) => t.replace(/,0$/, "");

export function CalculadoraTransporte() {
  const [cfg, setCfg] = useState<ConfigTransporte | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [km, setKm] = useState("");
  const [precio, setPrecio] = useState<string | null>(null);
  useEffect(() => {
    // Se vuelve a leer la configuración al volver a la pestaña (por si la cambiaron).
    const cargar = () =>
      datos
        .configActual()
        .then((v) => setCfg(v.config))
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
  if (!cfg) return <Cargando error={error} />;

  const precioUsado = precio ?? cfg.precioGasoil ?? "";
  const kmN = n(km);
  const precioN = n(precioUsado);
  const consumo = Number(cfg.consumoL100) || 0;
  const listo = kmN > 0 && precioN > 0 && consumo > 0;
  const litros = listo ? (kmN * consumo) / 100 : 0;
  const gasto = litros * precioN;
  const f1 = (v: number, d = 1) => numeroFijo(String(v), d);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calculadora</h1>
          <p>Transporte · solo combustible, sin desgaste</p>
        </div>
      </div>
      <div className="card">
        <div className="grid g2">
          <Campo label="Km del viaje">{(id) => <Numero id={id} value={km} onChange={setKm} suf="km" placeholder="0" />}</Campo>
          <Campo label="Precio del combustible" ayuda="Viene de Configuración. Cambiarlo acá no toca Configuración.">
            {(id) => <Numero id={id} value={precioUsado} onChange={setPrecio} pre="$" suf="/litro" placeholder="0" />}
          </Campo>
        </div>
        <p className="muted calc-opt">
          {consumo > 0
            ? `Consumo: ${sinComaCero(numeroFijo(cfg.consumoL100, 1))} L cada 100 km (de Configuración).`
            : "Falta cargar el consumo del camión en Configuración."}
        </p>
      </div>
      <div className="card">
        <div className="calc-head">
          <h2>Gasto de combustible</h2>
          <span className="sub">Lo que vas a gastar en esos km</span>
        </div>
        {listo ? (
          <>
            <div className="calc-grande">{plata(String(gasto), 0)}</div>
            <p className="calc-nota2">
              {`Litros: ${f1(kmN, 0)} km × ${sinComaCero(f1(consumo, 1))} ÷ 100 = `}
              <b>{`${sinComaCero(f1(litros, 1))} litros`}</b>
            </p>
            <p className="calc-nota2">
              {`Gasto: ${sinComaCero(f1(litros, 1))} L × ${plata(String(precioN), 0)} = `}
              <b>{plata(String(gasto), 0)}</b>
            </p>
          </>
        ) : (
          <p className="muted">Cargá los km{precioN > 0 ? "" : " y el precio del combustible"}.</p>
        )}
      </div>
    </>
  );
}
