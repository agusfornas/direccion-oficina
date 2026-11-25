// Pruebas del servidor: numeración, guardado sin pisar, entrada con PIN y direcciones.
// Usan SQLite de Node, el mismo motor que Cloudflare D1.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { crearNumerado, crearSiNoExiste, leer, listar, prepararBase, reemplazar, type Base, type Sentencia } from "./almacen";
import { borrarPin, crearPersona, entrar, INTENTOS_MAXIMOS, listarPersonas, quitarPersona, sesionDe } from "./personas";
import { manejar } from "./rutas";

// node:sqlite se carga así porque el empaquetador de las pruebas todavía no lo reconoce.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

/** Una base en memoria con la misma forma de uso que D1. */
function baseDePrueba(): Base {
  const sqlite = new DatabaseSync(":memory:");
  const sentencia = (sql: string, valores: unknown[] = []): Sentencia => {
    const st = () => sqlite.prepare(sql);
    return {
      bind: (...v) => sentencia(sql, v),
      first: async <T,>() => ((st().get(...(valores as never[])) as T) ?? null),
      all: async <T,>() => ({ results: st().all(...(valores as never[])) as T[] }),
      run: async () => ({ meta: { changes: Number(st().run(...(valores as never[])).changes) } }),
    };
  };
  // D1 ejecuta cada lote como una transacción, de a uno: acá se ponen en fila igual.
  let fila: Promise<unknown> = Promise.resolve();
  return {
    prepare: (sql) => sentencia(sql),
    exec: async (sql) => sqlite.exec(sql),
    batch(ss) {
      const r = fila.then(async () => {
        sqlite.exec("BEGIN");
        try {
          const res = [];
          for (const s of ss) res.push(await s.all());
          sqlite.exec("COMMIT");
          return res;
        } catch (e) {
          sqlite.exec("ROLLBACK");
          throw e;
        }
      });
      fila = r.catch(() => {});
      return r;
    },
  };
}
async function nueva() {
  const db = baseDePrueba();
  await prepararBase(db);
  return db;
}

describe("almacén", () => {
  it("numera 1, 2, 3… y pone el número como texto o como número", async () => {
    const db = await nueva();
    const a = await crearNumerado(db, "partidas", "p", true, { productor: "A", id: 0, numero: "" }, "x@y");
    const b = await crearNumerado(db, "partidas", "p", true, { productor: "B", id: 0, numero: "" }, "x@y");
    expect([a.id, a.numero, b.id, b.numero]).toEqual([1, "0001", 2, "0002"]);
    const v = await crearNumerado(db, "tviajes", "v", false, { id: 0, numero: 0 }, "x@y");
    expect([v.id, v.numero]).toEqual([1, 1]);
    expect((await leer(db, "partidas", "p2"))?.productor).toBe("B");
  });

  it("20 guardados a la vez: 20 números distintos", async () => {
    const db = await nueva();
    const r = await Promise.all(Array.from({ length: 20 }, () => crearNumerado(db, "partidas", "p", true, { id: 0 }, "x@y")));
    expect(new Set(r.map((d) => d.id)).size).toBe(20);
    expect((await listar(db, "partidas")).length).toBe(20);
  });

  it("con datos mudados (hasta la 57) sigue en la 58, aunque el contador esté atrasado", async () => {
    const db = await nueva();
    await crearNumerado(db, "partidas", "p", true, { id: 0 }, "x@y"); // contador en 1
    await db.prepare("INSERT INTO documentos (coleccion, id, datos, rev) VALUES ('partidas', 'p57', ?, 0)").bind(JSON.stringify({ id: 57 })).run();
    const d = await crearNumerado(db, "partidas", "p", true, { id: 0 }, "x@y");
    expect(d.id).toBe(58);
  });

  it("corregir: guarda si nadie cambió, rechaza si otro cambió, avisa si no existe", async () => {
    const db = await nueva();
    const a = await crearNumerado(db, "partidas", "p", true, { tacos: "1", id: 0 }, "x@y");
    expect(a.rev).toBe(0);
    const b = await reemplazar(db, "partidas", "p1", { ...a, tacos: "2" }, 0, "x@y");
    expect([b.tacos, b.rev]).toEqual(["2", 1]);
    await expect(reemplazar(db, "partidas", "p1", { ...a, tacos: "3" }, 0, "z@y")).rejects.toMatchObject({ estado: 409 });
    expect((await leer(db, "partidas", "p1"))?.tacos).toBe("2");
    await expect(reemplazar(db, "partidas", "p9", { tacos: "3" }, 0, "z@y")).rejects.toMatchObject({ estado: 404 });
  });

  it("crear con id fijo falla si ya existe (dos personas guardando la misma versión de config)", async () => {
    const db = await nueva();
    await crearSiNoExiste(db, "config", "v2", { version: 2, quien: null }, "a@y");
    await expect(crearSiNoExiste(db, "config", "v2", { version: 2 }, "b@y")).rejects.toMatchObject({ estado: 409 });
  });

  it("anota quién hizo el cambio según el login, no según la página", async () => {
    const db = await nueva();
    const d = await crearNumerado(db, "partidas", "p", true, { id: 0, auditoria: [{ accion: "crear", quien: "mentira@x" }] }, "real@empresa");
    expect((d.auditoria as { quien: string }[])[0].quien).toBe("real@empresa");
    const c = await crearSiNoExiste(db, "config", "v1", { version: 1, quien: "otro" }, "real@empresa");
    expect(c.quien).toBe("real@empresa");
  });
});

// ---------- Entrada con tarjeta + PIN ----------

describe("personas y PIN", () => {
  it("la primera vez elige su PIN, después entra con él; la sesión identifica a la persona", async () => {
    const db = await nueva();
    const m = await crearPersona(db, "  Mauricio  ");
    expect(await listarPersonas(db)).toEqual([{ id: m.id, nombre: "Mauricio", tienePin: false }]);
    await expect(entrar(db, m.id, "1234", false)).rejects.toMatchObject({ estado: 409 }); // todavía no eligió
    const s1 = await entrar(db, m.id, "1234", true);
    expect((await listarPersonas(db))[0].tienePin).toBe(true);
    await expect(entrar(db, m.id, "9999", true)).rejects.toMatchObject({ estado: 409 }); // no se puede pisar el PIN
    const s2 = await entrar(db, m.id, "1234", false);
    expect(await sesionDe(db, s1.token)).toEqual({ id: m.id, nombre: "Mauricio" });
    expect(await sesionDe(db, s2.token)).toEqual({ id: m.id, nombre: "Mauricio" });
    expect(await sesionDe(db, "a".repeat(64))).toBeNull();
    expect(await sesionDe(db, "cualquier cosa")).toBeNull();
  });

  it("PIN con formato inválido se rechaza", async () => {
    const db = await nueva();
    const m = await crearPersona(db, "Ana");
    for (const pin of ["123", "12345", "abcd", " 123"]) await expect(entrar(db, m.id, pin, true)).rejects.toMatchObject({ estado: 400 });
  });

  it("después de 5 errores la tarjeta se traba 15 minutos, aunque después pongan el PIN bien", async () => {
    const db = await nueva();
    const m = await crearPersona(db, "Ana");
    await entrar(db, m.id, "4321", true);
    const t0 = 1_000_000_000_000;
    for (let i = 1; i < INTENTOS_MAXIMOS; i++) await expect(entrar(db, m.id, "0000", false, t0)).rejects.toMatchObject({ estado: 401 });
    await expect(entrar(db, m.id, "0000", false, t0)).rejects.toMatchObject({ estado: 423 });
    await expect(entrar(db, m.id, "4321", false, t0 + 60_000)).rejects.toMatchObject({ estado: 423 });
    expect((await entrar(db, m.id, "4321", false, t0 + 16 * 60_000)).nombre).toBe("Ana");
  });

  it("acertar reinicia la cuenta de errores", async () => {
    const db = await nueva();
    const m = await crearPersona(db, "Ana");
    await entrar(db, m.id, "4321", true);
    for (let i = 1; i < INTENTOS_MAXIMOS; i++) await expect(entrar(db, m.id, "0000", false)).rejects.toMatchObject({ estado: 401 });
    await entrar(db, m.id, "4321", false);
    for (let i = 1; i < INTENTOS_MAXIMOS; i++) await expect(entrar(db, m.id, "0000", false)).rejects.toMatchObject({ estado: 401 });
  });

  it("borrar el PIN o quitar a la persona cierra sus sesiones", async () => {
    const db = await nueva();
    const a = await crearPersona(db, "Ana");
    const s = await entrar(db, a.id, "1111", true);
    await borrarPin(db, a.id);
    expect(await sesionDe(db, s.token)).toBeNull();
    const s2 = await entrar(db, a.id, "2222", true);
    await quitarPersona(db, a.id);
    expect(await sesionDe(db, s2.token)).toBeNull();
    expect(await listarPersonas(db)).toEqual([]);
    await expect(entrar(db, a.id, "2222", false)).rejects.toMatchObject({ estado: 404 });
  });

  it("no se repiten nombres", async () => {
    const db = await nueva();
    await crearPersona(db, "Ana");
    await expect(crearPersona(db, "ana")).rejects.toMatchObject({ estado: 409 });
    await expect(crearPersona(db, "   ")).rejects.toMatchObject({ estado: 400 });
  });
});

describe("direcciones /api", () => {
  const app = async () => {
    const env = { DB: await nueva() };
    let cookie = "";
    const llamar = async (url: string, metodo = "GET", body?: unknown) => {
      const r = await manejar(
        new Request("https://app" + url, { method: metodo, body: body ? JSON.stringify(body) : undefined, headers: cookie ? { cookie } : {} }),
        env,
      );
      const sc = r.headers.get("set-cookie");
      if (sc) cookie = sc.split(";")[0].endsWith("=") ? "" : sc.split(";")[0];
      return { estado: r.status, datos: await r.json(), setCookie: sc };
    };
    return { llamar, sinCookie: () => (cookie = "") };
  };

  it("sin sesión: solo la pantalla de entrada; los datos dan 401", async () => {
    const { llamar } = await app();
    expect((await llamar("/api/c/partidas")).estado).toBe(401);
    expect((await llamar("/api/yo")).estado).toBe(401);
    expect((await llamar("/api/personas")).datos).toEqual([]);
  });

  it("primera persona sin sesión; la segunda ya no", async () => {
    const { llamar, sinCookie } = await app();
    const m = await llamar("/api/personas", "POST", { nombre: "Mauricio" });
    expect(m.estado).toBe(201);
    sinCookie();
    expect((await llamar("/api/personas", "POST", { nombre: "Intruso" })).estado).toBe(401);
  });

  it("recorrido completo: entrar, cookie segura, datos, quién, salir", async () => {
    const { llamar } = await app();
    const m = (await llamar("/api/personas", "POST", { nombre: "Mauricio" })).datos;
    const e = await llamar("/api/entrar", "POST", { id: m.id, pin: "2468", crear: true });
    expect(e.estado).toBe(200);
    expect(e.setCookie).toMatch(/^__Host-sesion=[0-9a-f]{64}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=\d+$/);
    expect((await llamar("/api/yo")).datos).toEqual({ nombre: "Mauricio" });
    const c = await llamar("/api/c/partidas/nuevo", "POST", { prefijo: "p", numeroComoTexto: true, documento: { id: 0, numero: "", auditoria: [{ accion: "crear", quien: "otro" }] } });
    expect([c.estado, c.datos.numero, c.datos.auditoria[0].quien]).toEqual([201, "0001", "Mauricio"]);
    expect((await llamar("/api/c/partidas/p1", "PUT", { documento: c.datos, revEsperada: 0 })).estado).toBe(200);
    expect((await llamar("/api/c/partidas/p1", "PUT", { documento: c.datos, revEsperada: 0 })).estado).toBe(409);
    expect((await llamar("/api/c/usuarios")).estado).toBe(404);
    expect((await llamar("/api/c/partidas/nuevo", "POST", { prefijo: "DROP TABLE", documento: {} })).estado).toBe(400);
    const a = (await llamar("/api/personas", "POST", { nombre: "Ana" })).datos;
    expect((await llamar(`/api/personas/${a.id}/borrar-pin`, "POST")).estado).toBe(200);
    expect((await llamar(`/api/personas/${m.id}/quitar`, "POST")).estado).toBe(400); // no a sí mismo
    expect((await llamar("/api/salir", "POST")).estado).toBe(200);
    expect((await llamar("/api/yo")).estado).toBe(401);
  });

  it("PIN equivocado da 401 con los intentos que quedan", async () => {
    const { llamar, sinCookie } = await app();
    const m = (await llamar("/api/personas", "POST", { nombre: "Mauricio" })).datos;
    await llamar("/api/entrar", "POST", { id: m.id, pin: "2468", crear: true });
    sinCookie();
    const r = await llamar("/api/entrar", "POST", { id: m.id, pin: "0000" });
    expect([r.estado, r.datos.error]).toEqual([401, "PIN incorrecto. Te quedan 4 intentos."]);
  });
});
