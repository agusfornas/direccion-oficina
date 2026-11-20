# Cómo publicar la app

Receta para Claude (Claude Code, en la web, la app de escritorio o la terminal). Seguila paso
por paso. **Publica siempre la misma persona: el dueño del artefacto**, porque un artefacto solo
lo puede actualizar quien lo publicó (o un Editor invitado por él).

## 1. Revisar que todo esté bien

```bash
npm install
npm run check
```

Si alguna prueba falla o la compilación da error, **no publiques**: arreglalo primero o avisale a la persona.

## 2. Ver qué archivos hay que subir

```bash
ls dist
```

Tiene que haber: `index.html`, `app.js`, `logo.png` y varios `parte-*.js`.

## 3a. Primera publicación (todavía no existe el artefacto)

Llamá a la herramienta **Artifact** con:

- `file_path`: `dist/index.html`
- `files`: un mapa con **todos** los demás archivos de `dist/`, cada uno a su ruta. Ejemplo:
  `{"app.js": "dist/app.js", "logo.png": "dist/logo.png", "parte-graficos.js": "dist/parte-graficos.js", "parte-exceljs.min.js": "dist/parte-exceljs.min.js", "parte-Estadisticas.js": "dist/parte-Estadisticas.js", "parte-EstadisticasTransporte.js": "dist/parte-EstadisticasTransporte.js"}`
  (usá los nombres reales que dio `ls dist`).
- `capabilities`: `{"db": {}, "user": {"scopes": ["profile"]}, "downloads": true}`
  - `db`: la base de datos compartida.
  - `user`: saber quién hizo cada cambio y mostrar su nombre en el "Historial de cambios".
  - `downloads`: poder bajar los Excel.
- `icon`: `"chart"`
- `description`: `"Lavadero y Transporte: partidas, precios, viajes y estadísticas de la empresa."`

Después:
1. Anotá la dirección que devuelve (claude.ai/artifact/…) en `CLAUDE.md`, sección "Dónde está publicada", y hacé commit.
2. Compartila con el equipo (ver "Quién puede cargar datos" abajo).
3. Si había datos en la app vieja, seguí `MUDANZA.md` **antes** de que el equipo empiece a cargar.

## 3b. Actualización (el artefacto ya existe)

Igual que la primera vez, pero:
- agregá `url`: la dirección anotada en `CLAUDE.md`;
- **no pases `capabilities` ni `icon`** (así quedan los que ya tiene);
- si un archivo `parte-*.js` dejó de existir en `dist/`, pasalo en `files` con valor `null` para borrarlo.

Si la herramienta dice que el artefacto cambió desde la última vez que lo leíste, leelo
(`action: "read"`) y volvé a publicar: nadie más debería estar publicando, así que avisale a la persona.

## 4. Comprobar

1. Abrí el artefacto (`action: "open"`).
2. Con la herramienta **ArtifactData**, `action: "list"`, `collection: "partidas"` (y `tviajes`):
   tiene que leer sin error. Si la base está vacía, es normal en la primera publicación.
3. Contale a la persona qué publicaste en dos o tres líneas, sin jerga.

## Quién puede cargar datos

La base solo deja **escribir** a:
- el dueño del artefacto;
- personas invitadas **por email como Editor** (mientras el artefacto **no** esté compartido también por link);
- en un plan de equipo (Team o Enterprise), los miembros de la organización que tengan acceso de Colaborador o más.

Quien entra solo por un link público, o como Lector, **puede ver pero no guardar**. Si alguien dice
"no me deja guardar", casi siempre es esto: revisá cómo se le compartió.
