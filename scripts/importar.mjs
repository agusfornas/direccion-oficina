// Arma importar.sql para cargar en la base de Cloudflare los datos de la app vieja (claude.ai).
//
// Uso:   node scripts/importar.mjs <carpeta>
// donde <carpeta> tiene una subcarpeta por colección con un .json por documento:
//   <carpeta>/partidas/p1.json, <carpeta>/config/v1.json, <carpeta>/tviajes/v3.json, …
// (es justo lo que deja la herramienta ArtifactData con out_dir; ver MUDANZA.md).
//
// Después: npx wrangler d1 execute direccion-oficina --remote --file=importar.sql
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const COLECCIONES = ["partidas", "config", "tviajes", "tconfig"];
const carpeta = process.argv[2];
if (!carpeta || !existsSync(carpeta)) {
  console.error("Uso: node scripts/importar.mjs <carpeta con partidas/, config/, tviajes/, tconfig/>");
  process.exit(1);
}
const texto = (v) => `'${String(v).replace(/'/g, "''")}'`;
/** Algunas herramientas guardan el documento envuelto ({ id, version, data }): se desenvuelve. */
const documento = (j) => (j && typeof j.data === "object" && j.data !== null && !Array.isArray(j.data) ? j.data : j);

const lineas = [readFileSync(new URL("../servidor/esquema.sql", import.meta.url), "utf8")];
const cuenta = {};
for (const col of COLECCIONES) {
  const dir = join(carpeta, col);
  if (!existsSync(dir)) continue;
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const id = archivo.slice(0, -5);
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new Error(`Nombre raro: ${col}/${archivo}`);
    const d = documento(JSON.parse(readFileSync(join(dir, archivo), "utf8")));
    if (!d || typeof d !== "object") throw new Error(`No es un documento: ${col}/${archivo}`);
    delete d.rev;
    lineas.push(
      `INSERT INTO documentos (coleccion, id, datos, rev) VALUES (${texto(col)}, ${texto(id)}, ${texto(JSON.stringify(d))}, 0) ` +
        `ON CONFLICT (coleccion, id) DO UPDATE SET datos = excluded.datos, rev = documentos.rev + 1;`,
    );
    cuenta[col] = (cuenta[col] ?? 0) + 1;
  }
}
// Que la numeración siga desde el número más alto mudado.
lineas.push("DELETE FROM contadores;");
writeFileSync("importar.sql", lineas.join("\n") + "\n");
console.log("importar.sql listo. Documentos por colección:", cuenta);
