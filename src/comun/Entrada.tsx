// Pantalla de entrada: tarjetas con el nombre de cada persona y teclado para el PIN de 4 números.
// Si la lista está vacía (app recién instalada), pide el nombre de la primera persona.
import { useEffect, useState } from "react";
import { crearPersona, entrar, ErrorApp, personas as listar, type Persona } from "./servidor";
import { Cargando, mensajeDe } from "./ui";

function Teclado({ alCompletar, ocupado }: { alCompletar: (pin: string) => void; ocupado: boolean }) {
  const [pin, setPin] = useState("");
  const tocar = (d: string) => {
    if (ocupado) return;
    const nuevo = pin + d;
    if (nuevo.length < 4) return setPin(nuevo);
    // Se borra en el acto: si se borrara un instante después, un toque rápido reusaría el PIN anterior.
    setPin("");
    alCompletar(nuevo);
  };
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) tocar(e.key);
      if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });
  return (
    <div className="pin">
      <div className="pin-puntos" aria-label={`${pin.length} de 4 números`}>
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < pin.length ? "lleno" : ""} />
        ))}
      </div>
      <div className="pin-teclas">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => tocar(d)} disabled={ocupado}>
            {d}
          </button>
        ))}
        <span />
        <button type="button" onClick={() => tocar("0")} disabled={ocupado}>
          0
        </button>
        <button type="button" onClick={() => setPin((p) => p.slice(0, -1))} disabled={ocupado} aria-label="Borrar">
          ⌫
        </button>
      </div>
    </div>
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
        <h1>Dirección Oficina</h1>
        <p className="inicio-s">¿Quién sos?</p>
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
        <p className="inicio-pie">Tocá tu nombre para entrar.</p>
      </div>
    );

  return (
    <div className="inicio entrada">
      <button type="button" className="volver-lista" onClick={volver}>
        ‹ Cambiar de persona
      </button>
      <h1>Hola, {elegida.nombre}</h1>
      <p className="inicio-s">
        {elegida.tienePin ? "Poné tu PIN." : primerPin === null ? "Es tu primera vez: elegí un PIN de 4 números." : "Ponelo de nuevo para confirmar."}
      </p>
      <Teclado alCompletar={conPin} ocupado={ocupado} />
      <p className="err mt-s" role="alert" style={{ minHeight: 20, textAlign: "center" }}>
        {aviso && aviso !== "Ponelo de nuevo para confirmar." ? aviso : ""}
      </p>
    </div>
  );
}
