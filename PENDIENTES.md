# Pendientes de Dirección Oficina

Lista viva. Se tacha cuando está hecho y probado.

## Puesta en marcha (Cloudflare)
- [x] Pasar de artefacto de claude.ai a página web con login por email (Cloudflare Pages + D1 + Access).
- [x] Crear la cuenta, la base, la página y el login (`CLOUDFLARE.md`). Hecho el 25/11/2026 en la cuenta de Mauricio;
  por ahora solo puede entrar maurianchelonets@gmail.com.
- [ ] Mudanza de datos desde la app vieja (`MUDANZA.md`).
- [ ] Cargar los emails del equipo en Access y pasarles el enlace.
- [ ] Un día de uso real con el equipo: cargar, corregir, eliminar, exportar Excel.
- [ ] Borrar la copia de prueba de claude.ai (https://claude.ai/artifact/AMw7Dvu93AnLfj4TQU3ezr) y sacarle el acceso al equipo a la app vieja.

## Para decidir (no se tocó para no cambiar resultados)
- [ ] **Precio pedido obligatorio.** El formulario exige "Precio solicitado o de referencia", pero el motor
  tiene preparado el caso "sin precio pedido" (paga límite × rendimiento) y las pantallas lo explican
  ("A negociar"). Hoy nunca se usa. ¿Se permite dejarlo vacío? Es cambiar una validación en
  `src/lavadero/validar.ts`.
- [ ] **Precio pagado.** Se guarda vacío siempre (el formulario no lo pide), así que las estadísticas de
  "precio pagado" y "resultado estimado" no tienen datos. ¿Se agrega el campo?
- [ ] **Configuración de Lavadero sin pantalla para** "precio de referencia" ni "mezcla de valuación"
  (REAL / CONFIGURADA). ¿Hace falta editarlos?
- [ ] **Carga por grupos de tacos.** El motor la soporta (`pesoModo: "GRUPOS"`), pero el formulario solo carga
  por peso promedio y convierte los grupos al editar. ¿Se agrega al formulario?

## Mejoras posibles
- [ ] Las versiones de prueba de cada cambio usan la misma base que la app real. Si molesta, se puede
  crear una segunda base solo para pruebas (`[env.preview]` en `wrangler.toml`).
- [ ] Con miles de partidas, el historial y las estadísticas leen todo cada vez. Por ahora alcanza;
  si se pone lento, filtrar por fecha en el servidor.
- [ ] Botón "Exportar todo" (respaldo completo) además del Time Travel de D1.
