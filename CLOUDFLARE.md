# Puesta en marcha en Cloudflare (una sola vez)

La hace **el dueño de la cuenta de Cloudflare**, desde el navegador. Son unos 20 minutos.
Todo lo de acá entra en los planes gratis de Cloudflare (Access es gratis hasta 50 personas;
puede que te pida una tarjeta igual, sin cobrar).

Recomendación: que la cuenta sea **de la empresa** (por ejemplo, la de Agustín) y sumar al autor
como miembro (Manage Account → Members), así los dos pueden administrarla.

Los nombres de los menús de Cloudflare cambian seguido: si alguno no coincide, buscá la palabra
clave (D1, Pages, Zero Trust, Access) en el buscador del panel.

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

En este punto la página abre, pero **no muestra datos**: el servidor no deja entrar a nadie
hasta que esté el login (paso 4). Es a propósito.

## 4. El login (Cloudflare Access)
1. Panel → **Zero Trust**. La primera vez te pide un **nombre de equipo** (por ejemplo
   `direccionoficina`) y un plan: elegí **Free**. Anotá el nombre de equipo.
2. **Access → Applications → Add an application → Self-hosted**.
3. Nombre: `Dirección Oficina`. Dominios (agregá los dos):
   - `direccion-oficina.pages.dev`
   - `*.direccion-oficina.pages.dev` (las versiones de prueba de cada cambio)
4. Política: **Allow**, nombre "Equipo", regla **Include → Emails** con los emails de quienes
   pueden entrar (o **Emails ending in** `@tuempresa.com` si todos tienen email de la empresa).
5. Método de entrada: **One-time PIN** (viene activado): la persona pone su email y le llega un código.
6. Guardá. En la aplicación creada, copiá el **Application Audience (AUD) Tag**.
7. Pedile a Claude: *"poné en wrangler.toml ACCESS_EQUIPO = (nombre de equipo) y ACCESS_AUD = (el tag), y subilo"*.
   Cloudflare vuelve a publicar solo en uno o dos minutos.

## 5. Probar
1. Abrí la dirección en una ventana de incógnito.
2. Tiene que pedir el email, mandar un código y, al ponerlo, abrir la app.
3. Cargá una partida de prueba y eliminala.
4. Si hay datos de la app vieja, seguí `MUDANZA.md` **antes** de que el equipo empiece a cargar.

## Día a día
- **Sumar o sacar a alguien:** Zero Trust → Access → Applications → Dirección Oficina → la política
  "Equipo" → editar la lista de emails. No hace falta tocar la app.
- **Publicar cambios:** se hace solo al subir a `main` (ver `PUBLICAR.md`).
- **Respaldo:** D1 guarda la historia de los últimos días ("Time Travel": 7 días en el plan gratis): si se borra algo por
  error, se puede volver atrás desde el panel de D1.
