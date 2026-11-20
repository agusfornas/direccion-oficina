# Pendientes de Dirección Oficina

Lista viva. Se tacha cuando está hecho y probado.

## Puesta en marcha de la v2
- [ ] Primera publicación desde la cuenta del dueño (`PUBLICAR.md`) y anotar la dirección en `CLAUDE.md`.
- [ ] Mudanza de datos desde la v1 (`MUDANZA.md`).
- [ ] Compartir con el equipo como Editor por email (o Colaborador en plan de equipo) y sacarles el acceso a la v1.
- [ ] Probar con el equipo un día de uso real: cargar, corregir, eliminar, exportar Excel.

## Para decidir (no se tocó para no cambiar resultados)
- [ ] **Precio pedido obligatorio.** El formulario exige "Precio solicitado o de referencia", pero el motor
  tiene preparado el caso "sin precio pedido" (paga límite × rendimiento) y las pantallas lo explican
  ("A negociar"). Hoy nunca se usa. ¿Se permite dejarlo vacío? Es cambiar una validación en
  `src/lavadero/validar.ts`.
- [ ] **Precio pagado.** Se guarda vacío siempre (el formulario no lo pide), así que las estadísticas de
  "precio pagado" y "resultado estimado" no tienen datos. ¿Se agrega el campo al formulario o al detalle?
- [ ] **Configuración de Lavadero sin pantalla para** "precio de referencia" ni "mezcla de valuación"
  (REAL / CONFIGURADA). Se pueden ver en el Excel de cada partida. ¿Hace falta editarlos?
- [ ] **Carga por grupos de tacos.** El motor la soporta (`pesoModo: "GRUPOS"`), pero el formulario solo carga
  por peso promedio y convierte los grupos al editar. ¿Se agrega al formulario?

## Mejoras posibles
- [ ] Cuando haya muchos datos (miles de partidas), el historial y las estadísticas leen todo cada vez.
  Por ahora alcanza; si se pone lento, filtrar por fecha en la base.
- [ ] Botón "Exportar todo" (respaldo completo en un archivo) por si algún día se quiere salir de claude.ai.
