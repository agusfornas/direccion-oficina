# Puesta en marcha en Cloudflare (una sola vez)

La hace **el dueño de la cuenta de Cloudflare**, desde el navegador. Son unos 20 minutos.
Todo lo de acá entra en el plan gratis de Cloudflare.

La cuenta es **de Mauricio**, el dueño de la empresa: así la app, los datos y el login quedan
a su nombre. Puede sumar a Agustín como miembro (Manage Account → Members) para que lo ayude.

Los nombres de los menús de Cloudflare cambian seguido: si alguno no coincide, buscá la palabra
clave (D1, Pages) en el buscador del panel.

## 1. Crear la cuenta
https://dash.cloudflare.com/sign-up

## 2. Crear la base de datos
1. Panel → **Storage & Databases → D1** → **Create**.
2. Nombre: `direccion-oficina`. Crear.
3. Copiá el **Database ID** (algo como `a1b2c3d4-…`).
4. Pedile a Claude: *"poné este Database ID en wrangler.toml y subilo: …"*.
   (Es el campo `database_id`. No es secreto.)

Las tablas las crea la app sola la primera vez que se usa.

## 3. Publicar la página desde GitHub
1. Panel → **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**
   (o "Import an existing Git repository").
2. Autorizá a Cloudflare en GitHub **solo para el repo `direccion-oficina`**.
3. Elegí `agusfornas/direccion-oficina`, rama de producción `main`.
4. Configuración de compilación:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Variable de entorno de compilación: `NODE_VERSION` = `22`
5. **Save and Deploy**. Al terminar te da la dirección: `direccion-oficina.pages.dev`
   (o parecida). Anotala en `CLAUDE.md`.

## 4. La entrada (tarjetas + PIN)
No hay que configurar nada en Cloudflare: la entrada la maneja la app.
1. Abrí la dirección. Como la lista está vacía, pide el nombre de la **primera persona**: poné el tuyo.
2. Tocá tu tarjeta y elegí tu PIN de 4 números (dos veces).
3. Desde **Inicio → Personas** agregá al resto. Cada uno elige su PIN la primera vez que toca su tarjeta.

⚠ Mientras la lista está vacía, cualquiera que llegue a la dirección puede crear la primera persona:
hacé el paso 1 apenas se publique.

## 5. Probar
1. Abrí la dirección en una ventana de incógnito: tienen que aparecer las tarjetas.
2. Entrá con tu PIN, cargá una partida de prueba y eliminala.
4. Si hay datos de la app vieja, seguí `MUDANZA.md` **antes** de que el equipo empiece a cargar.

## Día a día
- **Sumar o sacar a alguien, o borrar un PIN olvidado:** en la app, Inicio → Personas.
- **Publicar cambios:** se hace solo al subir a `main` (ver `PUBLICAR.md`).
- **Respaldo:** D1 guarda la historia de los últimos días ("Time Travel": 7 días en el plan gratis): si se borra algo por
  error, se puede volver atrás desde el panel de D1.
