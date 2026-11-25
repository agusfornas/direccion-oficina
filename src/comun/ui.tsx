// Piezas de interfaz que usan las dos secciones.
import { useEffect, useId, useState, type ReactNode } from "react";

// ---------- Navegación (por #hash: #nueva, #historial-12, #t-nuevo…) ----------

/** La pantalla actual, según el # de la dirección. */
export function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash || "#inicio");
  useEffect(() => {
    const cambio = () => {
      setHash(window.location.hash || "#inicio");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", cambio);
    return () => window.removeEventListener("hashchange", cambio);
  }, []);
  return hash;
}

export const ir = (hash: string) => {
  window.location.hash = hash;
};

// ---------- Avisos flotantes ("Partida guardada") ----------

let mostrarAviso: ((t: string) => void) | null = null;
/** Muestra un aviso arriba por 3 segundos. */
export const avisar = (texto: string) => mostrarAviso?.(texto);

export function Avisos() {
  const [texto, setTexto] = useState<string | null>(null);
  useEffect(() => {
    let reloj: ReturnType<typeof setTimeout> | undefined;
    mostrarAviso = (t) => {
      // Un aviso nuevo reinicia el reloj (en la v1 el anterior lo cerraba antes de tiempo).
      clearTimeout(reloj);
      setTexto(t);
      reloj = setTimeout(() => setTexto(null), 3200);
    };
    return () => {
      mostrarAviso = null;
      clearTimeout(reloj);
    };
  }, []);
  return (
    <div aria-live="polite">
      {texto && (
        <div className="toast" role="status">
          {texto}
        </div>
      )}
    </div>
  );
}

/** Mensaje de un error para mostrar. */
export const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : "Algo salió mal. Probá de nuevo.");

// ---------- Formularios ----------

/**
 * Campo con etiqueta. La etiqueta queda vinculada al control (para lectores de pantalla
 * y para tocarla en el celular): el hijo recibe el id con una función.
 */
export function Campo({
  label,
  ayuda,
  error,
  children,
}: {
  label: ReactNode;
  ayuda?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {error ? (
        <span className="err" role="alert">
          {error}
        </span>
      ) : ayuda ? (
        <span className="ayuda">{ayuda}</span>
      ) : null}
    </div>
  );
}

/** Entrada de números: acepta "1.234,5", "1234.5", "$ 1500". */
export function Numero({
  id,
  value,
  onChange,
  pre,
  suf,
  invalido,
  placeholder,
  disabled,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  pre?: string;
  suf?: string;
  invalido?: boolean;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className="input-wrap">
      {pre && <span className="pre">{pre}</span>}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className={`num ${pre ? "has-pre" : ""} ${suf ? "has-suf" : ""} ${invalido ? "invalido" : ""}`}
        value={value}
        placeholder={placeholder ?? "0"}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalido || undefined}
        style={suf ? { paddingRight: `calc(${suf.length}ch + 22px)` } : undefined}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ""))}
        onFocus={(e) => e.target.select()}
      />
      {suf && <span className="suf">{suf}</span>}
    </div>
  );
}

/** Botones de opciones excluyentes (Por mes / Por año…). */
export function Opciones<T extends string>({
  value,
  options,
  onChange,
  etiqueta,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  etiqueta?: string;
}) {
  return (
    <div className="seg" role="group" aria-label={etiqueta}>
      {options.map(([v, texto]) => (
        <button key={v} type="button" className={v === value ? "on" : ""} aria-pressed={v === value} onClick={() => onChange(v)}>
          {texto}
        </button>
      ))}
    </div>
  );
}

/** Recuadro con un dato grande. */
export function Kpi({ t, v, s, accent }: { t: ReactNode; v: ReactNode; s?: ReactNode; accent?: boolean }) {
  return (
    <div className={`kpi ${accent ? "accent" : ""}`}>
      <div className="t">{t}</div>
      <div className="v" title={typeof v === "string" ? v : undefined}>
        {v}
      </div>
      {s && <div className="s">{s}</div>}
    </div>
  );
}

/** Fila de tabla que lleva a otra pantalla: con mouse, dedo o teclado (Enter). */
export function FilaLink({ hash, children, etiqueta }: { hash: string; children: ReactNode; etiqueta: string }) {
  return (
    <tr
      className="click"
      tabIndex={0}
      role="link"
      aria-label={etiqueta}
      onClick={() => ir(hash)}
      onKeyDown={(e) => {
        if (e.key === "Enter") ir(hash);
      }}
    >
      {children}
    </tr>
  );
}

/** Tarjeta que se abre y se cierra con un toque (o Enter/espacio). */
export function useDesplegable(): [boolean, Record<string, unknown>] {
  const [abierta, setAbierta] = useState(false);
  const cambiar = () => setAbierta((x) => !x);
  return [
    abierta,
    {
      role: "button",
      tabIndex: 0,
      "aria-expanded": abierta,
      onClick: cambiar,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cambiar();
        }
      },
    },
  ];
}

/** Botón "Eliminar" con confirmación en la misma pantalla (sin ventanitas del navegador). */
export function BotonEliminar({ onEliminar, texto = "Eliminar" }: { onEliminar: () => Promise<void>; texto?: string }) {
  const [preguntando, setPreguntando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  if (!preguntando)
    return (
      <button className="btn danger" onClick={() => setPreguntando(true)}>
        {texto}
      </button>
    );
  return (
    <>
      <button
        className="btn danger"
        disabled={trabajando}
        onClick={async () => {
          setTrabajando(true);
          try {
            await onEliminar();
          } catch (e) {
            // En la v1 un error al eliminar no se mostraba.
            avisar(mensajeDe(e));
            setTrabajando(false);
            setPreguntando(false);
          }
        }}
      >
        {trabajando ? "Eliminando…" : "Sí, eliminar"}
      </button>
      <button className="btn" disabled={trabajando} onClick={() => setPreguntando(false)}>
        No
      </button>
    </>
  );
}

/** Estado de carga con tiempo límite (si la base no contesta, se avisa en vez de quedar "Cargando…"). */
export function useCarga<T>(cargar: () => Promise<T>, deps: unknown[]): { datos: T | null; error: string | null; recargar: () => void } {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => {
    let vivo = true;
    setError(null);
    const reloj = setTimeout(() => vivo && setError("La base de datos está tardando en responder. Revisá la conexión."), 15000);
    cargar()
      .then((d) => vivo && (setDatos(d), setError(null)))
      .catch((e) => vivo && setError(mensajeDe(e)))
      .finally(() => clearTimeout(reloj));
    return () => {
      vivo = false;
      clearTimeout(reloj);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, vuelta]);
  return { datos, error, recargar: () => setVuelta((x) => x + 1) };
}

export function Cargando({ error }: { error?: string | null }) {
  return error ? (
    <div className="aviso bad" role="alert">
      <span aria-hidden>⚠</span>
      <span>{error}</span>
    </div>
  ) : (
    <div className="vacio">Cargando…</div>
  );
}
