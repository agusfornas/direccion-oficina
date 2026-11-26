# Dirección Oficina — contexto para Claude

> Leé esto entero antes de tocar nada. Tope de este archivo: 8 KB (viaja en cada turno).
> Lo que deja de estar vigente se saca de acá; lo pendiente vive en `PENDIENTES.md`.

## Qué es

App interna de la empresa con dos secciones:
- **Lavadero:** partidas de zanahoria compradas a productores. Calcula rendimiento, costos y
  el precio a pagar (Precio Límite de Compra y Precio Recomendado).
- **Transporte:** viajes del camión. Calcula gasto de gasoil con desgaste, chofer, peajes y ganancia.

Es una **página web en Cloudflare**: Pages (la página) y D1 (la base de datos). Se entra tocando
la tarjeta con tu nombre y poniendo un PIN de 4 números. Se publica sola al subir a `main` (`PUBLICAR.md`).
La v1 era un artefacto de claude.ai; los datos tienen la misma forma (`MUDANZA.md`).

## Cómo hablar

- Español rioplatense, llano. Quien pide los cambios **no es programador**: explicá el
  qué y el por qué sin jerga, y mostrá los riesgos antes de hacer algo que no se deshace.
- Si algo es mala idea, decilo.

## Reglas (no negociables)

1. **Antes de subir, siempre `npm run check`** (pruebas + compilación). Si falla, no se sube.
2. **Nunca trabajes directo en `main`**: todo lo que llega a `main` se publica. Rama + pull request (`PUBLICAR.md`).
3. **No cambies la forma de los datos guardados** (colecciones `partidas`, `config`, `tviajes`,
   `tconfig` y sus campos). Agregar campos opcionales sí; renombrar o borrar, no. Si hace falta, preguntá.
4. **Una fórmula de plata no se cambia sin una prueba nueva** en `*.test.ts` con el antes y el después.
   Las pruebas de equivalencia con la v1 tienen que seguir pasando (salvo diferencias anotadas en los tests).
5. **Nunca datos reales en el repo** (productores, precios, `mudanza/`, `importar.sql`).
6. **La entrada no se afloja.** Toda dirección de datos exige una sesión válida (`servidor/personas.ts`, tarjeta + PIN).
   No agregues direcciones sin sesión ni atajos. El dueño eligió PIN corto a propósito (25/11/2026: "protección
   contra curiosos"); lo que lo sostiene es la traba de 5 intentos: no la saques ni la aflojes.
7. No edites `src/pruebas/original/` (copia textual de la v1, solo para pruebas).
8. Al terminar una tanda: actualizá `PENDIENTES.md` y hacé commit con un mensaje claro en español.

## Cosas que parecen raras pero son a propósito

- **Dos tipos de números.** Lo que escribe una persona ("1.500", "1.234,5") se interpreta UNA vez
  con `normalizarNumero()` al limpiar el formulario. Lo guardado o calculado ("1500", "2.415") se lee
  con `leerNumero()`, que es estricto. Explicación en `src/comun/numeros.ts`. Excepción: el **peso por taco**
  usa `normalizarPeso()`, donde el punto es siempre decimal ("32.490" = 32,49 kg; el teclado del iPhone no trae coma).
- **Lo exacto se decide en el servidor.** El número de partida/viaje y el "no pisar cambios ajenos"
  (columna `rev`) se resuelven en una sola operación de la base (`servidor/almacen.ts`). La página
  siempre guarda por `src/comun/servidor.ts`; no inventes otra forma de escribir.
- **"Quién" lo pone el servidor** según la sesión (nombre de la tarjeta), aunque la página mande otra cosa.
- **Lista vacía = cualquiera crea la primera persona.** Es para la instalación; con alguien en la lista ya no se puede.
- **Las cuentas de plata usan `Decimal`**, nunca números comunes de JavaScript.
- **Fechas en hora local** (`src/comun/fechas.ts`). Nunca `toISOString()` para una fecha que ve la gente.
- **Espacios duros** (` `) entre número y `%` o `kg` en algunos textos: copian la v1. Las pruebas los comparan.
- **Colores solo con variables** de `src/estilos.css` (`var(--blue)`…). Un color suelto rompe el modo oscuro.
- Cada partida y cada viaje guardan **una copia de la configuración** con la que se calcularon.

## Mapa

```
servidor/                el servidor (Cloudflare Functions); se prueba sin Cloudflare
  rutas.ts               direcciones /api/…
  almacen.ts             guardar y leer en la base; numeración y "no pisar"
  personas.ts            entrada: tarjetas, PIN, traba por intentos, sesiones (cookie 90 días)
  esquema.sql            las tablas
functions/api/[[ruta]].ts  entrada que usa Cloudflare (solo llama a servidor/rutas.ts)
src/                     la página
  App.tsx                inicio, menú y qué pantalla mostrar según el #
  estilos.css            todos los estilos (modo oscuro incluido)
  comun/                 números, fechas, conexión con el servidor, piezas de pantalla
  lavadero/              calculo.ts (la plata), explicaciones, calculadora, estadisticas,
                         validar, datos, excel, pantallas/
  transporte/            misma estructura
  pruebas/original/      motor de la v1, para comparar (no se toca)
scripts/importar.mjs     mudanza de datos desde la v1
wrangler.toml            configuración de Cloudflare (la base)
```

## Comandos

```bash
npm install          # la primera vez
npm run local        # la app completa en la computadora (http://localhost:8788), base de prueba
npm test             # pruebas
npm run check        # pruebas + compilación: antes de cada subida
```

Si cambiaste pantallas, corré también `pruebas-navegador/prueba.cjs` (instrucciones adentro).
La base de prueba local vive en `.wrangler/estado/`; para empezar de cero, borrá esa carpeta.

## Dónde está

- App de la empresa: https://direccion-oficina.pages.dev (cuenta de Cloudflare de Mauricio)
- Código: https://github.com/agusfornas/direccion-oficina
- La v1 (app vieja): https://claude.ai/artifact/EgmmBquYxip6WDy8Djxr8p — respaldo hasta terminar `MUDANZA.md`.
