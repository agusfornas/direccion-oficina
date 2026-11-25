// Armazón de la app: pantalla de inicio, barra de arriba y qué pantalla mostrar según el #.
//
// Direcciones:
//   #inicio                          inicio (elegir Lavadero o Transporte)
//   #nueva  #configuracion  #historial  #historial-12  #editar-12  #estadisticas  #calculadora   (Lavadero)
//   #t-nuevo  #t-configuracion  #t-historial  #t-historial-7  #t-editar-7  #t-estadisticas  #t-calculadora   (Transporte)
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Entrada } from "./comun/Entrada";
import { Personas } from "./comun/Personas";
import { olvidarQuienSoy, quienSoy, salir } from "./comun/servidor";
import { Avisos, useHash } from "./comun/ui";
import { Calculadora } from "./lavadero/pantallas/Calculadora";
import { Configuracion } from "./lavadero/pantallas/Configuracion";
import { DetallePartida } from "./lavadero/pantallas/DetallePartida";
import { Historial } from "./lavadero/pantallas/Historial";
import { NuevaPartida } from "./lavadero/pantallas/NuevaPartida";
import { CalculadoraTransporte } from "./transporte/pantallas/CalculadoraTransporte";
import { ConfiguracionTransporte } from "./transporte/pantallas/ConfiguracionTransporte";
import { DetalleViaje } from "./transporte/pantallas/DetalleViaje";
import { HistorialViajes } from "./transporte/pantallas/HistorialViajes";
import { NuevoViaje } from "./transporte/pantallas/NuevoViaje";

// Las estadísticas usan la librería de gráficos (pesada): se bajan recién al abrirlas.
const Estadisticas = lazy(() => import("./lavadero/pantallas/Estadisticas").then((m) => ({ default: m.Estadisticas })));
const EstadisticasTransporte = lazy(() =>
  import("./transporte/pantallas/EstadisticasTransporte").then((m) => ({ default: m.EstadisticasTransporte })),
);

const MENU_LAVADERO: [string, string][] = [
  ["#nueva", "Nueva partida"],
  ["#configuracion", "Configuración"],
  ["#historial", "Historial"],
  ["#estadisticas", "Estadísticas"],
  ["#calculadora", "Calculadora"],
];
const MENU_TRANSPORTE: [string, string][] = [
  ["#t-nuevo", "Nuevo viaje"],
  ["#t-configuracion", "Configuración"],
  ["#t-historial", "Historial"],
  ["#t-estadisticas", "Estadísticas"],
  ["#t-calculadora", "Calculadora"],
];

const IconoLavadero = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15.5 8.5c-1.8-1.8-4.3-1.3-5.8.2L3.3 19.4c-.5.8.5 1.8 1.3 1.3l10.7-6.4c1.5-1.5 2-4-.2-5.8z" />
    <path d="M8.2 12.8l1.6 1.6M10.6 10.4l1.3 1.3M6.4 15.8l1.2 1.2" />
    <path d="M15.5 8.5c-.3-2 .4-4 2-5.5M15.5 8.5c2 .3 4-.4 5.5-2M15.5 8.5l3.5-3.5" />
  </svg>
);
const IconoTransporte = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="17.5" r="1.8" fill="#fff" />
    <circle cx="17" cy="17.5" r="1.8" fill="#fff" />
  </svg>
);

function Inicio({ yo, alSalir }: { yo: string; alSalir: () => void }) {
  return (
    <div className="inicio">
      <div className="inicio-k">Inicio</div>
      <h1>Dirección Oficina</h1>
      <p className="inicio-s">¿Qué querés ver?</p>
      <a href="#nueva" className="inicio-op">
        <span className="ic navy">
          <IconoLavadero />
        </span>
        <span className="tx">
          <span className="t">Lavadero</span>
          <span className="d">Partidas, precios y calculadora</span>
        </span>
        <span className="ch" aria-hidden="true">
          ›
        </span>
      </a>
      <a href="#t-nuevo" className="inicio-op">
        <span className="ic blue">
          <IconoTransporte />
        </span>
        <span className="tx">
          <span className="t">Transporte</span>
          <span className="d">Viajes, gastos y ganancia</span>
        </span>
        <span className="ch" aria-hidden="true">
          ›
        </span>
      </a>
      <p className="quien-soy">
        Entraste como <b>{yo}</b> · <a href="#personas">Personas</a> ·{" "}
        <a
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            alSalir();
          }}
        >
          Salir
        </a>
      </p>
    </div>
  );
}

/** Decide qué pantalla mostrar. Devuelve también la sección y qué ítem del menú resaltar. */
function pantallaPara(hash: string, yo: string, alSalir: () => void): { pantalla: ReactNode; seccion: string; menu: [string, string][]; activo: string } {
  const ruta = hash.replace(/^#\/?/, "");
  if (ruta === "" || ruta === "inicio") return { pantalla: <Inicio yo={yo} alSalir={alSalir} />, seccion: "", menu: [], activo: "" };
  if (ruta === "personas") return { pantalla: <Personas yo={yo} />, seccion: "", menu: [], activo: "" };
  if (ruta.startsWith("t-")) {
    const [, que, num] = ruta.split("-");
    const id = num ? Number(num) : undefined;
    const activo = que === "editar" ? "#t-historial" : `#t-${que}`;
    const base = { seccion: "Transporte", menu: MENU_TRANSPORTE };
    if (que === "configuracion") return { ...base, activo, pantalla: <ConfiguracionTransporte /> };
    if (que === "historial" && id) return { ...base, activo, pantalla: <DetalleViaje key={id} id={id} /> };
    if (que === "historial") return { ...base, activo, pantalla: <HistorialViajes /> };
    if (que === "editar" && id) return { ...base, activo, pantalla: <NuevoViaje key={`e${id}`} editarId={id} /> };
    if (que === "estadisticas") return { ...base, activo, pantalla: <EstadisticasTransporte /> };
    if (que === "calculadora") return { ...base, activo, pantalla: <CalculadoraTransporte /> };
    return { ...base, activo: "#t-nuevo", pantalla: <NuevoViaje key={hash} /> };
  }
  const [que, num] = ruta.split(/[-/]/);
  const id = num ? Number(num) : undefined;
  const activo = `#${que === "editar" ? "historial" : que}`;
  const base = { seccion: "Lavadero", menu: MENU_LAVADERO };
  if (que === "configuracion") return { ...base, activo, pantalla: <Configuracion /> };
  if (que === "historial" && id) return { ...base, activo, pantalla: <DetallePartida key={id} id={id} /> };
  if (que === "historial") return { ...base, activo, pantalla: <Historial /> };
  if (que === "editar" && id) return { ...base, activo, pantalla: <NuevaPartida key={`e${id}`} editarId={id} /> };
  if (que === "estadisticas") return { ...base, activo, pantalla: <Estadisticas /> };
  if (que === "calculadora") return { ...base, activo, pantalla: <Calculadora /> };
  return { ...base, activo: "#nueva", pantalla: <NuevaPartida key={hash} /> };
}

export function App() {
  const hash = useHash();
  // undefined = averiguando; null = no entró (pantalla de tarjetas); texto = su nombre.
  const [yo, setYo] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    quienSoy().then(setYo);
    const vencida = () => {
      olvidarQuienSoy();
      setYo(null);
    };
    window.addEventListener("sesion-vencida", vencida);
    return () => window.removeEventListener("sesion-vencida", vencida);
  }, []);
  const alSalir = async () => {
    await salir().catch(() => {});
    olvidarQuienSoy();
    setYo(null);
  };

  if (yo === undefined) return <div className="vacio">Cargando…</div>;
  if (yo === null)
    return (
      <main>
        <Entrada
          alEntrar={(nombre) => {
            olvidarQuienSoy();
            setYo(nombre);
          }}
        />
        <Avisos />
      </main>
    );

  const { pantalla, seccion, menu, activo } = pantallaPara(hash, yo, alSalir);
  return (
    <>
      {menu.length > 0 && (
        <header className="topbar">
          <div className="topbar-in">
            <a href="#inicio" className="brand" title="Volver al inicio">
              <img className="brand-logo" src="logo.png" alt="" />
              <span className="txt">{seccion || "Dirección Oficina"}</span>
            </a>
            <nav className="nav" aria-label={`Menú de ${seccion}`}>
              <a href="#inicio" className="ir-inicio" aria-label="Volver al inicio">
                ⌂ Inicio
              </a>
              {menu.map(([h, t]) => (
                <a key={h} href={h} className={activo === h ? "activo" : ""} aria-current={activo === h ? "page" : undefined}>
                  {t}
                </a>
              ))}
            </nav>
          </div>
        </header>
      )}
      <main>
        <Suspense fallback={<div className="vacio">Cargando…</div>}>{pantalla}</Suspense>
      </main>
      <Avisos />
    </>
  );
}
