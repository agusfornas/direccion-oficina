// Copia TEXTUAL del motor de Transporte de la v1 (sacado del app.js publicado, solo reformateado).
// NO SE USA EN LA APP: solo sirve para que las pruebas comprueben que la v2 calcula igual. No editar.
// @ts-nocheck
import DecimalBase from "decimal.js";
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
function NH(e) {
  let t = String(e ?? ``)
    .trim()
    .replace(/\s|\$/g, ``);
  return /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, ``) : t;
}
var PH = (e) => yt(NH(e)),
  FH = (e) => PH(e) ?? new gt(0),
  IH = (e) => {
    let t = Number(NH(e.ivaPct ?? ``));
    return e.ivaPct && Number.isFinite(t) ? t : 21;
  },
  LH = {
    precioGasoil: ``,
    consumoL100: ``,
    factorDesgaste: `1.5`,
    choferPct: `15`,
    ivaPct: `21`,
  },
  RH = () => ({
    fecha: new Date().toISOString().slice(0, 10),
    chofer: ``,
    camion: ``,
    origen: ``,
    destino: ``,
    fleteIda: ``,
    fleteVuelta: ``,
    km: ``,
    peaje: ``,
    otros: ``,
    observaciones: ``,
  }),
  zH = (e) => (e === null ? null : e.toString());
function BH(e, t) {
  let n = FH(e.fleteIda).plus(FH(e.fleteVuelta)),
    r = FH(e.km),
    i = FH(e.peaje),
    a = FH(e.otros),
    o = PH(t.precioGasoil),
    s = PH(t.consumoL100),
    c = PH(t.factorDesgaste) ?? new gt(1),
    l = FH(t.choferPct),
    u = [];
  (o === null || o.lte(0)) && u.push(`precio del gasoil`),
    (s === null || s.lte(0)) && u.push(`consumo del camión`);
  let d = n.times(l).div(100),
    f = s ? r.div(100).times(s) : null,
    p = f ? f.times(c) : null,
    m = p && o ? p.times(o) : null,
    h = m ? m.plus(i).plus(d).plus(a) : null,
    g = e.conIva ? n.times(IH(t)).div(100) : new gt(0),
    _ = n.plus(g),
    v = h ? _.minus(h) : null;
  return {
    vuelta: n.toString(),
    iva: g.toString(),
    cobrado: _.toString(),
    km: r.toString(),
    litros: zH(f),
    litrosDesgaste: zH(p),
    gastoCamion: zH(m),
    chofer: d.toString(),
    peaje: i.toString(),
    otros: a.toString(),
    gastos: zH(h),
    ganancia: zH(v),
    gananciaPct: v && _.gt(0) ? v.div(_).times(100).toString() : null,
    gananciaKm: v && r.gt(0) ? v.div(r).toString() : null,
    faltantes: u,
  };
}
var VH = (e, t) => {
  let n = PH(e),
    r = PH(t);
  return n && r && n.gt(0) && r.gt(0) ? n.div(r).times(100) : null;
};
function HH(e) {
  let t = {},
    n = (n, r, i = !1) => {
      if (i && (e[n] ?? ``) === ``) return;
      let a = PH(e[n]);
      (a === null || a.lte(0)) && (t[n] = r);
    };
  n(`precioGasoil`, `Ingresá el precio del gasoil.`, !0),
    n(`consumoL100`, `Ingresá el consumo del camión.`, !0),
    !t.consumoL100 &&
      PH(e.consumoL100)?.gt(150) &&
      (t.consumoL100 = `Revisá el consumo: un camión gasta entre 20 y 60 litros cada 100 km.`),
    n(`factorDesgaste`, `Ingresá un factor mayor a 0 (por ejemplo 1,5).`);
  let r = PH(e.choferPct);
  if (
    ((r === null || r.lt(0) || r.gte(100)) &&
      (t.choferPct = `Ingresá un porcentaje entre 0 y 99.`),
    (e.ivaPct ?? ``) !== ``)
  ) {
    let n = PH(e.ivaPct);
    (n === null || n.lt(0) || n.gte(100)) &&
      (t.ivaPct = `Ingresá un porcentaje entre 0 y 99.`);
  }
  return t;
}
function UH(e) {
  let t = {};
  /^\d{4}-\d{2}-\d{2}$/.test(e.fecha) || (t.fecha = `Fecha inválida.`),
    e.destino.trim() || (t.destino = `Ingresá el destino.`);
  let n = (n, r, i = !1) => {
    let a = String(e[n] ?? ``);
    if (a === ``) {
      i && (t[n] = r);
      return;
    }
    let o = PH(a);
    (o === null || o.lt(0)) && (t[n] = r);
  };
  return (
    n(`fleteIda`, `Ingresá el flete de ida.`, !0),
    n(`fleteVuelta`, `Ingresá el flete de vuelta (0 si volvió vacío).`, !0),
    n(`km`, `Ingresá los km totales.`, !0),
    !t.km && !FH(e.km).gt(0) && (t.km = `Los km deben ser mayores a 0.`),
    n(`peaje`, `Ingresá el peaje (0 si no hubo).`),
    n(`otros`, `Monto inválido.`),
    t
  );
}
function WH(e) {
  let t = (e) => (e === `` ? `` : vt(NH(e)));
  return {
    ...e,
    chofer: e.chofer.trim(),
    camion: e.camion.trim(),
    origen: e.origen.trim(),
    destino: e.destino.trim(),
    fleteIda: t(e.fleteIda),
    fleteVuelta: t(e.fleteVuelta),
    km: t(e.km),
    peaje: t(e.peaje),
    otros: t(e.otros),
  };
}
function GH(e) {
  let t = (e) => (e === `` ? `` : vt(NH(e)));
  return {
    precioGasoil: t(e.precioGasoil),
    consumoL100: t(e.consumoL100),
    factorDesgaste: t(e.factorDesgaste),
    choferPct: t(e.choferPct),
    ivaPct: t(e.ivaPct ?? `21`),
  };
}
function KH(e) {
  let t = 0,
    n = 0,
    r = 0,
    i = 0;
  for (let a of e)
    (t += Number(a.resultado.km)),
      (n += Number(a.resultado.cobrado ?? a.resultado.vuelta)),
      (r += Number(a.resultado.gastos ?? 0)),
      (i += Number(a.resultado.ganancia ?? 0));
  return {
    viajes: e.length,
    km: t,
    facturacion: n,
    gastos: r,
    ganancia: i,
    gananciaKm: t > 0 ? i / t : null,
    gananciaPct: n > 0 ? (i / n) * 100 : null,
  };
}
export { BH, HH, UH, WH, GH, KH, VH, IH, LH };
