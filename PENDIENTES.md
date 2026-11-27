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
- [x] PIN con un campo y botón "Entrar" (en lugar de las teclas redondas); entra solo al cuarto número (26/11/2026).
- [x] Sin zoom del iPhone al tocar un campo: letra de 16 en los campos del celular (26/11/2026).
- [ ] Desde ahora los cambios se hacen acá (GitHub → Cloudflare), no en el artefacto: si se toca el
  artefacto, la página real no se entera.

## Datos de la empresa en el repo
- [ ] **Hacer privado el repositorio de GitHub** (Settings → Change visibility → Private). Los valores de
  arranque de Lavadero (`src/lavadero/config-inicial.ts`) tienen precios reales (Moños agregado el
  25/11/2026 a pedido). Mientras el repo sea público, cualquiera los puede leer.
- [x] Moños cargado a mano en Lavadero → Configuración de la app (25/11/2026).

## Textos
- [x] Conclusión del resumen: "la partida da para $ X" en lugar de "a este productor le pagás $ X"
  (el precio se negocia); "Si le pagás" en lugar de "Como le pagás"; líneas repetidas juntas (26/11/2026).
- [x] Explicación del límite: "Sin contar el pago al productor, la zanahoria … te deja $ X por kilo…" (26/11/2026).
- [x] "No aplica" con aviso cuando el productor pide más que el tope: "No te alcanza para los $ X que pide." (26/11/2026).
- [x] Aviso amarillo: "Pide $ X. Como rindió el N % del óptimo, eso baja a $ Y ($ X × N %). Pero por tus ventas y
  costos, guardando tu 10 %, podés pagar hasta $ Z por kilo." (antes "Rindió para $ Y el kilo") (26/11/2026).
- [x] Cuando lo que pide × rendimiento pasa el tope, no hay tarjeta de Recomendado: el Límite dice "No te alcanza
  para los $ X que pide", el aviso amarillo explica la cuenta y la franja del rendimiento tiene "Ver más" con lo
  esperado vs. lo que dio y "no compensa". En el detalle sigue "A negociar" (27/11/2026).
- [x] "Tocá para ver la explicación" / "Tocá para cerrar" pasan a "Ver más" / "Ver menos", todos con el mismo
  aspecto (Lavadero y Transporte) (27/11/2026).
- [x] "Ver más" del Recomendado (y de la franja del rendimiento): "Cómo sale el N %" — lo que dio ÷ lo que valdría
  un taco óptimo, por taco, después de mano de obra y bolsas (27/11/2026).

## Fórmulas
- [x] Rendimiento: ninguna calidad compensa a la otra. Elegida y Común cuentan solo hasta su óptimo
  (antes la Elegida de más sumaba). Fórmulas v10. Partidas guardadas antes no cambian (26/11/2026).
- [x] Sin precio pedido no hay Precio Recomendado (antes: límite × rendimiento). El descuento por
  rendimiento es solo cuando el productor pide un precio. Fórmulas v11 (26/11/2026).

## Para decidir (no se tocó para no cambiar resultados)
- [x] Precio pedido opcional: vacío o 0 se puede guardar ("A negociar", sin recomendado) (26/11/2026).
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
