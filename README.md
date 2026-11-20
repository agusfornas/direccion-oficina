# Dirección Oficina

App de la empresa para **Lavadero** (partidas de zanahoria: rendimiento y precio a pagar) y
**Transporte** (viajes del camión: gastos y ganancia). Funciona como artefacto de claude.ai:
se abre con la cuenta de claude.ai y los datos quedan guardados y compartidos con el equipo.

## Qué cambió de la v1 a la v2

La v2 hace **las mismas cuentas** que la v1: con los mismos datos da los mismos resultados.
Lo comprueban pruebas automáticas que comparan las dos versiones en miles de casos al azar.
Lo que cambió son arreglos:

| Antes (v1) | Ahora (v2) |
|---|---|
| Lo cargado después de las 21 h quedaba con la fecha del día siguiente (usaba la hora de Londres). | Usa la hora de la computadora. |
| En Lavadero, escribir `1.500` se leía como 1,5. | `1.500` es mil quinientos, igual que en Transporte. |
| En Transporte, un valor con coma y tres decimales (`1,250`) se guardaba bien pero se volvía a leer como 1250. | Lo guardado se lee siempre tal cual. |
| Si dos personas guardaban a la vez, podían recibir el mismo número y una pisaba a la otra. | Cada guardado espera su turno: números siempre distintos. |
| Si dos personas corregían la misma partida, ganaba la última sin aviso. | Avisa "Otra persona cambió esto" y no pisa. |
| El historial de cambios guardaba la fecha pero no quién. | Guarda quién creó, corrigió o eliminó, y se ve en cada partida y viaje. |
| Un error al eliminar no se mostraba. | Se muestra. |
| La app pesaba 1,7 MB al abrir (Excel y gráficos siempre cargados). | Pesa 283 KB; Excel y gráficos se bajan solo cuando se usan. |
| Sin modo oscuro, etiquetas no vinculadas a los campos, historial solo con mouse. | Modo oscuro, campos accesibles para lectores de pantalla y teclado. |

Los datos guardados tienen **la misma forma** que en la v1, así que se mudan copiándolos (`MUDANZA.md`).

## Para trabajar en la app

| Archivo | Para qué |
|---|---|
| `CLAUDE.md` | Reglas y mapa del código. Lo lee Claude al empezar. |
| `PUBLICAR.md` | Receta para publicar una versión nueva. |
| `MUDANZA.md` | Receta para pasar los datos de la app vieja a la nueva (una sola vez). |
| `PENDIENTES.md` | Lista viva de lo que falta o se puede mejorar. |

```bash
npm install
npm run dev      # probar en la computadora (con datos de prueba, no toca los reales)
npm run check    # pruebas + compilación
```
