// Prueba de punta a punta en un navegador real, contra la app corriendo en la computadora.
// Uso: borrar la base de prueba (`rm -rf .wrangler/estado`), en una terminal `npm run local`,
// (la prueba arranca con la base vacía: crea a "Mauricio" con PIN 1357)
// y en otra `node pruebas-navegador/prueba.cjs`.
// Necesita Playwright instalado (npm i -D playwright && npx playwright install chromium).
// Deja capturas de pantalla en pruebas-navegador/capturas/ (no se suben al repo).
const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'capturas');
require('fs').mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:8788/';
let page;
// Usa la sesión del navegador (la cookie de la tarjeta).
const api = (ruta, metodo = 'GET', cuerpo) => page.request.fetch(URL + 'api/' + ruta, { method: metodo, headers: { 'content-type': 'application/json' }, data: cuerpo ? JSON.stringify(cuerpo) : undefined }).then((r) => r.json());
(async () => {
  const browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  page.on('pageerror', (e) => errores.push(String(e)));
  const ok = (c, msg) => { if (!c) { console.log('FALLA:', msg); process.exitCode = 1; } else console.log('ok:', msg); };
  const texto = async () => ((await page.textContent('main')) || '').replace(/\u00a0/g, ' ');
  // --- Entrada: primera persona, elegir PIN, PIN equivocado, salir y volver ---
  await page.goto(URL + '#inicio');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('text=Primera vez');
  await page.fill('#primer-nombre', 'Mauricio');
  await page.click('button:has-text("Seguir")');
  await page.click('button.tarjeta:has-text("Mauricio")');
  await page.waitForSelector('text=elegí un PIN');
  await page.fill('#pin', '1357');
  await page.waitForSelector('text=Ponelo de nuevo');
  await page.fill('#pin', '1357');
  await page.waitForSelector('text=¿Qué querés ver?');
  ok((await texto()).includes('Entraste como Mauricio'), 'eligió PIN y entró como Mauricio');
  await page.screenshot({ path: OUT + '/00-entrada-ok.png' });
  await page.click('a:has-text("Salir")');
  await page.click('button.tarjeta:has-text("Mauricio")');
  await page.waitForSelector('text=Ingresá tu PIN');
  await page.screenshot({ path: OUT + '/00-pin.png' });
  await page.fill('#pin', '0000');
  await page.waitForSelector('text=PIN incorrecto. Te quedan 4 intentos.');
  ok(true, 'PIN equivocado avisa los intentos que quedan');
  await page.keyboard.type('1357');
  await page.waitForSelector('text=¿Qué querés ver?');
  ok(true, 'entra con el PIN (también desde el teclado)');
  await page.reload();
  await page.waitForSelector('text=¿Qué querés ver?');
  ok(true, 'el aparato recuerda la sesión al recargar');
  await page.screenshot({ path: OUT + '/01-inicio.png' });

  // --- Lavadero: nueva partida ---
  await page.click('text=Lavadero');
  await page.waitForSelector('text=Datos generales');
  await page.getByLabel('Productor').fill('Juan Pérez');
  await page.getByLabel('Cantidad de tacos').fill('100');
  await page.getByLabel('Precio solicitado o de referencia por kg').fill('300');
  await page.getByLabel('Bolsas de Cubitos').fill('40');
  await page.getByLabel('Bolsas de 20×1').fill('50');
  await page.getByLabel('Bolsas de Moños (Ext)').fill('20');
  await page.getByLabel('Bolsas de Moñitos').fill('10');
  await page.getByLabel('Bolsas de Industrial').fill('10');
  await page.waitForTimeout(300);
  ok((await texto()).includes('3.200 kg brutos'), 'kg brutos en vivo = 3.200');
  await page.getByLabel('Peso promedio por taco').fill('32.490');
  await page.waitForTimeout(200);
  ok((await texto()).includes('3.249 kg brutos'), 'peso 32.490 = 32,49 kg por taco (punto decimal)');
  await page.getByLabel('Peso promedio por taco').fill('320');
  await page.waitForSelector('text=parece mucho');
  ok(true, 'aviso si el peso por taco es raro');
  await page.getByLabel('Peso promedio por taco').fill('32');
  await page.waitForTimeout(200);
  ok(!(await texto()).includes('parece mucho'), 'el aviso se va con un peso normal');
  await page.screenshot({ path: OUT + '/02-nueva-partida.png', fullPage: true });
  await page.click('text=Tocá para ver la explicación >> nth=0');
  ok((await texto()).includes('Pagando hasta'), 'explicación del límite se abre');
  ok((await texto()).includes('= Queda para la zanahoria') && (await texto()).includes('Total vendido'), 'explicación del límite muestra la cuenta en números');
  await page.screenshot({ path: OUT + '/02b-cuenta-limite.png', fullPage: true });
  await page.getByLabel('Precio solicitado o de referencia por kg').fill('0');
  await page.waitForSelector('text=A negociar');
  ok((await page.locator('.precio-card.blue').count()) === 0, 'sin precio pedido: no hay tarjeta de Precio Recomendado');
  await page.getByLabel('Precio solicitado o de referencia por kg').fill('300');
  await page.waitForSelector('.precio-card.blue');
  // Aviso amarillo cuando lo que pide (ajustado por rendimiento) pasa el tope.
  await page.getByLabel('Precio solicitado o de referencia por kg').fill('100000');
  await page.waitForSelector('text=podés pagar hasta');
  ok(/Pide \$ 100\.000,00\. (Por rendimiento serían \$ [\d.,]+, |Rindió el óptimo, )pero por tus ventas y costos, guardando tu 10 %, podés pagar hasta \$ [\d.,]+ por kilo\./.test(await texto()),
    'aviso: pide, por rendimiento y hasta cuánto podés pagar');
  ok((await page.textContent('.precio-card.blue')).replace(/\u00a0/g, ' ').includes('A negociar') &&
     /Pide \$ 100\.000,00\. No pases de \$ [\d.,]+\./.test((await page.textContent('.precio-card.blue')).replace(/\u00a0/g, ' ')),
    'pide más que el tope: el Recomendado dice "A negociar" (sin repetir el número)');
  await page.getByLabel('Precio solicitado o de referencia por kg').fill('300');
  await page.waitForTimeout(200);
  // "No aplica": si lo que pide pasa el tope, avisa que no alcanza; si no, no.
  {
    const tx = await texto();
    const m = tx.match(/Te deja hasta \$ ([\d.]+,\d\d) por kilo/);
    if (tx.includes('No aplica') && m) {
      const tope = Number(m[1].replace(/\./g, '').replace(',', '.'));
      ok(tx.includes('No te alcanza para los $ 300,00 que pide.') === 300 > tope, `"No aplica" avisa solo si pide más que el tope (${tope})`);
    } else ok(true, '"No aplica" no se muestra en esta partida');
  }
  await page.getByLabel('Precio solicitado o de referencia por kg').fill('50');
  await page.waitForTimeout(200);
  ok(!(await texto()).includes('No te alcanza para los'), 'pide menos que el tope: sin aviso de que no alcanza');
  await page.getByLabel('Precio solicitado o de referencia por kg').fill('300');
  await page.waitForTimeout(200);
  await page.click('button:has-text("Guardar partida")');
  await page.waitForSelector('text=← Historial');
  ok(page.url().endsWith('#historial-1'), 'guardó como partida 1: ' + page.url());
  ok((await texto()).includes('Partida 0001'), 'muestra número 0001');
  await page.click('summary:has-text("Historial de cambios")');
  await page.waitForTimeout(200);
  ok((await texto()).includes('· Mauricio'), 'historial de cambios muestra quién');
  await page.screenshot({ path: OUT + '/03-detalle.png', fullPage: true });

  // --- Corregir: 1.500 se entiende como mil quinientos ---
  await page.click('text=Corregir datos');
  await page.waitForSelector('text=Corregir partida');
  await page.getByLabel('Cantidad de tacos').fill('1.500');
  await page.waitForTimeout(200);
  ok((await texto()).includes('1.500 tacos'), '"1.500" tacos = mil quinientos');
  await page.getByLabel('Cantidad de tacos').fill('120');
  await page.click('button:has-text("Guardar cambios")');
  await page.waitForSelector('text=← Historial');
  ok((await texto()).includes('120 tacos'), 'corrección guardada (120 tacos)');

  // --- Conflicto: otra persona cambia la partida mientras está abierta ---
  await page.click('text=Corregir datos');
  await page.waitForSelector('text=Corregir partida');
  { // "otra persona" guarda la partida mientras el formulario está abierto
    const d = await api('c/partidas/p1');
    await api('c/partidas/p1', 'PUT', { documento: d, revEsperada: d.rev });
  }
  await page.getByLabel('Cantidad de tacos').fill('130');
  await page.click('button:has-text("Guardar cambios")');
  await page.waitForSelector('.toast:has-text("Otra persona cambió")', { timeout: 15000 });
  const tacosGuardados = (await api('c/partidas/p1')).input.tacos;
  ok(tacosGuardados === '120', 'detecta cambio de otra persona y no pisa (quedó ' + tacosGuardados + ')');

  // --- Dos personas creando a la vez: números distintos ---
  const base = (await api('c/partidas/p1'));
  const r5 = await Promise.all([1, 2, 3, 4, 5].map(() => api('c/partidas/nuevo', 'POST', { prefijo: 'p', numeroComoTexto: true, documento: { ...base, productor: 'Simultáneo', rev: undefined, auditoria: [] } })));
  const nums = r5.map((p) => p.id);
  ok(new Set(nums).size === 5, '5 partidas creadas a la vez → 5 números distintos: ' + nums.join(','));

  // --- Historial y export ---
  await page.goto(URL + '#historial');
  await page.waitForSelector('text=6 partidas');
  ok(true, 'historial lista 6 partidas');
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Exportar a Excel")')]);
  ok(descarga.suggestedFilename() === 'partidas.xlsx', 'Excel se descarga: ' + descarga.suggestedFilename());
  await page.keyboard.press('Tab');
  const fila = page.locator('tr.click').first();
  await fila.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('text=← Historial');
  ok(true, 'fila del historial se abre con teclado');

  // --- Eliminar ---
  await page.goto(URL + '#historial-2');
  await page.waitForSelector('text=← Historial');
  await page.click('button:has-text("Eliminar")');
  await page.click('button:has-text("Sí, eliminar")');
  await page.waitForSelector('text=5 partidas');
  ok(true, 'eliminar deja 5 partidas');

  // --- Partida sin precio pedido: se puede guardar ---
  await page.goto(URL + '#nueva');
  await page.waitForSelector('text=Datos generales');
  await page.getByLabel('Productor').fill('Sin Precio');
  await page.getByLabel('Cantidad de tacos').fill('50');
  await page.getByLabel('Bolsas de Cubitos').fill('80');
  await page.getByLabel('Bolsas de Moñitos').fill('20');
  await page.waitForSelector('text=A negociar');
  await page.click('button:has-text("Guardar partida")');
  await page.waitForSelector('text=← Historial');
  ok((await texto()).includes('A negociar'), 'partida sin precio pedido guardada: muestra "A negociar"');
  await page.click('button:has-text("Eliminar")');
  await page.click('button:has-text("Sí, eliminar")');
  await page.waitForSelector('text=5 partidas');

  // --- Configuración: nueva versión ---
  await page.goto(URL + '#configuracion');
  await page.waitForSelector('text=Versión vigente: 1');
  await page.getByLabel('Entacada').fill('1.200');
  await page.click('button:has-text("Guardar nueva versión")');
  await page.waitForSelector('text=Versión vigente: 2');
  ok(true, 'configuración guardada como versión 2');
  await page.screenshot({ path: OUT + '/04-config.png', fullPage: true });

  // --- Estadísticas y calculadora ---
  await page.goto(URL + '#estadisticas');
  await page.waitForSelector('text=Comparación por productor');
  await page.waitForTimeout(500);
  ok((await page.locator('.recharts-bar-rectangle').count()) > 0, 'gráficos dibujados');
  await page.screenshot({ path: OUT + '/05-estadisticas.png', fullPage: true });
  await page.goto(URL + '#calculadora');
  await page.waitForSelector('text=Precio límite de compra');
  await page.getByLabel('Precio que pide el productor').fill('900');
  await page.waitForTimeout(200);
  ok((await texto()).includes('No lo podés pagar'), 'calculadora: 900 no alcanza');
  await page.getByLabel('Cubitos', { exact: true }).fill('9000');
  await page.waitForSelector('text=Precio límite con los precios de hoy');
  ok(/Subió \$ [\d.,]+ por kilo/.test(await texto()), 'calculadora: con Cubitos más caro, el límite sube');
  await page.getByLabel('Precio que pagás la zanahoria').fill('300');
  await page.waitForSelector('.pv-fila');
  ok((await page.locator('.pv-fila').count()) > 0 && (await texto()).includes('Mín. $'), 'calculadora: precio mínimo de venta por producto');
  await page.click('summary:has-text("Cómo calcula la Calculadora")');
  ok((await texto()).includes('3. Precio de venta') && (await texto()).includes('Factor:'), 'calculadora: explica las tres cuentas');
  await page.screenshot({ path: OUT + '/06-calculadora.png', fullPage: true });
  await page.click('button:has-text("Volver a los precios de Configuración")');
  ok(!(await texto()).includes('Precio límite con los precios de hoy'), 'calculadora: vuelve a los precios de Configuración');

  // --- Transporte ---
  await page.goto(URL + '#t-configuracion');
  await page.waitForSelector('text=Gasoil y camión');
  await page.getByLabel('Precio del gasoil').fill('1.250');
  await page.getByLabel('Consumo del camión').fill('35');
  await page.click('button:has-text("Guardar")');
  await page.waitForSelector('text=Los viajes nuevos usan esta configuración');
  ok(true, 'config de transporte guardada');
  await page.goto(URL + '#t-nuevo');
  await page.waitForSelector('text=Datos del viaje');
  await page.getByLabel('Destino').fill('Rosario');
  await page.getByLabel('Flete de ida').fill('800.000');
  await page.getByLabel('Flete de vuelta').fill('0');
  await page.getByLabel('Km totales').fill('600');
  await page.getByLabel('Peaje').fill('20000');
  await page.waitForTimeout(200);
  // 600 km × 35/100 = 210 L × 1,5 = 315 L × 1250 = 393.750; chofer 15% = 120.000; gastos = 533.750; ganancia 266.250
  const tv = await texto(); ok(tv.includes('$ 266.250'), 'ganancia del viaje = $ 266.250 :: ' + (tv.match(/Ganancia del viaje.{0,40}/)||[''])[0]);
  await page.click('button:has-text("Guardar viaje")');
  await page.waitForSelector('text=← Historial');
  ok(page.url().endsWith('#t-historial-1'), 'viaje guardado como 1');
  await page.screenshot({ path: OUT + '/06-viaje.png', fullPage: true });
  await page.goto(URL + '#t-estadisticas');
  await page.waitForSelector('text=Evolución mensual');
  await page.goto(URL + '#t-calculadora');
  await page.getByLabel('Km del viaje').fill('100');
  await page.waitForTimeout(200);
  const tc = await texto(); ok(tc.includes('35 litros'), 'calculadora transporte: 35 litros :: ' + (tc.match(/Litros:.{0,60}/)||[tc.slice(0,200)])[0]);

  // --- Celular y modo oscuro ---
  const cel = page;
  await cel.setViewportSize({ width: 390, height: 844 });
  await cel.emulateMedia({ colorScheme: 'dark' });
  await cel.goto(URL + '#historial-1');
  await cel.waitForSelector('text=← Historial');
  const ancho = await cel.evaluate(() => document.documentElement.scrollWidth);
  ok(ancho <= 390, 'sin scroll horizontal en celular (ancho ' + ancho + ')');
  await cel.screenshot({ path: OUT + '/07-celular-oscuro.png', fullPage: true });
  await cel.goto(URL + '#nueva');
  await cel.waitForSelector('text=Datos generales');
  ok((await cel.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'nueva partida sin scroll horizontal en celular');
  await cel.screenshot({ path: OUT + '/08-nueva-celular-oscuro.png', fullPage: true });
  await cel.goto(URL + '#estadisticas');
  await cel.waitForSelector('text=Comparación por productor');
  await cel.waitForTimeout(400);
  ok((await cel.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'estadísticas sin scroll horizontal en celular');
  await cel.screenshot({ path: OUT + '/09-estadisticas-oscuro.png', fullPage: true });

  // En el celular ningún campo puede tener letra de menos de 16: si no, el iPhone hace zoom al tocarlo.
  for (const h of ['#nueva', '#configuracion', '#calculadora', '#t-nuevo', '#t-configuracion', '#t-calculadora']) {
    await cel.goto(URL + h);
    await cel.waitForSelector('main input');
    const chicos = await cel.evaluate(() =>
      [...document.querySelectorAll('input, select, textarea')]
        .filter((el) => el.offsetParent !== null && parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => el.id || el.getAttribute('aria-label') || el.type),
    );
    ok(chicos.length === 0, `${h}: campos con letra de 16 o más (sin zoom del iPhone) ${chicos.slice(0, 3).join(', ')}`);
    ok((await cel.evaluate(() => document.documentElement.scrollWidth)) <= 390, `${h}: sin scroll horizontal en celular`);
  }

  const reales = errores.filter((e) => !/fonts\.googleapis|ERR_|Failed to load resource/.test(e));
  ok(reales.length === 0, 'sin errores en consola: ' + reales.slice(0, 3).join(' | '));
  await browser.close();
})();
