// Copia TEXTUAL de la cuenta "Precio de venta" de la Calculadora, tal como estaba en el
// artefacto de claude.ai publicado el 24/11/2026 (sacada del app.js, solo reformateada).
// NO SE USA EN LA APP: solo sirve para que las pruebas comprueben que la página calcula igual.
// No editar. Lo que usa de la v1 (jH, yt, bt) es la misma copia de src/pruebas/original/.
// @ts-nocheck
import DecimalBase from "decimal.js";
import { jH as MH } from "../original/lavadero-v1.js";
const gt = DecimalBase.clone({ precision: 40, rounding: DecimalBase.ROUND_HALF_UP });
function vt(e) {
  if (e == null) return ``;
  let t = String(e).trim().replace(/\s|\$/g, ``);
  return t.includes(`,`) && (t = t.replace(/\./g, ``).replace(`,`, `.`)), t;
}
function yt(e) {
  let t = vt(e);
  return t === `` || !/^-?\d+(\.\d+)?$/.test(t) ? null : new gt(t);
}
var bt = (e) => yt(e) ?? new gt(0);
export function NH(e, t, n) {
  let r = yt(n),
    i = MH(e, t, ``);
  if (!i || r === null || r.lt(0) || i.faltantes.length) return null;
  let a = i.detalle;
  if (!a.ventas.gt(0)) return null;
  let o = bt(e.gananciaPct ?? `0`).div(100);
  if (o.gte(1)) return null;
  let s = r
      .times(i.kgTaco)
      .plus(a.manoObra)
      .plus(a.bolsasCosto)
      .plus(a.gastosGenerales)
      .plus(a.flete)
      .plus(a.entacada),
    c = s.div(new gt(1).minus(o)),
    l = c.div(a.ventas),
    u = e.productos
      .filter((e) => e.precioVenta !== null && bt(e.precioVenta).gt(0))
      .map((e) => {
        let t = bt(e.precioVenta),
          n = t.times(l).toDecimalPlaces(0, gt.ROUND_UP);
        return {
          id: e.id,
          nombre: e.nombre,
          hoy: t,
          minimo: n,
          diferencia: t.minus(n),
        };
      });
  return {
    costoTaco: s,
    ventaMinima: c,
    ventaActual: a.ventas,
    factor: l,
    gananciaPct: o.times(100),
    filas: u,
  };
}
