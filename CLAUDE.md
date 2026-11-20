# Dirección Oficina — contexto para Claude

> Leé esto entero antes de tocar nada. Tope de este archivo: 8 KB (viaja en cada turno).
> Lo que deja de estar vigente se saca de acá; lo pendiente vive en `PENDIENTES.md`.

## Qué es

App interna de la empresa con dos secciones:
- **Lavadero:** partidas de zanahoria compradas a productores. Calcula rendimiento, costos y
  el precio a pagar (Precio Límite de Compra y Precio Recomendado).
- **Transporte:** viajes del camión. Calcula gasto de gasoil con desgaste, chofer, peajes y ganancia.

Es un **artefacto de claude.ai**: se abre en el navegador con la cuenta de claude.ai y guarda
todo en la base de datos compartida del artefacto. Este repositorio es el código fuente; lo
que se publica es la carpeta `dist/` que arma `npm run build`.

## Cómo hablar

- Español rioplatense, llano. Quien pide los cambios **no es programador**: explicá el
  qué y el por qué sin jerga, y mostrá los riesgos antes de hacer algo que no se deshace.
- Si algo es mala idea, decilo.

## Reglas (no negociables)

1. **Antes de publicar, siempre `npm run check`** (pruebas + compilación). Si falla, no se publica.
2. **Publicar es la receta de `PUBLICAR.md`, paso por paso.** No improvises la publicación.
3. **No cambies la forma de los datos guardados** (colecciones `partidas`, `config`, `tviajes`,
   `tconfig` y sus campos). Agregar campos opcionales sí; renombrar o borrar, no: rompe los datos
   que ya existen. Si hace falta, preguntá primero.
4. **Una fórmula de plata no se cambia sin una prueba nueva** en `*.test.ts` que muestre el
   antes y el después con un ejemplo. Las pruebas de equivalencia con la v1 tienen que seguir pasando
   (salvo las diferencias anotadas a propósito en los tests).
5. **Nunca pongas datos reales** (productores, precios de clientes) en el código ni en las pruebas.
6. **No edites `dist/` a mano** ni `src/pruebas/original/` (es copia textual de la v1, solo para pruebas).
7. Al terminar una tanda: actualizá `PENDIENTES.md` y hacé commit con un mensaje claro en español.

## Cosas que parecen raras pero son a propósito

- **Dos tipos de números.** Lo que escribe una persona ("1.500", "1.234,5") se interpreta UNA vez
  con `normalizarNumero()` al limpiar el formulario. Lo guardado o calculado ("1500", "2.415") se lee
  con `leerNumero()`, que es estricto. Nunca calcules con lo que escribió la persona sin limpiar.
  Explicación completa en `src/comun/numeros.ts`.
- **Guardar con candados.** Crear y editar pasan por `src/comun/guardar.ts` (`crearConNumero`,
  `guardarSinPisar`), que evita números repetidos y que una persona pise el cambio de otra.
  No escribas en la base salteándote esas funciones.
- **Las cuentas de plata usan `Decimal`**, nunca números comunes de JavaScript.
- **Fechas en hora local** (`src/comun/fechas.ts`). Nunca `toISOString()` para una fecha que ve la gente.
- **Espacios duros** (` `) entre número y `%` o `kg` en algunos textos: copian la v1 y evitan
  que "15 %" se corte entre dos líneas. Las pruebas comparan esos textos.
- **Colores solo con variables** de `src/estilos.css` (`var(--blue)`…). Un color suelto rompe el modo oscuro.
- Cada partida y cada viaje guardan **una copia de la configuración** con la que se calcularon:
  cambiar la configuración no modifica lo viejo. Es lo que se quiere.

## Mapa

```
src/
  App.tsx                 inicio, menú y qué pantalla mostrar según el #
  estilos.css             todos los estilos (variables de color arriba, modo oscuro incluido)
  pagina.html             la página que se publica (dist/index.html sale de acá)
  simulador.ts            imita claude.ai para probar en la computadora (no se publica)
  comun/                  números, fechas, conexión con claude.ai, guardado seguro, piezas de pantalla
  lavadero/
    calculo.ts            motor de cálculo de una partida      ← la plata está acá
    explicaciones.ts      textos "Rindió el 87 % del óptimo…"
    calculadora.ts        cuenta de la pantalla Calculadora
    estadisticas.ts       totales y promedios ponderados
    validar.ts            limpiar y validar lo cargado
    datos.ts              leer y guardar en la base
    excel.ts              planillas para exportar
    pantallas/            una por pantalla
  transporte/             misma estructura
  pruebas/original/       motor de la v1, para comparar (no se toca)
```

## Comandos

```bash
npm install          # la primera vez
npm run dev          # abre la app en la computadora con el simulador (datos de prueba)
npm test             # pruebas
npm run check        # pruebas + compilación: lo que hay que correr antes de publicar
```

Si cambiaste pantallas, corré también la prueba en navegador (`pruebas-navegador/prueba.cjs`, instrucciones adentro).

## Dónde está publicada

- App de la empresa: **(completar con la dirección claude.ai/artifact/… después de la primera publicación)**
- Quién la publica: el dueño del artefacto (ver `PUBLICAR.md`).
- La v1 (app vieja): https://claude.ai/artifact/EgmmBquYxip6WDy8Djxr8p — queda como respaldo hasta terminar la mudanza (`MUDANZA.md`).
