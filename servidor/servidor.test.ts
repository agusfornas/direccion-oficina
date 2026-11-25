// Pruebas del servidor: numeración, guardado sin pisar, login de Access y direcciones.
// Usan SQLite de Node, el mismo motor que Cloudflare D1.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { quienEs } from "./acceso";
import { crearNumerado, crearSiNoExiste, leer, listar, prepararBase, reemplazar, type Base, type Sentencia } from "./almacen";
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

// ---------- Login de Cloudflare Access ----------

const b64url = (b: ArrayBuffer | Uint8Array | string) =>
  Buffer.from(typeof b === "string" ? b : b instanceof Uint8Array ? b : new Uint8Array(b)).toString("base64url");

async function llaveYFirma() {
  const par = (await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const publica = { ...(await crypto.subtle.exportKey("jwk", par.publicKey)), kid: "k1" };
  const firmar = async (datos: Record<string, unknown>, kid = "k1") => {
    const c = b64url(JSON.stringify({ alg: "RS256", kid }));
    const p = b64url(JSON.stringify(datos));
    const f = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", par.privateKey, new TextEncoder().encode(`${c}.${p}`));
    return `${c}.${p}.${b64url(f)}`;
  };
  const buscar = (async () => new Response(JSON.stringify({ keys: [publica] }))) as unknown as typeof fetch;
  return { firmar, buscar };
}
const ENV = { ACCESS_EQUIPO: "empresa", ACCESS_AUD: "aud123" };
const valido = () => ({ email: "Ana@Empresa.com", aud: ["aud123"], exp: Math.floor(Date.now() / 1000) + 600, iss: "https://empresa.cloudflareaccess.com" });
const pedido = (token?: string, url = "https://app/api/yo", init: RequestInit = {}) =>
  new Request(url, { ...init, headers: token ? { "Cf-Access-Jwt-Assertion": token, "content-type": "application/json" } : { "content-type": "application/json" } });

describe("login (Cloudflare Access)", () => {
  it("acepta una credencial válida y devuelve el email", async () => {
    const { firmar, buscar } = await llaveYFirma();
    expect(await quienEs(pedido(await firmar(valido())), ENV, buscar)).toBe("ana@empresa.com");
  });
  it("rechaza: sin credencial, otra aplicación, vencida, otro emisor, firma alterada, sin configurar", async () => {
    const { firmar, buscar } = await llaveYFirma();
    expect(await quienEs(pedido(), ENV, buscar)).toBeNull();
    expect(await quienEs(pedido(await firmar({ ...valido(), aud: ["otra"] })), ENV, buscar)).toBeNull();
    expect(await quienEs(pedido(await firmar({ ...valido(), exp: 1000 })), ENV, buscar)).toBeNull();
    expect(await quienEs(pedido(await firmar({ ...valido(), iss: "https://otro.cloudflareaccess.com" })), ENV, buscar)).toBeNull();
    const t = await firmar(valido());
    const alterado = t.split(".").map((x, i) => (i === 1 ? b64url(JSON.stringify({ ...valido(), email: "jefe@empresa.com" })) : x)).join(".");
    expect(await quienEs(pedido(alterado), ENV, buscar)).toBeNull();
    expect(await quienEs(pedido(t), {}, buscar)).toBeNull();
  });
  it("en la computadora (MODO=local) no pide login", async () => {
    expect(await quienEs(pedido(), { MODO: "local" })).toBe("local@prueba");
  });
});

describe("direcciones /api", () => {
  it("sin login: 401 en todo", async () => {
    const r = await manejar(pedido(undefined, "https://app/api/c/partidas"), { ...ENV, DB: await nueva() });
    expect(r.status).toBe(401);
  });
  it("recorrido completo: yo, crear, leer, listar, corregir, conflicto, colección inválida", async () => {
    const env = { MODO: "local", DB: await nueva() };
    const llamar = async (url: string, metodo = "GET", body?: unknown) => {
      const r = await manejar(new Request("https://app" + url, { method: metodo, body: body ? JSON.stringify(body) : undefined }), env);
      return { estado: r.status, datos: await r.json() };
    };
    expect((await llamar("/api/yo")).datos).toEqual({ email: "local@prueba" });
    const c = await llamar("/api/c/partidas/nuevo", "POST", { prefijo: "p", numeroComoTexto: true, documento: { id: 0, numero: "", productor: "X" } });
    expect([c.estado, c.datos.numero]).toEqual([201, "0001"]);
    expect((await llamar("/api/c/partidas/p1")).datos.productor).toBe("X");
    expect((await llamar("/api/c/partidas")).datos).toHaveLength(1);
    expect((await llamar("/api/c/partidas/p1", "PUT", { documento: { ...c.datos, productor: "Y" }, revEsperada: 0 })).estado).toBe(200);
    expect((await llamar("/api/c/partidas/p1", "PUT", { documento: { ...c.datos, productor: "Z" }, revEsperada: 0 })).estado).toBe(409);
    expect((await llamar("/api/c/partidas/p99")).estado).toBe(404);
    expect((await llamar("/api/c/usuarios")).estado).toBe(404);
    expect((await llamar("/api/c/partidas/../x")).estado).toBe(404);
    expect((await llamar("/api/c/partidas/nuevo", "POST", { prefijo: "DROP TABLE", documento: {} })).estado).toBe(400);
  });
});
