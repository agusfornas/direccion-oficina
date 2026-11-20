// Copia TEXTUAL del motor de la v1 (sacado del app.js publicado, solo reformateado).
// NO SE USA EN LA APP: solo sirve para que las pruebas comprueben que la v2 calcula igual.
// No editar.
/* eslint-disable */
// @ts-nocheck
import DecimalBase from "decimal.js";
const gt = DecimalBase.clone({ precision: 40, rounding: DecimalBase.ROUND_HALF_UP });
var _t = {
  version: `planilla-v1 / economia-v2 (ganancia) / recomendado-pedido-x-rendimiento-v9 (común con tope en el óptimo; sin pedido: límite × rendimiento)`,
  descripciones: {
    cubitosPorTaco: `(Cubitos × 1 + 20×1 × 2 + Moños (Ext) × 2) / Tacos`,
    generalPorTaco: `(Cubitos × 0,5 + 20×1 + Moños (Ext) + Moños + Moñitos × 0,5 + Industrial) / Tacos`,
    pctElegida: `(Cubitos × 0,5 + 20×1 + Moños (Ext)) / Equivalente general × 100`,
    pctComun: `(Moños + Moñitos × 0,5 + Industrial) / Equivalente general × 100`,
    kgTerminados: `Σ bolsas × kg de la presentación`,
    kgPerdida: `Kg brutos recibidos − Kg terminados (tierra, descarte y pérdidas)`,
    optimo: `Kg brutos × (kg de la categoría en el taco de referencia / peso del taco de referencia)`,
    ingresos: `Σ bolsas × precio de venta por bolsa`,
    costosOperativos: `Σ bolsas × costo de bolsa de cada producto + Σ bolsas × mano de obra + Tacos × Entacada + Tacos × (costo viaje / tacos por viaje) + Tacos × gasto general por taco + Ventas × % de ganancia de la empresa`,
    precioLimite: `(Ingresos totales − Costos operativos, incluida la ganancia de la empresa) / Kg brutos recibidos`,
    netoPorBolsa: `Precio de venta − Mano de obra − Costo de bolsa del producto`,
    valorNetoReal: `Σ bolsas de Elegida × neto por bolsa + Σ bolsas de Común × neto por bolsa × mín(kg Común óptimos / kg Común reales, 1) — la Común no compensa la Elegida`,
    valorNetoOptimo: `Kg Elegida óptimos × valor neto por kg de Elegida + Kg Común óptimos × valor neto por kg de Común (según la mezcla de valuación)`,
    precioRecomendado: `mín( Precio pedido × mín(Valor neto real / Valor neto óptimo, 1) , Precio Límite de Compra ). Se le paga al productor el mismo % de lo que pide en que rindió respecto del óptimo; si eso supera lo que se puede pagar según las ventas y la ganancia del galpón, se recomienda el límite y se avisa.`,
  },
};
function vt(e) {
  if (e == null) return ``;
  let t = String(e).trim().replace(/\s|\$/g, ``);
  return t.includes(`,`) && (t = t.replace(/\./g, ``).replace(`,`, `.`)), t;
}
function yt(e) {
  let t = vt(e);
  return t === `` || !/^-?\d+(\.\d+)?$/.test(t) ? null : new gt(t);
}
var bt = (e) => yt(e) ?? new gt(0),
  xt = (e) => {
    let t = vt(e);
    return t === `` || /^-?\d+(\.\d+)?$/.test(t);
  };
function St(e, t) {
  return t.isZero() ? null : e.div(t);
}
var Ct = (e) => (e === null ? null : e.toString()),
  wt = (e) => e.toString();
function Tt(e) {
  if (e.pesoModo === `GRUPOS`) {
    let t = new gt(0),
      n = new gt(0);
    for (let r of e.grupos) {
      let e = bt(r.tacos);
      (t = t.plus(e)), (n = n.plus(e.times(bt(r.pesoKg))));
    }
    return { tacos: t, kgBruto: n };
  }
  let t = bt(e.tacos);
  return { tacos: t, kgBruto: t.times(bt(e.pesoPromedio)) };
}
function Et(e, t, n) {
  let r = new gt(0),
    i = new gt(0),
    a = new gt(0),
    o = new gt(0),
    s = new gt(0),
    c = new gt(0);
  for (let n of e) {
    let e = bt(t[n.id]),
      l = e.times(bt(n.eqGeneral)),
      u = e.times(bt(n.kgBolsa));
    (o = o.plus(e)),
      n.categoria === `ELEGIDA`
        ? ((r = r.plus(e.times(bt(n.eqCubitos)))),
          (i = i.plus(l)),
          (s = s.plus(u)))
        : ((a = a.plus(l)), (c = c.plus(u)));
  }
  let l = i.plus(a),
    u = (e) => {
      let t = St(e, l);
      return t === null ? null : t.times(100);
    };
  return {
    eqCubitos: r,
    eqGeneral: l,
    eqElegida: i,
    eqComun: a,
    cubitosPorTaco: St(r, n),
    generalPorTaco: St(l, n),
    pctElegida: u(i),
    pctComun: u(a),
    bolsasFisicas: o,
    kgTerminados: s.plus(c),
    kgElegida: s,
    kgComun: c,
  };
}
function Dt(e) {
  let t = bt(e.rendimientoOptimo.pesoTacoRef),
    n = new gt(0);
  return {
    elegida: St(bt(e.rendimientoOptimo.elegidaKg), t) ?? n,
    comun: St(bt(e.rendimientoOptimo.comunKg), t) ?? n,
    descarte: St(bt(e.rendimientoOptimo.descarteKg), t) ?? n,
  };
}
function Ot(e, t) {
  let n = Dt(e);
  return {
    elegida: t.times(n.elegida),
    comun: t.times(n.comun),
    descarte: t.times(n.descarte),
  };
}
function kt(e) {
  return St(bt(e.flete.costoViaje), bt(e.flete.tacosPorViaje));
}
function At(e) {
  let t = e.gastosGenerales;
  return t.modo === `MENSUAL`
    ? St(bt(t.mensualTotal), bt(t.mensualTacos))
    : (yt(t.porTaco) ?? new gt(0));
}
function jt(e, t) {
  return yt(e.costoBolsa ?? null) ?? bt(t.costoBolsa);
}
function Mt(e, t) {
  let n = yt(e.precioVenta),
    r = yt(e.manoObra);
  return n === null || r === null ? null : n.minus(r).minus(t);
}
function Nt(e, t) {
  let { tacos: n, kgBruto: r } = Tt(e),
    i = Et(t.productos, e.bolsas, n),
    a = Ot(t, r),
    o = [],
    s = new gt(0),
    c = new gt(0),
    l = new gt(0),
    u = t.productos.map((n) => {
      let r = bt(e.bolsas[n.id]),
        i = yt(n.precioVenta),
        a = yt(n.manoObra),
        u = i === null ? null : r.times(i),
        d = a === null ? null : r.times(a);
      r.isZero() || (i !== null && a !== null) || o.push(n.nombre),
        u === null ? r.isZero() || (s = null) : (s &&= s.plus(u)),
        d === null ? r.isZero() || (c = null) : (c &&= c.plus(d));
      let f = jt(n, t);
      l = l.plus(r.times(f));
      let p = Mt(n, f);
      return {
        id: n.id,
        nombre: n.nombre,
        categoria: n.categoria,
        bolsas: wt(r),
        kg: wt(r.times(bt(n.kgBolsa))),
        ingreso: Ct(u),
        manoObra: Ct(d),
        costoBolsas: wt(r.times(f)),
        netoPorBolsa: Ct(p),
      };
    }),
    d = n.times(bt(t.entacadaPorTaco)),
    f = kt(t),
    p = f === null ? new gt(0) : n.times(f),
    m = At(t),
    h = m === null ? new gt(0) : n.times(m),
    g = s,
    _ = c,
    v = yt(t.gananciaPct) ?? new gt(0),
    y = g === null ? null : g.times(v).div(100),
    b =
      _ === null || y === null
        ? null
        : l.plus(_).plus(d).plus(p).plus(h).plus(y),
    x = g === null || b === null ? null : g.minus(b),
    S = x === null ? null : St(x, r),
    C = yt(e.precioSolicitado),
    w = Pt(t, e, i, a, C, r, d.plus(p).plus(h), S),
    T =
      S === null || C === null
        ? null
        : C.lt(S.toDecimalPlaces(2))
          ? `MARGEN`
          : C.eq(S.toDecimalPlaces(2))
            ? `EQUILIBRIO`
            : `PERDIDA`,
    E = w.precio;
  return {
    tacos: wt(n),
    kgBruto: wt(r),
    pesoPromedioTaco: Ct(St(r, n)),
    eqCubitos: wt(i.eqCubitos),
    eqGeneral: wt(i.eqGeneral),
    eqElegida: wt(i.eqElegida),
    eqComun: wt(i.eqComun),
    cubitosPorTaco: Ct(i.cubitosPorTaco),
    generalPorTaco: Ct(i.generalPorTaco),
    pctElegida: Ct(i.pctElegida),
    pctComun: Ct(i.pctComun),
    bolsasFisicas: wt(i.bolsasFisicas),
    kgTerminados: wt(i.kgTerminados),
    kgElegida: wt(i.kgElegida),
    kgComun: wt(i.kgComun),
    kgPorTaco: Ct(St(i.kgTerminados, n)),
    kgPerdida: wt(r.minus(i.kgTerminados)),
    pctPerdida: Ct(St(r.minus(i.kgTerminados), r)?.times(100) ?? null),
    optimo: {
      kgElegida: wt(a.elegida),
      kgComun: wt(a.comun),
      kgDescarte: wt(a.descarte),
      kgElegidaPorTaco: Ct(St(a.elegida, n)),
      kgComunPorTaco: Ct(St(a.comun, n)),
      difKgElegida: wt(i.kgElegida.minus(a.elegida)),
      difKgComun: wt(i.kgComun.minus(a.comun)),
    },
    productos: u,
    faltantes: o,
    ingresos: Ct(g),
    costoBolsas: wt(l),
    costoManoObra: Ct(_),
    costoEntacada: wt(d),
    costoFlete: wt(p),
    fletePorTaco: Ct(f),
    costoGastosGenerales: wt(h),
    costoGanancia: Ct(y),
    gananciaPct: wt(v),
    gastosGeneralesPorTaco: Ct(m),
    costosOperativos: Ct(b),
    margenOperativo: Ct(x),
    precioLimite: Ct(S),
    recomendado: {
      valorNetoReal: Ct(w.vnr),
      comunExcedenteKg: Ct(w.comunExcedenteKg),
      valorNetoOptimo: Ct(w.vno),
      factorRendimiento: Ct(w.factor),
      factorAplicado: Ct(w.factorAplicado),
      descuentoPorKg: Ct(w.descuento),
      limiteOptimo: Ct(w.limiteOptimo),
      referenciaAlta: !1,
      precioBase: Ct(w.precioBase),
      base: `sinPedido` in w && w.sinPedido ? `LIMITE` : `PEDIDO`,
      precioPorRendimiento: Ct(w.precioPorRendimiento),
      precio: Ct(E),
      limitadoPorSolicitado: w.limitadoPor === `SOLICITADO`,
      limitadoPor: w.limitadoPor,
      motivoNoDisponible: w.motivo,
    },
    precioSolicitado: Ct(C),
    difSolicitadoLimite: C && S ? wt(C.minus(S)) : null,
    difSolicitadoRecomendado: C && E ? wt(C.minus(E)) : null,
    difRecomendadoLimite: E && S ? wt(E.minus(S)) : null,
    estadoCompra: T,
  };
}
function Pt(e, t, n, r, i, a, o, s) {
  let c = (e) => ({
    vnr: null,
    vno: null,
    factor: null,
    factorAplicado: null,
    precioPorRendimiento: null,
    descuento: null,
    limiteOptimo: null,
    precioBase: null,
    comunExcedenteKg: null,
    precio: null,
    limitadoPor: null,
    motivo: e,
  });
  if (n.eqGeneral.isZero()) return c(`No hay producción registrada.`);
  yt(e.precioReferencia);
  let l = new gt(0),
    u = new gt(0);
  for (let n of e.productos) {
    let r = bt(t.bolsas[n.id]);
    if (r.isZero()) continue;
    let i = Mt(n, jt(n, e));
    if (i === null)
      return c(
        `Falta configurar precio de venta o mano de obra de ${n.nombre}.`,
      );
    n.categoria === `ELEGIDA`
      ? (l = l.plus(r.times(i)))
      : (u = u.plus(r.times(i)));
  }
  let d =
      n.kgComun.gt(r.comun) && n.kgComun.gt(0)
        ? r.comun.div(n.kgComun)
        : new gt(1),
    f = gt.max(n.kgComun.minus(r.comun), 0),
    p = l.plus(u.times(d)),
    m = (n) => {
      let r = e.productos.filter((e) => e.categoria === n),
        i = n === `ELEGIDA` ? `Elegida` : `Común`,
        a,
        o = () =>
          r.map((t) => ({ p: t, w: bt(e.recomendado.mezclaReferencia[t.id]) }));
      e.recomendado.mezcla === `REAL`
        ? ((a = r.map((e) => ({
            p: e,
            w: bt(t.bolsas[e.id]).times(bt(e.kgBolsa)),
          }))),
          a.every((e) => e.w.isZero()) && (a = o()))
        : (a = o());
      let s = a.reduce((e, t) => e.plus(t.w), new gt(0));
      if (s.isZero())
        return {
          v: null,
          motivo: `No hay producción de ${i} en la partida ni mezcla de referencia configurada para valuar el óptimo de ${i}.`,
        };
      let c = new gt(0);
      for (let { p: t, w: n } of a) {
        if (n.isZero()) continue;
        let r = Mt(t, jt(t, e));
        if (r === null)
          return {
            v: null,
            motivo: `Falta configurar precio de venta o mano de obra de ${t.nombre}.`,
          };
        let i = bt(t.kgBolsa);
        if (i.isZero())
          return { v: null, motivo: `Presentación de ${t.nombre} sin kilos.` };
        c = c.plus(n.div(s).times(r.div(i)));
      }
      return { v: c };
    },
    h = r.elegida.isZero() ? { v: new gt(0) } : m(`ELEGIDA`);
  if (h.v === null) return { ...c(h.motivo), vnr: p };
  let g = r.comun.isZero() ? { v: new gt(0) } : m(`COMUN`);
  if (g.v === null) return { ...c(g.motivo), vnr: p };
  let _ = r.elegida.times(h.v).plus(r.comun.times(g.v));
  if (_.lte(0))
    return {
      ...c(
        `El valor neto óptimo es cero o negativo; revisar precios y costos.`,
      ),
      vnr: p,
      vno: _,
    };
  if (a.isZero()) return { ...c(`Sin kilos brutos.`), vnr: p, vno: _ };
  let v = p.div(_),
    y = gt.max(0, gt.min(v, 1)),
    b = _.minus(o).div(a);
  if (s === null)
    return {
      ...c(`No se puede calcular el Precio Límite de Compra.`),
      vnr: p,
      vno: _,
      factor: v,
      factorAplicado: y,
      limiteOptimo: b,
    };
  if (i === null || i.lte(0)) {
    let e = gt.max(s, 0),
      t = e.times(y);
    return {
      vnr: p,
      vno: _,
      factor: v,
      factorAplicado: y,
      precioPorRendimiento: t,
      descuento: e.minus(t),
      limiteOptimo: b,
      precioBase: e,
      precio: t,
      limitadoPor: null,
      comunExcedenteKg: f,
      motivo: null,
      sinPedido: !0,
    };
  }
  let x = i,
    S = x.times(y),
    C = S,
    w = null,
    T = gt.max(s, 0);
  return (
    T.lt(C) && ((C = T), (w = `LIMITE`)),
    {
      vnr: p,
      vno: _,
      factor: v,
      factorAplicado: y,
      precioPorRendimiento: S,
      descuento: x.minus(S),
      limiteOptimo: b,
      precioBase: x,
      precio: C,
      limitadoPor: w,
      comunExcedenteKg: f,
      motivo: null,
      sinPedido: !1,
    }
  );
}
function Ft(e) {
  let t = {};
  e.productor.trim() || (t.productor = `Ingresá el productor.`),
    /^\d{4}-\d{2}-\d{2}$/.test(e.fecha) || (t.fecha = `Fecha inválida.`);
  let n = (e) => {
      let t = yt(e);
      return t !== null && t.gt(0);
    },
    r = (e) => {
      let t = yt(e);
      return t !== null && t.isInteger();
    };
  e.pesoModo === `PROMEDIO`
    ? (n(e.tacos)
        ? r(e.tacos) ||
          (t.tacos = `La cantidad de tacos debe ser un número entero.`)
        : (t.tacos = `Ingresá la cantidad de tacos (mayor a 0).`),
      n(e.pesoPromedio) ||
        (t.pesoPromedio = `Ingresá el peso promedio por taco.`))
    : (e.grupos.length === 0 &&
        (t.grupos = `Agregá al menos un grupo de tacos.`),
      e.grupos.forEach((e, i) => {
        (n(e.tacos) && r(e.tacos)) ||
          (t[`grupo${i}tacos`] = `Tacos: entero mayor a 0.`),
          n(e.pesoKg) || (t[`grupo${i}peso`] = `Peso mayor a 0.`);
      })),
    n(e.precioSolicitado) ||
      (t.precioSolicitado = `Ingresá el precio que pide el productor o el de referencia.`),
    xt(e.precioPagado) || (t.precioPagado = `Número inválido.`);
  for (let [n, r] of Object.entries(e.bolsas)) {
    let e = yt(r);
    (!xt(r) || (e !== null && e.lt(0))) &&
      (t[`bolsas.${n}`] = `Cantidad inválida.`);
  }
  return t;
}
function It(e) {
  let t = {},
    n = (e, n) => {
      let r = yt(n);
      r === null
        ? (t[e] = `Obligatorio.`)
        : r.lt(0) && (t[e] = `No puede ser negativo.`);
    },
    r = (e, n) => {
      if (n === null || n === ``) return;
      let r = yt(n);
      r === null
        ? (t[e] = `Número inválido.`)
        : r.lt(0) && (t[e] = `No puede ser negativo.`);
    };
  e.productos.forEach((e) => {
    r(`${e.id}.precioVenta`, e.precioVenta),
      r(`${e.id}.manoObra`, e.manoObra),
      r(`${e.id}.costoBolsa`, e.costoBolsa ?? null);
  }),
    n(`entacadaPorTaco`, e.entacadaPorTaco),
    n(`flete.costoViaje`, e.flete.costoViaje),
    n(`flete.tacosPorViaje`, e.flete.tacosPorViaje),
    yt(e.flete.tacosPorViaje)?.isZero() &&
      (t[`flete.tacosPorViaje`] = `Debe ser mayor a 0.`),
    e.gastosGenerales.modo === `POR_TACO`
      ? n(`gg.porTaco`, e.gastosGenerales.porTaco)
      : (n(`gg.mensualTotal`, e.gastosGenerales.mensualTotal),
        n(`gg.mensualTacos`, e.gastosGenerales.mensualTacos),
        yt(e.gastosGenerales.mensualTacos)?.isZero() &&
          (t[`gg.mensualTacos`] = `Debe ser mayor a 0.`));
  let i = e.rendimientoOptimo;
  n(`ro.pesoTacoRef`, i.pesoTacoRef),
    n(`ro.elegidaKg`, i.elegidaKg),
    n(`ro.comunKg`, i.comunKg),
    n(`ro.descarteKg`, i.descarteKg),
    yt(i.pesoTacoRef)?.isZero() &&
      (t[`ro.pesoTacoRef`] = `Debe ser mayor a 0.`);
  let a = bt(i.elegidaKg).plus(bt(i.comunKg)).plus(bt(i.descarteKg));
  if (
    (!t[`ro.pesoTacoRef`] &&
      yt(i.pesoTacoRef) &&
      !a.eq(bt(i.pesoTacoRef)) &&
      (t[`ro.suma`] =
        `Elegida + Común + Descarte (${a.toString()} kg) debe sumar el peso del taco de referencia.`),
    n(`precioReferencia`, e.precioReferencia),
    e.gananciaPct !== void 0 && e.gananciaPct !== ``)
  ) {
    let n = yt(e.gananciaPct);
    (n === null || n.lt(0) || n.gte(100)) &&
      (t.gananciaPct = `Ingresá un porcentaje entre 0 y 99.`);
  }
  for (let t of Object.keys(e.recomendado.mezclaReferencia))
    r(`mezcla.${t}`, e.recomendado.mezclaReferencia[t]);
  if (e.recomendado.mezcla === `CONFIGURADA`)
    for (let n of [`ELEGIDA`, `COMUN`]) {
      let r = e.productos
        .filter((e) => e.categoria === n)
        .reduce(
          (t, n) => t.plus(bt(e.recomendado.mezclaReferencia[n.id])),
          new gt(0),
        );
      r.eq(100) ||
        (t[`mezcla.${n}`] =
          `La mezcla de ${n === `ELEGIDA` ? `Elegida` : `Común`} debe sumar 100% (suma ${r.toString()}%).`);
    }
  return t;
}
function Ut(e, t) {
  let n = vt,
    r = (e) => (e === null || e === `` ? null : n(e));
  return {
    productos: t.productos.map((t) => {
      let n = e.productos.find((e) => e.id === t.id);
      return {
        ...t,
        precioVenta: r(n.precioVenta),
        manoObra: r(n.manoObra),
        costoBolsa: r(n.costoBolsa ?? null),
      };
    }),
    gananciaPct: n(e.gananciaPct ?? `0`),
    costoBolsa: n(e.costoBolsa),
    entacadaPorTaco: n(e.entacadaPorTaco),
    precioReferencia: n(e.precioReferencia),
    flete: {
      costoViaje: n(e.flete.costoViaje),
      tacosPorViaje: n(e.flete.tacosPorViaje),
    },
    gastosGenerales: {
      modo: e.gastosGenerales.modo,
      porTaco: n(e.gastosGenerales.porTaco),
      mensualTotal: n(e.gastosGenerales.mensualTotal),
      mensualTacos: n(e.gastosGenerales.mensualTacos),
    },
    rendimientoOptimo: {
      pesoTacoRef: n(e.rendimientoOptimo.pesoTacoRef),
      elegidaKg: n(e.rendimientoOptimo.elegidaKg),
      comunKg: n(e.rendimientoOptimo.comunKg),
      descarteKg: n(e.rendimientoOptimo.descarteKg),
    },
    recomendado: {
      mezcla: e.recomendado.mezcla,
      mezclaReferencia: Object.fromEntries(
        Object.entries(e.recomendado.mezclaReferencia).map(([e, t]) => [
          e,
          n(t),
        ]),
      ),
    },
  };
}
function Gt(e) {
  let t = vt;
  return {
    ...e,
    productor: e.productor.trim().replace(/\s+/g, ` `),
    tacos: t(e.tacos),
    pesoPromedio: t(e.pesoPromedio),
    grupos: e.grupos.map((e) => ({ tacos: t(e.tacos), pesoKg: t(e.pesoKg) })),
    precioSolicitado: t(e.precioSolicitado),
    precioPagado: t(e.precioPagado),
    bolsas: Object.fromEntries(
      Object.entries(e.bolsas).map(([e, n]) => [e, t(n) || `0`]),
    ),
    notas: (e.notas ?? ``).trim(),
  };
}
var rn = (e) => e.slice(0, 7),
  an = (e, t, n = t) =>
    e == null || e === ``
      ? `—`
      : new gt(e)
          .toDecimalPlaces(t)
          .toNumber()
          .toLocaleString(`es-AR`, {
            minimumFractionDigits: n,
            maximumFractionDigits: t,
          }),
  on = (e, t = 2) => (e == null || e === `` ? `—` : `$\u00a0${an(e, t)}`),
  sn = (e, t = 4) => an(e, t),
  cn = (e, t = 2) => an(e, t, 0),
  ln = (e, t = 2) => (e == null ? `—` : `${an(e, t)}\u00a0%`),
  un = (e, t = 2) =>
    e == null ? `—` : `${new gt(e).gt(0) ? `+` : ``}${an(e, t)}`,
  dn = (e) => (e ? `${e.slice(8, 10)}/${e.slice(5, 7)}/${e.slice(0, 4)}` : ``),
  fn = [
    `Enero`,
    `Febrero`,
    `Marzo`,
    `Abril`,
    `Mayo`,
    `Junio`,
    `Julio`,
    `Agosto`,
    `Septiembre`,
    `Octubre`,
    `Noviembre`,
    `Diciembre`,
  ],
  pn = (e) => `${fn[Number(e.slice(5, 7)) - 1]} ${e.slice(0, 4)}`,
  mn = (e) => (e == null || e === `` ? null : Number(e));
var Pn = (e) => `${Math.round(e * 100)} %`, Fn = (e) => on(String(e));
function In(e, t) {
  let n = e.precioLimite === null ? null : Number(e.precioLimite),
    r = e.precioSolicitado === null ? null : Number(e.precioSolicitado),
    i = e.recomendado.precio === null ? null : Number(e.recomendado.precio),
    a =
      e.recomendado.factorRendimiento === null
        ? null
        : Number(e.recomendado.factorRendimiento),
    o = Number(e.gananciaPct ?? 0);
  if (n === null || e.margenOperativo === null || e.ingresos === null)
    return [`Faltan datos de la partida o algún precio en Configuración.`];
  let s = Number(e.kgBruto),
    c = Number(e.ingresos),
    l = Number(e.costoGanancia ?? 0),
    u = `${sn(String(o), 0)} %`,
    d = t && t.trim() ? `de ${t.trim()}` : `de esta partida`,
    f = [];
  f.push(
    o > 0
      ? `Con tus ventas y tus costos, la zanahoria ${d} deja ${Fn(n)} por kilo, con tu ${u} ya guardado.`
      : `Con tus ventas y tus costos, la zanahoria ${d} deja ${Fn(n)} por kilo.`,
  );
  let p = (e) => {
    let t = n - e,
      r = l + t * s,
      i = `${sn(String(c > 0 ? (r / c) * 100 : 0), 1)} %`;
    return Math.abs(t) < 0.005
      ? o > 0
        ? `ganás tu ${u}`
        : `quedás hecho`
      : t > 0
        ? o > 0
          ? `ganás tu ${u} + ${Fn(t)} por kilo (${i} en total)`
          : `ganás ${Fn(t)} por kilo (${i})`
        : r >= 0
          ? `ganás solo el ${i}`
          : `perdés ${Fn(-r / s)} por kilo`;
  };
  return (
    f.push(`• Pagando hasta ${Fn(n)}, ${p(n)}.`),
    r !== null &&
      Math.abs(r - n) >= 0.005 &&
      f.push(`• Pagando ${Fn(r)} (lo que pide): ${p(r)}.`),
    i !== null &&
      Math.abs(i - n) >= 0.005 &&
      (r === null || Math.abs(i - r) >= 0.005) &&
      f.push(`• Pagando ${Fn(i)} (recomendado): ${p(i)}.`),
    r !== null &&
      r > n &&
      f.push(
        `Tus ventas no cubren los ${Fn(r)} que pide. Para pagarlo: vender más caro o gastar menos.`,
      ),
    a !== null && a >= 1
      ? f.push(`Rindió el ${Pn(a)} del óptimo.`)
      : r !== null &&
        r < n &&
        (f.push(
          `El tope da más que lo que pide porque solo mira tus ventas, no lo que pide el productor.`,
        ),
        a !== null && a < 0.9
          ? f.push(
              `Pide poco porque su mercadería es floja: rindió el ${Pn(a)}. Se paga por rendimiento, no por el tope.`,
            )
          : a !== null &&
            f.push(`Rindió bien (${Pn(a)}) y pide barato: buena compra.`)),
    f
  );
}
function Ln(e) {
  let t = e.precioSolicitado === null ? null : Number(e.precioSolicitado);
  return (
    (t === null || t <= 0) &&
    e.precioLimite !== null &&
    Number(e.precioLimite) > 0 &&
    Number(e.eqGeneral) > 0
  );
}
function Rn(e) {
  let t = e.recomendado;
  if (t.precio === null && !Ln(e))
    return [t.motivoNoDisponible ?? `Faltan datos para calcularlo.`];
  let n = Number(e.tacos),
    r = t.factorRendimiento === null ? null : Number(t.factorRendimiento),
    i = e.precioLimite === null ? null : Number(e.precioLimite),
    a = e.precioSolicitado === null ? null : Number(e.precioSolicitado),
    o = Number(t.precio),
    s = Number(e.gananciaPct ?? 0),
    c = s > 0 ? `tu ${sn(String(s), 0)} %` : null,
    l = [];
  n > 0 &&
    e.optimo.kgElegidaPorTaco &&
    e.optimo.kgComunPorTaco &&
    l.push(
      `Taco de ${sn(e.pesoPromedioTaco, 2)} kg: lo esperado es ${sn(e.optimo.kgElegidaPorTaco, 1)} kg de Elegida y ${sn(e.optimo.kgComunPorTaco, 1)} kg de Común. Este dio ${sn(String(Number(e.kgElegida) / n), 1)} y ${sn(String(Number(e.kgComun) / n), 1)}.`,
    );
  let u = t.comunExcedenteKg ? Number(t.comunExcedenteKg) : 0;
  if (
    (u > 0.5 &&
      n > 0 &&
      l.push(
        `La Común de más (${sn(String(u / n), 1)} kg por taco) no compensa la Elegida que falta.`,
      ),
    Ln(e) && i !== null)
  ) {
    if (
      (r !== null && l.push(`Rindió el ${Pn(r)} del óptimo.`),
      t.precio !== null)
    ) {
      let e = Number(t.precio);
      l.push(
        r !== null && r >= 1
          ? `Sin precio pedido: rindió el óptimo o más, así que es tu tope, ${Fn(e)}.`
          : `Sin precio pedido: tu tope ${Fn(i)} × ${Pn(Number(t.factorAplicado))} = ${Fn(e)}.`,
      ),
        i - e >= 0.005 &&
          l.push(
            `Pagando ${Fn(e)}, ganás ${c ? `${c} y ` : ``}${Fn(i - e)} más por kilo.`,
          );
    }
    return l;
  }
  if (r === null || i === null) return l;
  if (r >= 1) {
    if (
      (t.base === `PEDIDO`
        ? t.limitadoPor !== `LIMITE`
        : t.limitadoPor === `SOLICITADO`) &&
      a !== null
    ) {
      let t = i - a;
      l.push(`Rindió el ${Pn(r)} del óptimo.`),
        l.push(
          `Si le pagás ${Fn(a)}, ganás ${c ? `${c} y ` : ``}${Fn(t)} más por kilo.`,
        ),
        l.push(
          `En toda la partida son ${on(String(t * Number(e.kgBruto)), 0)} extra.`,
        );
    } else
      l.push(
        a === null
          ? `Rindió el ${Pn(r)} del óptimo.`
          : `Rindió el ${Pn(r)} del óptimo, pero tus ventas no cubren los ${Fn(a)} que pide.`,
      ),
        l.push(
          `Tope${c ? ` con ${c}` : ``}: ${Fn(o)}. Para pagar más: vender más caro o gastar menos.`,
        );
    return l;
  }
  return t.base === `PEDIDO` && a !== null
    ? (l.push(
        `Rindió el ${Pn(r)} del óptimo: ${Fn(a)} × ${Pn(r)} = ${on(t.precioPorRendimiento)}.`,
      ),
      t.limitadoPor === `LIMITE` &&
        l.push(
          `Tu tope${c ? ` para ganar ${c}` : ``} es ${Fn(i)}. No pagues más que eso: lo que negocies por debajo es ganancia extra.`,
        ),
      l)
    : (l.push(
        `Rindió el ${Pn(r)} del óptimo: tope ${Fn(i)} × ${Pn(r)} = ${on(t.precioPorRendimiento)}.`,
      ),
      t.limitadoPor === `SOLICITADO` &&
        l.push(`Pide ${Fn(a ?? 0)}, menos que eso: queda su precio.`),
      l);
}
var zn = (e) => on(String(e)),
  Bn = (e) => `${sn(String(e), 1)} kg`;
function Vn(e) {
  let t = Number(e.tacos);
  if (
    !(t > 0) ||
    !e.optimo.kgElegidaPorTaco ||
    !e.optimo.kgComunPorTaco ||
    e.pesoPromedioTaco === null
  )
    return null;
  let n = Number(e.pesoPromedioTaco),
    r = Number(e.kgBruto),
    i = sn(e.pesoPromedioTaco, 2),
    a = sn(e.gananciaPct ?? `0`, 0),
    o = `${cn(e.tacos, 0)} tacos · ${cn(e.kgBruto, 2)} kg brutos · ${i} kg por taco.`,
    s = `Rendimiento por taco (taco de ${i} kg)`,
    c = Number(e.optimo.kgElegidaPorTaco),
    l = Number(e.kgElegida) / t,
    u = Number(e.optimo.kgComunPorTaco),
    d = Number(e.kgComun) / t,
    f = (e, t) => (t > 0 ? Math.round(Math.abs((e - t) / t) * 100) : 0),
    p =
      l < c
        ? `${f(l, c)} % menos de lo que debería`
        : l > c
          ? `${f(l, c)} % más`
          : `igual`,
    m =
      d < u
        ? `${f(d, u)} % menos de lo que debería`
        : d > u
          ? `${f(d, u)} % más, pero cuenta solo hasta ${Bn(u)}`
          : `igual`,
    h = [
      { nombre: `Elegida`, esperado: c, dio: l, diferencia: p },
      { nombre: `Común`, esperado: u, dio: d, diferencia: m },
    ],
    g = e.precioLimite === null ? null : Number(e.precioLimite),
    _ = e.recomendado.precio === null ? null : Number(e.recomendado.precio),
    v =
      e.precioSolicitado === null || Number(e.precioSolicitado) <= 0
        ? null
        : Number(e.precioSolicitado),
    y = [];
  if (g !== null) {
    if (v === null || _ === null)
      _ !== null &&
        y.push(`Por cómo rindió, a este productor le pagás ${zn(_)} por kilo.`),
        y.push(
          `Sin precio pedido: no pases de ${zn(Math.max(g, 0))} por kilo.`,
        ),
        y.push(
          `Lo que arregles por debajo es ganancia extra, aparte de tu ${a} %.`,
        );
    else if (_ < g - 0.005) {
      let t = g - _,
        o = Math.round((t * r) / 1e3) * 1e3;
      y.push(`Por cómo rindió, a este productor le pagás ${zn(_)} por kilo.`),
        y.push(
          `Con lo que vendés, esta zanahoria vale hasta ${zn(g)} por kilo para vos, guardando tu ${a} %.`,
        ),
        y.push(
          `Como le pagás ${zn(_)}, te ahorrás **${zn(t)} por cada kilo**.`,
        ),
        y.push(
          `Cada taco tiene ${i} kilos, así que ganás ${zn(t * n)} de más por taco.`,
        ),
        y.push(
          `En toda la partida (${cn(e.tacos, 0)} tacos) son unos ${on(String(o), 0)} de ganancia extra, aparte de tu ${a} %.`,
        );
    } else {
      let t =
        e.recomendado.precioPorRendimiento === null
          ? v
          : Number(e.recomendado.precioPorRendimiento);
      y.push(`Por cómo rindió, vale ${zn(t)} por kilo.`),
        y.push(
          `Con lo que vendés, no pagues más de ${zn(g)} si querés guardar tu ${a} %.`,
        );
    }
  }
  return { encabezado: o, titulo: s, filas: h, conclusion: y };
}
var T = () => ({
    CUBITOS: ``,
    VEINTEX1: ``,
    EXTRA: ``,
    MONOS: ``,
    MONITOS: ``,
    INDUSTRIAL: ``,
  }),
  E = () => ({
    productor: ``,
    fecha: new Date().toISOString().slice(0, 10),
    pesoModo: `PROMEDIO`,
    tacos: ``,
    pesoPromedio: `32`,
    grupos: [{ tacos: ``, pesoKg: `32` }],
    precioSolicitado: ``,
    precioPagado: ``,
    bolsas: T(),
    notas: ``,
  });
function AH(e) {
  let t = {};
  for (let n of e.productos)
    t[n.id] = new gt(+(n.id === `CUBITOS` || n.id === `MONITOS`));
  return t;
}
function jH(e, t, n) {
  let r = yt(t);
  if (r === null || r.lte(0)) return null;
  let i = Dt(e),
    a = AH(e),
    o = {};
  for (let t of e.productos) {
    let e = r.times(t.categoria === `ELEGIDA` ? i.elegida : i.comun),
      n = bt(t.kgBolsa);
    o[t.id] = n.gt(0) ? e.times(a[t.id]).div(n).toString() : `0`;
  }
  let s = Nt(
      {
        ...E(),
        productor: `Calculadora`,
        pesoModo: `PROMEDIO`,
        tacos: `1`,
        pesoPromedio: r.toString(),
        precioSolicitado: ``,
        bolsas: o,
      },
      e,
    ),
    c = bt(e.gananciaPct ?? `0`).div(100),
    l = bt(s.ingresos),
    u = s.faltantes ?? [],
    d = u.length || s.precioLimite === null ? null : new gt(s.precioLimite),
    f = {
      kgTaco: r,
      faltantes: u,
      maximoKg: d,
      maximoTaco: d ? d.times(r) : null,
      gananciaPct: c.times(100),
      alcanza: null,
      aumento: null,
      nuevosPrecios: [],
      detalle: {
        kgElegida: r.times(i.elegida),
        kgComun: r.times(i.comun),
        kgDescarte: r.times(i.descarte),
        bolsas: e.productos
          .filter((e) => bt(o[e.id]).gt(0))
          .map((e) => ({
            id: e.id,
            nombre: e.nombre,
            bolsas: bt(o[e.id]),
            precio: bt(e.precioVenta),
          })),
        ventas: l,
        manoObra: bt(s.costoManoObra),
        bolsasCosto: bt(s.costoBolsas),
        entacada: bt(s.costoEntacada),
        flete: bt(s.costoFlete),
        gastosGenerales: bt(s.costoGastosGenerales),
        ganancia: bt(s.costoGanancia),
        total: bt(s.costosOperativos),
        queda: l.minus(bt(s.costosOperativos)),
      },
    },
    p = yt(n);
  if (
    p === null ||
    p.lte(0) ||
    d === null ||
    ((f.alcanza = p.lte(d.plus(1e-6))), f.alcanza || l.lte(0) || c.gte(1))
  )
    return f;
  let m = bt(s.costosOperativos).minus(bt(s.costoGanancia)),
    h = p.times(r).plus(m).div(new gt(1).minus(c)).div(l);
  return (
    (f.aumento = h.minus(1)),
    (f.nuevosPrecios = e.productos
      .filter((e) => e.precioVenta !== null && bt(e.precioVenta).gt(0))
      .map((e) => ({
        id: e.id,
        nombre: e.nombre,
        actual: bt(e.precioVenta),
        nuevo: bt(e.precioVenta).times(h).ceil(),
      }))),
    f
  );
}
function tn(e) {
  let t = new gt(0),
    n = new gt(0),
    r = new gt(0),
    i = new gt(0),
    a = new gt(0),
    o = new gt(0),
    s = new gt(0),
    c = new gt(0),
    l = new gt(0),
    u = new gt(0),
    d = new gt(0),
    f = 0,
    p = new gt(0),
    m = new gt(0),
    h = new gt(0),
    g = new gt(0),
    _ = new gt(0),
    v = new gt(0),
    y = new gt(0),
    b = new gt(0),
    x = 0,
    S = new gt(0),
    C = new gt(0),
    w = 0,
    T = new Set(),
    E = new Map();
  for (let D of e) {
    let e = D.resultado,
      O = new gt(e.kgBruto);
    T.add(D.productor);
    for (let t of e.productos) {
      let e = E.get(t.id) ?? {
        nombre: t.nombre,
        categoria: t.categoria,
        bolsas: new gt(0),
        kg: new gt(0),
      };
      (e.nombre = t.nombre),
        (e.bolsas = e.bolsas.plus(t.bolsas)),
        (e.kg = e.kg.plus(t.kg)),
        E.set(t.id, e);
    }
    (t = t.plus(e.tacos)),
      (n = n.plus(O)),
      (r = r.plus(e.kgTerminados)),
      (i = i.plus(e.eqGeneral)),
      (a = a.plus(e.eqCubitos)),
      (o = o.plus(e.eqElegida)),
      (s = s.plus(e.eqComun));
    let k = yt(e.precioSolicitado);
    k && ((c = c.plus(k.times(O))), (l = l.plus(O)));
    let A = yt(D.precioPagado);
    A &&
      ((u = u.plus(A.times(O))),
      (d = d.plus(O)),
      f++,
      (S = S.plus(A.times(O)))),
      e.margenOperativo !== null &&
        ((p = p.plus(e.margenOperativo)),
        (m = m.plus(O)),
        (v = v.plus(e.ingresos)),
        (y = y.plus(e.costosOperativos)),
        (b = b.plus(e.margenOperativo)),
        x++,
        A && ((C = C.plus(new gt(e.margenOperativo).minus(A.times(O)))), w++));
    let j = yt(e.recomendado.precio);
    j &&
      k &&
      ((h = h.plus(j.times(O))), (g = g.plus(k.times(O))), (_ = _.plus(O)));
  }
  let D = St(h, _),
    O = St(g, _),
    k = (e) => {
      let t = St(e, i);
      return t === null ? null : t.times(100);
    };
  return {
    bolsas: [...E].map(([e, t]) => ({
      id: e,
      nombre: t.nombre,
      categoria: t.categoria,
      bolsas: t.bolsas.toString(),
      kg: t.kg.toString(),
    })),
    partidas: e.length,
    productores: T.size,
    tacos: t.toString(),
    kgBruto: n.toString(),
    kgTerminados: r.toString(),
    generalPorTaco: en(St(i, t)),
    cubitosPorTaco: en(St(a, t)),
    pctElegida: en(k(o)),
    pctComun: en(k(s)),
    kgPorTaco: en(St(r, t)),
    precioSolicitadoProm: en(St(c, l)),
    precioPagadoProm: en(St(u, d)),
    partidasConPrecioPagado: f,
    precioLimiteProm: en(St(p, m)),
    precioRecomendadoProm: en(D),
    difSolicitadoRecomendado: D && O ? O.minus(D).toString() : null,
    ingresos: v.toString(),
    costosOperativos: y.toString(),
    margenOperativo: b.toString(),
    partidasEconomicas: x,
    costoCompra: S.toString(),
    resultadoEstimado: w > 0 ? C.toString() : null,
  };
}
var en = (e) => (e === null ? null : e.toString());
export { Nt, Ft, It, Ut, Gt, _t, In, Rn, Vn, on, sn, cn, ln, un, jH, tn };

