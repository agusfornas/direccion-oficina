# Mudanza de datos: de la app vieja (v1) a la nueva (v2)

Se hace **una sola vez**, después de la primera publicación de la v2 (`PUBLICAR.md`).
La tiene que hacer **el Claude del dueño de la app vieja**: solo él puede leer esa base.

La v2 guarda los datos con **la misma forma** que la v1, así que la mudanza es copiar los
documentos tal cual. No hay que transformar nada.

## Antes de empezar

1. Avisá al equipo que **no cargue nada en ninguna de las dos apps** mientras dura la mudanza
   (son unos minutos). Si alguien carga en la vieja después de copiar, ese dato no pasa.
2. Anotá las dos direcciones:
   - Vieja: `https://claude.ai/artifact/EgmmBquYxip6WDy8Djxr8p`
   - Nueva: la que está en `CLAUDE.md` → "Dónde está publicada".

## Pasos (para Claude, con la herramienta ArtifactData)

1. **Leer la vieja**, colección por colección, guardando en archivos:
   `action: "list"`, `url`: la vieja, `collection`: `config`, `query: {"limit": 1000}`,
   `out_dir`: una carpeta temporal. Repetir con `partidas`, `tconfig` y `tviajes`.
   Si alguna respuesta trae `next_cursor`, seguir pidiendo con ese cursor hasta que no traiga más.
2. **Contar** cuántos documentos hay en cada colección y decírselo a la persona antes de escribir.
3. **Revisar que la nueva esté vacía** (`list` de las mismas colecciones en la nueva).
   Si la nueva ya tiene partidas o viajes, **pará y preguntá**: copiar encima mezclaría datos.
   (Si solo tiene `config/v1` o `tconfig/v1` creados al abrirla, se pueden pisar con los de la vieja.)
4. **Escribir en la nueva** con `action: "batch"`, de a 50 documentos por vez, `op: "set"`,
   con **la misma colección y el mismo `doc_id`** que tenían (por ejemplo `partidas` / `p12`) y
   el contenido tal cual (`file_path` al archivo bajado en el paso 1).
   Si un documento ya existe en la nueva (por ejemplo `config/v1`), la herramienta pide su `version`
   como `if_version`: leelo primero y pasala.
   No copies nada de las colecciones `candados` ni `contadores` (la v1 no las tiene; la v2 las crea sola).
5. **Verificar**: volver a contar en la nueva; tiene que dar lo mismo que en el paso 2.
6. **Probar**: abrir la nueva, ir a Lavadero → Historial y Transporte → Historial, y confirmar con
   la persona que ve sus datos.

## Después

- Compartir la app nueva con el equipo (ver "Quién puede cargar datos" en `PUBLICAR.md`).
- La app vieja **no se borra**: queda como respaldo. Conviene sacarle el acceso al equipo para
  que nadie cargue ahí por costumbre.
- Anotar en `PENDIENTES.md` que la mudanza está hecha, con la fecha y cuántos documentos se copiaron.

## Si algo sale mal

La mudanza no toca la app vieja (solo la lee). En el peor caso, se vacía la nueva y se vuelve a empezar.
