// Quién está usando la app. Lo resuelve Cloudflare Access: la persona entra con su email
// y un código, y Access le agrega a cada pedido una "credencial firmada" (un JWT).
// Acá se comprueba esa firma; si no es válida, no se deja leer ni guardar nada.
//
// Hace falta configurar dos variables en Cloudflare (ver CLOUDFLARE.md):
//   ACCESS_EQUIPO  el nombre del equipo de Access (lo que va antes de .cloudflareaccess.com)
//   ACCESS_AUD     el "Application Audience (AUD) Tag" de la aplicación de Access
// En la computadora (MODO=local) no hay Access: todos son "local@prueba".

export interface EnvAcceso {
  MODO?: string;
  ACCESS_EQUIPO?: string;
  ACCESS_AUD?: string;
}

interface Llaves {
  keys: (JsonWebKey & { kid: string })[];
}
let cache: { equipo: string; hasta: number; llaves: Llaves } | null = null;

const deBase64Url = (t: string) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));
const json = (t: string) => JSON.parse(new TextDecoder().decode(deBase64Url(t)));

async function llavesDe(equipo: string, buscar: typeof fetch): Promise<Llaves> {
  if (cache && cache.equipo === equipo && cache.hasta > Date.now()) return cache.llaves;
  const r = await buscar(`https://${equipo}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error("No se pudieron leer las llaves de Cloudflare Access");
  const llaves = (await r.json()) as Llaves;
  cache = { equipo, hasta: Date.now() + 60 * 60 * 1000, llaves };
  return llaves;
}

/** El email de quien hizo el pedido, o null si no hay un login válido. */
export async function quienEs(pedido: Request, env: EnvAcceso, buscar: typeof fetch = fetch): Promise<string | null> {
  if (env.MODO === "local") return "local@prueba";
  const token = pedido.headers.get("Cf-Access-Jwt-Assertion");
  if (!token || !env.ACCESS_EQUIPO || !env.ACCESS_AUD) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  try {
    const cabecera = json(partes[0]);
    const datos = json(partes[1]);
    if (cabecera.alg !== "RS256") return null;
    const llave = (await llavesDe(env.ACCESS_EQUIPO, buscar)).keys.find((k) => k.kid === cabecera.kid);
    if (!llave) return null;
    const clave = await crypto.subtle.importKey("jwk", llave, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const firmaOk = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", clave, deBase64Url(partes[2]), new TextEncoder().encode(`${partes[0]}.${partes[1]}`));
    if (!firmaOk) return null;
    const audiencias: string[] = Array.isArray(datos.aud) ? datos.aud : [datos.aud];
    if (!audiencias.includes(env.ACCESS_AUD)) return null;
    if (typeof datos.exp !== "number" || datos.exp * 1000 < Date.now()) return null;
    if (datos.iss !== `https://${env.ACCESS_EQUIPO}.cloudflareaccess.com`) return null;
    return typeof datos.email === "string" ? datos.email.toLowerCase() : null;
  } catch {
    return null;
  }
}
