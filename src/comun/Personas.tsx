// Pantalla "Personas" (#personas): quién puede entrar. Agregar, quitar y borrar el PIN
// de alguien que se lo olvidó (la próxima vez que toque su tarjeta, elige uno nuevo).
import { useState } from "react";
import { borrarPin, crearPersona, personas, quitarPersona } from "./servidor";
import { avisar, Campo, Cargando, mensajeDe, useCarga } from "./ui";

export function Personas({ yo }: { yo: string }) {
  const { datos: lista, error, recargar } = useCarga(personas, []);
  const [nombre, setNombre] = useState("");
  const [preguntando, setPreguntando] = useState<string | null>(null);
  const hacer = async (accion: () => Promise<unknown>, ok: string) => {
    try {
      await accion();
      avisar(ok);
      setPreguntando(null);
      recargar();
    } catch (e) {
      avisar(mensajeDe(e));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <a href="#inicio" className="btn sm ghost" style={{ marginLeft: -10 }}>
            ← Inicio
          </a>
          <h1>Personas</h1>
          <p>Quién puede entrar. Cada una toca su tarjeta y pone su PIN de 4 números.</p>
        </div>
      </div>
      <div className="card">
        <form
          className="row"
          style={{ alignItems: "flex-end" }}
          onSubmit={(e) => {
            e.preventDefault();
            hacer(() => crearPersona(nombre), `${nombre.trim()} agregado. Elige su PIN la primera vez que toque su tarjeta.`).then(() => setNombre(""));
          }}
        >
          <Campo label="Agregar persona">{(id) => <input id={id} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" />}</Campo>
          <button className="btn primary" type="submit" disabled={!nombre.trim()}>
            Agregar
          </button>
        </form>
      </div>
      <div className="card">
        {!lista ? (
          <Cargando error={error} />
        ) : (
          <div className="tabla-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>PIN</th>
                  <th className="r">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.nombre}</b>
                      {p.nombre === yo && <span className="muted"> (vos)</span>}
                    </td>
                    <td>{p.tienePin ? "Elegido" : <span className="muted">Lo elige al entrar</span>}</td>
                    <td className="r">
                      {preguntando === `pin-${p.id}` ? (
                        <span className="acciones" style={{ justifyContent: "flex-end" }}>
                          <button className="btn sm danger" onClick={() => hacer(() => borrarPin(p.id), `PIN de ${p.nombre} borrado.`)}>
                            Sí, borrar PIN
                          </button>
                          <button className="btn sm" onClick={() => setPreguntando(null)}>
                            No
                          </button>
                        </span>
                      ) : preguntando === `quitar-${p.id}` ? (
                        <span className="acciones" style={{ justifyContent: "flex-end" }}>
                          <button className="btn sm danger" onClick={() => hacer(() => quitarPersona(p.id), `${p.nombre} ya no puede entrar.`)}>
                            Sí, quitar
                          </button>
                          <button className="btn sm" onClick={() => setPreguntando(null)}>
                            No
                          </button>
                        </span>
                      ) : (
                        <span className="acciones" style={{ justifyContent: "flex-end" }}>
                          {p.tienePin && (
                            <button className="btn sm" onClick={() => setPreguntando(`pin-${p.id}`)}>
                              Olvidó el PIN
                            </button>
                          )}
                          {p.nombre !== yo && (
                            <button className="btn sm danger" onClick={() => setPreguntando(`quitar-${p.id}`)}>
                              Quitar
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
