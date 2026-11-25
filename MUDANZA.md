# Mudanza de datos: de la app vieja (claude.ai) a la nueva (Cloudflare)

Se hace **una sola vez**, después de `CLOUDFLARE.md` y antes de que el equipo empiece a cargar.
Los datos se guardan con **la misma forma** que en la app vieja: es copiarlos tal cual.

La hace **Mauricio**: es el dueño de la app vieja (el único que puede leer esos datos) y de la
cuenta de Cloudflare (donde se cargan). Si otra persona lo ayuda, tiene que ser miembro de esa cuenta.

## Antes de empezar
Avisá al equipo que **no cargue nada en ninguna de las dos apps** mientras dura (unos minutos).

## Paso 1: bajar los datos de la app vieja (el Claude del autor, en claude.ai o Claude Code)
Con la herramienta **ArtifactData**, sobre `https://claude.ai/artifact/EgmmBquYxip6WDy8Djxr8p`:
- `action: "list"`, `collection: "partidas"`, `query: {"limit": 1000}`, `out_dir: "mudanza"`.
  Si la respuesta trae `next_cursor`, repetir con `query.cursor` hasta que no traiga más.
- Lo mismo con `config`, `tviajes` y `tconfig`.

Queda una carpeta `mudanza/` con `partidas/p1.json`, `config/v1.json`, etc. **Contá cuántos
archivos hay por colección y anotalo.**

⚠ Son datos reales de la empresa: no los subas a GitHub (la carpeta `mudanza/` y el archivo
`importar.sql` están excluidos a propósito). Si los tenés que pasar a otra persona, hacelo por
un medio privado.

## Paso 2: armar el archivo de carga
Desde la carpeta del repo, con la carpeta `mudanza/` adentro:
```bash
node scripts/importar.mjs mudanza
```
Dice cuántos documentos encontró por colección: tiene que coincidir con lo anotado.

## Paso 3: cargar en Cloudflare (quien tiene acceso a la cuenta, en su computadora)
```bash
npx wrangler login
npx wrangler d1 execute direccion-oficina --remote --file=importar.sql
```
`wrangler login` abre el navegador para entrar a Cloudflare. Si se corre de nuevo, no duplica
nada: reemplaza lo que ya estaba.

## Paso 4: comprobar
Abrir la app, ir a Lavadero → Historial y Transporte → Historial y ver los datos. Crear una partida
de prueba: tiene que tomar el número siguiente al más alto mudado. Eliminarla.

## Después
- Borrar `mudanza/` e `importar.sql` de la computadora.
- La app vieja no se borra: queda como respaldo. Sacarle el acceso al equipo para que nadie cargue ahí.
- Anotar en `PENDIENTES.md` la fecha y cuántos documentos se mudaron.
