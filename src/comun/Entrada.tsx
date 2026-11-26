// Pantalla de entrada: lista con el nombre de cada persona y campo para el PIN de 4 números.
// Si la lista está vacía (app recién instalada), pide el nombre de la primera persona.
import { useEffect, useRef, useState } from "react";
import { crearPersona, entrar, ErrorApp, personas as listar, type Persona } from "./servidor";
import { Cargando, mensajeDe } from "./ui";

/**
 * Campo de PIN: se escribe con el teclado numérico del teléfono (o de la computadora) y se ve
 * como ••••. Entra solo al completar el cuarto número; el botón "Entrar" queda por si acaso.
 */
function CampoPin({ alCompletar, ocupado }: { alCompletar: (pin: string) => void; ocupado: boolean }) {
  const [pin, setPin] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!ocupado) campo.current?.focus();
  }, [ocupado]);
  const mandar = (p: string) => {
    if (ocupado || p.length !== 4) return;
    // Se borra en el acto: si se borrara un instante después, un toque rápido reusaría el PIN anterior.
    setPin("");
    alCompletar(p);
  };
  return (
    <form
      className="pin-form"
      onSubmit={(e) => {
        e.preventDefault();
        mandar(pin);
      }}
    >
      <input
        ref={campo}
        id="pin"
        className="pin-campo"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        placeholder="PIN"
        aria-label="PIN de 4 números"
        value={pin}
        disabled={ocupado}
        onChange={(e) => {
          const p = e.target.value.replace(/\D/g, "").slice(0, 4);
          if (p.length === 4) mandar(p);
          else setPin(p);
        }}
      />
      <button className="btn primary pin-entrar" type="submit" disabled={ocupado || pin.length !== 4}>
        Entrar
      </button>
    </form>
  );
}

export function Entrada({ alEntrar }: { alEntrar: (nombre: string) => void }) {
  const [lista, setLista] = useState<Persona[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegida, setElegida] = useState<Persona | null>(null);
  const [primerPin, setPrimerPin] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");

  // Mismo fondo gris que el inicio (estilo lista del teléfono).
  useEffect(() => {
    document.documentElement.classList.add("en-inicio");
    return () => document.documentElement.classList.remove("en-inicio");
  }, []);

  const cargar = () =>
    listar()
      .then((l) => (setLista(l), setError(null)))
      .catch((e) => setError(mensajeDe(e)));
  useEffect(() => {
    cargar();
  }, []);

  const volver = () => {
    setElegida(null);
    setPrimerPin(null);
    setAviso("");
  };
  const conPin = async (pin: string) => {
    if (!elegida) return;
    const creando = !elegida.tienePin;
    if (creando && primerPin === null) {
      setPrimerPin(pin);
      setAviso("Ponelo de nuevo para confirmar.");
      return;
    }
    if (creando && pin !== primerPin) {
      setPrimerPin(null);
      setAviso("No coinciden. Elegí tu PIN otra vez.");
      return;
    }
    setOcupado(true);
    try {
      const r = await entrar(elegida.id, pin, creando);
      alEntrar(r.nombre);
    } catch (e) {
      setAviso(mensajeDe(e));
      if (e instanceof ErrorApp && e.estado === 409) await cargar().then(volver);
    } finally {
      setOcupado(false);
    }
  };

  if (!lista) return <Cargando error={error} />;

  if (lista.length === 0)
    return (
      <div className="inicio entrada">
        <h1>Dirección Oficina</h1>
        <p className="inicio-s">Primera vez. ¿Cómo te llamás? Vas a ser la primera persona de la lista.</p>
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await crearPersona(nombreNuevo);
              await cargar();
            } catch (err) {
              setAviso(mensajeDe(err));
            }
          }}
        >
          <input id="primer-nombre" type="text" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} placeholder="Tu nombre" aria-label="Tu nombre" />
          <button className="btn primary" type="submit">
            Seguir
          </button>
        </form>
        {aviso && <p className="err mt-s">{aviso}</p>}
      </div>
    );

  if (!elegida)
    return (
      <div className="inicio entrada">
        <h1 className="mb-lista">Dirección Oficina</h1>
        <div className="inicio-cap">Personas</div>
        <div className="inicio-grupo">
          {lista.map((p) => (
            <button key={p.id} type="button" className="inicio-fila tarjeta" onClick={() => (setElegida(p), setAviso(""))}>
              <span className="ic navy avatar" aria-hidden>
                {p.nombre.slice(0, 1).toUpperCase()}
              </span>
              <span className="tx">
                <span className="t">{p.nombre}</span>
              </span>
              <span className="ch" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div className="inicio entrada">
      <button type="button" className="volver-lista" onClick={volver}>
        ‹ Cambiar de persona
      </button>
      <div className="pin-tarjeta">
        <h1>Hola, {elegida.nombre}</h1>
        <p className="pin-s">
          {elegida.tienePin
            ? "Ingresá tu PIN de 4 números."
            : primerPin === null
              ? "Es tu primera vez: elegí un PIN de 4 números."
              : "Ponelo de nuevo para confirmar."}
        </p>
        <CampoPin alCompletar={conPin} ocupado={ocupado} />
        <p className="err mt-s" role="alert" style={{ minHeight: 20 }}>
          {aviso && aviso !== "Ponelo de nuevo para confirmar." ? aviso : ""}
        </p>
      </div>
    </div>
  );
}
