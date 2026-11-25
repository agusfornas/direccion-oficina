# Pendientes de Dirección Oficina

Lista viva. Se tacha cuando está hecho y probado.

## Puesta en marcha (Cloudflare)
- [x] Pasar de artefacto de claude.ai a página web (Cloudflare Pages + D1).
- [x] Entrada con tarjeta + PIN de 4 números (25/11/2026, pedido del dueño; reemplazó al login por email de Access).
- [x] Crear la cuenta, la base y la página (`CLOUDFLARE.md`). Hecho el 25/11/2026 en la cuenta de Mauricio.
- [ ] Mauricio elige su PIN; después se saca el login por email de Cloudflare Access (Zero Trust → Access → Applications).
- [x] ~~Mudanza de datos desde la app vieja~~: no hace falta, el artefacto era solo un prototipo sin datos reales (25/11/2026).
- [ ] Agregar al equipo en la pantalla Personas y pasarles el enlace.
- [ ] Un día de uso real con el equipo: cargar, corregir, eliminar, exportar Excel.
- [ ] Borrar la copia de prueba de claude.ai (https://claude.ai/artifact/AMw7Dvu93AnLfj4TQU3ezr) y sacarle el acceso al equipo a la app vieja.

## Traído del artefacto de claude.ai (versión del 24/11/2026)
- [x] Calculadora de Lavadero: "Precios de venta de hoy" (probar otro precio de Cubitos/Moñitos sin tocar
  Configuración) y "Precio de venta" (mínimo de cada producto según lo que se paga la zanahoria). Cuenta
  nueva con pruebas: da igual que el artefacto en 2000 casos al azar (`src/pruebas/artefacto/`).
- [x] Cuenta del Precio Límite en números (venta − gastos = queda para la zanahoria ÷ kg).
- [x] Inicio con estilo de lista y textos explicativos más chicos.
- [x] Entrada (¿Quién sos? y PIN) con el mismo estilo de lista que el inicio (25/11/2026).
- [ ] Desde ahora los cambios se hacen acá (GitHub → Cloudflare), no en el artefacto: si se toca el
  artefacto, la página real no se entera.

## Datos de la empresa en el repo
- [ ] **Hacer privado el repositorio de GitHub** (Settings → Change visibility → Private). Los valores de
  arranque de Lavadero (`src/lavadero/config-inicial.ts`) tienen precios reales (Moños agregado el
  25/11/2026 a pedido). Mientras el repo sea público, cualquiera los puede leer.
- [x] Moños cargado a mano en Lavadero → Configuración de la app (25/11/2026).

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
