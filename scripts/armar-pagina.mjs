// Arma dist/index.html: la plantilla src/pagina.html con los estilos adentro.
// Se corre solo al final de `npm run build`. No editar dist/ a mano.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const plantilla = readFileSync("src/pagina.html", "utf8");
const estilos = readFileSync("src/estilos.css", "utf8");
writeFileSync("dist/index.html", plantilla.replace("/*ESTILOS*/", estilos));
if (!existsSync("dist/app.js")) throw new Error("Falta dist/app.js: ¿falló la compilación?");
console.log("dist/index.html listo");
