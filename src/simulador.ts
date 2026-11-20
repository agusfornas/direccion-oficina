// SIMULADOR de claude.ai para probar la app en la computadora (npm run dev).
// Imita la base de datos, el usuario y las descargas guardando todo en este navegador.
// Solo se activa en modo desarrollo y si no hay un claude.ai de verdad: NUNCA llega a la
// app publicada (vite lo saca de la compilación final).
//
// Para empezar de cero: en la consola del navegador, localStorage.removeItem("simulador.db")

const CLAVE = "simulador.db";
type Docs = Record<string, Record<string, unknown>>;
const leer = (): Docs => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? "{}");
  } catch {
    return {};
  }
};
const guardar = (d: Docs) => localStorage.setItem(CLAVE, JSON.stringify(d));
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const candados = new Map<string, { holder: string; hasta: number }>();
const demora = () => new Promise((r) => setTimeout(r, 30 + Math.random() * 40));

function snapshot(ruta: string, docs: Docs) {
  const datos = docs[ruta];
  return { id: ruta.split("/").pop()!, exists: !!datos, data: () => (datos ? copia(datos) : undefined), metadata: { fromCache: false, hasPendingWrites: false } };
}

function refDoc(ruta: string) {
  return {
    id: ruta.split("/").pop()!,
    path: ruta,
    async get() {
      await demora();
      return snapshot(ruta, leer());
    },
    async set(datos: Record<string, unknown>) {
      await demora();
      const d = leer();
      d[ruta] = copia(datos);
      guardar(d);
    },
    async update(datos: Record<string, unknown>) {
      await demora();
      const d = leer();
      if (!d[ruta]) throw { code: "invalid_argument", message: "no existe" };
      d[ruta] = { ...d[ruta], ...copia(datos) };
      guardar(d);
    },
    async delete() {
      const d = leer();
      delete d[ruta];
      guardar(d);
    },
    async acquire({ holder, ttlMs = 30000 }: { holder: string; ttlMs?: number }) {
      await demora();
      const c = candados.get(ruta);
      if (c && c.hasta > Date.now() && c.holder !== holder) return { acquired: false, expiresAt: new Date(c.hasta).toISOString() };
      candados.set(ruta, { holder, hasta: Date.now() + ttlMs });
      return { acquired: true, holder };
    },
  };
}

function coleccion(ruta: string) {
  const prefijo = ruta + "/";
  return {
    path: ruta,
    doc: (id?: string) => refDoc(prefijo + (id ?? Math.random().toString(36).slice(2))),
    async get() {
      await demora();
      const d = leer();
      const docs = Object.keys(d)
        .filter((k) => k.startsWith(prefijo) && !k.slice(prefijo.length).includes("/"))
        .sort()
        .map((k) => snapshot(k, d));
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
    },
  };
}

export function instalarSimulador() {
  const db = { doc: refDoc, collection: coleccion };
  const user = {
    id: async () => "u_simulador",
    profiles: async (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { name: id === "u_simulador" ? "Persona de prueba" : "" }])),
  };
  const downloads = {
    async save({ filename, data }: { filename: string; data: ArrayBuffer }) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data]));
      a.download = filename;
      a.click();
    },
  };
  const capacidades: Record<string, unknown> = { db, user, downloads };
  window.claude = { use: async (nombre: string) => capacidades[nombre] ?? null };
  console.info("Simulador de claude.ai activo: los datos quedan en este navegador.");
}
