'use strict';

/* ---------- utilidades para dibujar svg ---------- */
const ns = 'http://www.w3.org/2000/svg';
let idclip = 0;

function el(tag, attrs, padre) {
  const e = document.createElementNS(ns, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (padre) padre.appendChild(e);
  return e;
}

function txt(padre, x, y, s, attrs) {
  const t = el('text', Object.assign({ x: x, y: y }, attrs || {}), padre);
  t.textContent = s;
  return t;
}

// plano cartesiano con rejilla, ejes y escalas
function crearplano(svg, ancho, alto, xmax, ymax, ypaso) {
  const mi = 44, md = 14, ms = 14, mb = 38;
  svg.setAttribute('viewBox', '0 0 ' + ancho + ' ' + alto);
  const sx = x => mi + x / xmax * (ancho - mi - md);
  const sy = y => alto - mb - y / ymax * (alto - ms - mb);
  const id = 'clip' + (idclip++);
  const defs = el('defs', {}, svg);
  const cp = el('clipPath', { id: id }, defs);
  el('rect', { x: sx(0), y: sy(ymax), width: sx(xmax) - sx(0), height: sy(0) - sy(ymax) }, cp);

  for (let x = 0; x <= xmax; x++) {
    el('line', { x1: sx(x), y1: sy(0), x2: sx(x), y2: sy(ymax), class: 'rej' }, svg);
    txt(svg, sx(x), sy(0) + 16, x, { class: 'tick', 'text-anchor': 'middle' });
  }
  for (let y = 0; y <= ymax; y += ypaso) {
    el('line', { x1: sx(0), y1: sy(y), x2: sx(xmax), y2: sy(y), class: 'rej' }, svg);
    txt(svg, sx(0) - 8, sy(y) + 4, y, { class: 'tick', 'text-anchor': 'end' });
  }
  el('line', { x1: sx(0), y1: sy(0), x2: sx(xmax), y2: sy(0), class: 'eje' }, svg);
  el('line', { x1: sx(0), y1: sy(0), x2: sx(0), y2: sy(ymax), class: 'eje' }, svg);
  return { sx: sx, sy: sy, id: id, xmax: xmax, ymax: ymax };
}

/* ---------- datos del ejemplo ---------- */
// max z = 3x1 + 5x2 ; x1 <= 4 ; 2x2 <= 12 ; 3x1 + 2x2 <= 18
const vertices = [[0, 0], [4, 0], [4, 3], [2, 6], [0, 6]];

// región factible con restricciones y vértices; devuelve un grupo para lo dinámico
function regionbase(svg, p, etiquetas) {
  const pts = vertices.map(v => p.sx(v[0]) + ',' + p.sy(v[1])).join(' ');
  el('polygon', { points: pts, class: 'reg' }, svg);

  const lineas = [[[4, 0], [4, 10]], [[0, 6], [7, 6]], [[0, 9], [6, 0]]];
  lineas.forEach(l => el('line', {
    x1: p.sx(l[0][0]), y1: p.sy(l[0][1]), x2: p.sx(l[1][0]), y2: p.sy(l[1][1]), class: 'res'
  }, svg));

  if (etiquetas) {
    txt(svg, p.sx(4) + 6, p.sy(9.5), 'x₁ ≤ 4', { class: 'etq' });
    txt(svg, p.sx(6.9), p.sy(6.3), 'x₂ ≤ 6', { class: 'etq', 'text-anchor': 'end' });
    txt(svg, p.sx(6.9), p.sy(2.3), '3x₁ + 2x₂ ≤ 18', { class: 'etq', 'text-anchor': 'end' });
    const desp = [[8, -8], [8, -8], [8, -6], [8, -10], [8, -10]];
    vertices.forEach((v, i) => txt(svg, p.sx(v[0]) + desp[i][0], p.sy(v[1]) + desp[i][1],
      '(' + v[0] + ', ' + v[1] + ')', { class: 'etq-s' }));
  }
  vertices.forEach(v => el('circle', { cx: p.sx(v[0]), cy: p.sy(v[1]), r: 4.5, class: 'vert' }, svg));

  txt(svg, p.sx(p.xmax) - 2, p.sy(0) + 32, 'x₁', { class: 'etq', 'text-anchor': 'end' });
  txt(svg, 8, p.sy(p.ymax) + 6, 'x₂', { class: 'etq' });
  return el('g', {}, svg);
}

/* ---------- barras de recursos ---------- */
(function () {
  const datos = [
    { nom: 'Recurso 1 (x₁ ≤ 4)', usado: 2, total: 4 },
    { nom: 'Recurso 2 (2x₂ ≤ 12)', usado: 12, total: 12 },
    { nom: 'Recurso 3 (3x₁ + 2x₂ ≤ 18)', usado: 18, total: 18 }
  ];
  const caja = document.getElementById('recursos');
  datos.forEach(d => {
    const fila = document.createElement('div');
    fila.className = 'recurso';
    const sobra = d.total - d.usado;
    fila.innerHTML = '<div class="nom"><span>' + d.nom + '</span><span>' + d.usado + ' de ' + d.total +
      (sobra > 0 ? ' · sobra ' + sobra : '') + '</span></div>' +
      '<div class="pista"><div class="uso' + (sobra > 0 ? ' parcial' : '') + '" style="width:' + (d.usado / d.total * 100) + '%"></div></div>';
    caja.appendChild(fila);
  });
})();

/* ---------- región factible con recta de la función objetivo ---------- */
(function () {
  const svg = document.getElementById('plano-region');
  const p = crearplano(svg, 520, 400, 7, 10, 2);
  const g = regionbase(svg, p, true);
  const rango = document.getElementById('deslizador-z');
  const valor = document.getElementById('valor-z');
  const lectura = document.getElementById('lectura-z');

  function actualizar() {
    const z = Number(rango.value);
    valor.textContent = z;
    g.innerHTML = '';
    // recta 3x1 + 5x2 = z
    const x1 = -1, x2 = 8;
    el('line', {
      x1: p.sx(x1), y1: p.sy((z - 3 * x1) / 5),
      x2: p.sx(x2), y2: p.sy((z - 3 * x2) / 5),
      class: 'iso', 'clip-path': 'url(#' + p.id + ')'
    }, g);

    if (z < 36) {
      lectura.textContent = 'La recta 3x₁ + 5x₂ = ' + z + ' cruza la región: todavía se puede ganar más.';
    } else if (z === 36) {
      el('circle', { cx: p.sx(2), cy: p.sy(6), r: 9, class: 'anillo' }, g);
      lectura.textContent = 'z = 36: la recta solo toca el vértice (2, 6). Es el óptimo.';
    } else {
      lectura.textContent = 'Con z = ' + z + ' la recta ya no toca la región: ese valor no se puede alcanzar.';
    }
  }
  rango.addEventListener('input', actualizar);
  actualizar();
})();

/* ---------- tabla simplex paso a paso ---------- */
(function () {
  const nombres = ['x<sub>1</sub>', 'x<sub>2</sub>', 's<sub>1</sub>', 's<sub>2</sub>', 's<sub>3</sub>'];
  const textoNombres = ['x₁', 'x₂', 's₁', 's₂', 's₃'];

  // muestra los números como fracciones simples
  function fraccion(v) {
    if (Math.abs(v) < 1e-9) return '0';
    for (let d = 1; d <= 6; d++) {
      const n = v * d;
      if (Math.abs(n - Math.round(n)) < 1e-9) {
        const nn = Math.round(n);
        return (d === 1 ? String(nn) : nn + '/' + d).replace('-', '−');
      }
    }
    return v.toFixed(2).replace('-', '−');
  }

  // calcula todos los pasos del simplex con el ejemplo
  function calcularpasos() {
    const t = {
      filas: [[1, 0, 1, 0, 0, 4], [0, 2, 0, 1, 0, 12], [3, 2, 0, 0, 1, 18]],
      z: [-3, -5, 0, 0, 0, 0],
      base: [2, 3, 4]
    };
    const pasos = [];
    while (true) {
      // columna que entra: el costo reducido más negativo
      let q = -1, min = -1e-9;
      for (let j = 0; j < 5; j++) if (t.z[j] < min) { min = t.z[j]; q = j; }

      const paso = {
        filas: t.filas.map(f => f.slice()),
        z: t.z.slice(),
        base: t.base.slice(),
        q: q, r: -1
      };
      if (q < 0) { pasos.push(paso); break; }

      // fila que sale: razón mínima
      let mejor = Infinity;
      for (let i = 0; i < t.filas.length; i++) {
        if (t.filas[i][q] > 1e-9) {
          const raz = t.filas[i][5] / t.filas[i][q];
          if (raz < mejor - 1e-9) { mejor = raz; paso.r = i; }
        }
      }
      paso.razon = mejor;
      pasos.push(paso);

      // pivoteo (gauss-jordan)
      const r = paso.r;
      const piv = t.filas[r][q];
      t.filas[r] = t.filas[r].map(v => v / piv);
      for (let i = 0; i < t.filas.length; i++) {
        if (i !== r) {
          const f = t.filas[i][q];
          t.filas[i] = t.filas[i].map((v, j) => v - f * t.filas[r][j]);
        }
      }
      const fz = t.z[q];
      t.z = t.z.map((v, j) => v - fz * t.filas[r][j]);
      t.base[r] = q;
    }
    return pasos;
  }

  const pasos = calcularpasos();
  let actual = 0;

  // vértice (x1, x2) de cada paso
  function vertice(p) {
    let x1 = 0, x2 = 0;
    p.base.forEach((b, i) => {
      if (b === 0) x1 = p.filas[i][5];
      if (b === 1) x2 = p.filas[i][5];
    });
    return [x1, x2];
  }

  // gráfico del recorrido
  const svg = document.getElementById('plano-ruta');
  const plano = crearplano(svg, 520, 400, 7, 10, 2);
  const g = regionbase(svg, plano, false);

  function dibujarruta() {
    g.innerHTML = '';
    const pts = [];
    for (let k = 0; k <= actual; k++) pts.push(vertice(pasos[k]));
    el('polyline', { points: pts.map(v => plano.sx(v[0]) + ',' + plano.sy(v[1])).join(' '), class: 'ruta' }, g);
    pts.forEach((v, k) => {
      el('circle', { cx: plano.sx(v[0]), cy: plano.sy(v[1]), r: 5, class: 'opt' }, g);
      txt(g, plano.sx(v[0]) + 10, plano.sy(v[1]) - 9,
        'z = ' + fraccion(pasos[k].z[5]), { class: 'zeta' });
    });
    const u = pts[pts.length - 1];
    el('circle', { cx: plano.sx(u[0]), cy: plano.sy(u[1]), r: 10, class: 'anillo' }, g);
  }

  function pintartabla() {
    const p = pasos[actual];
    let h = '<table class="tabla"><thead><tr><th>base</th>';
    nombres.forEach((n, j) => { h += '<th class="' + (j === p.q ? 'entra' : '') + '">' + n + '</th>'; });
    h += '<th>b</th><th>razón</th></tr></thead><tbody>';

    p.filas.forEach((f, i) => {
      const sale = i === p.r;
      h += '<tr class="' + (sale ? 'sale' : '') + '"><th>' + nombres[p.base[i]] + '</th>';
      for (let j = 0; j < 5; j++) {
        const piv = sale && j === p.q;
        h += '<td class="' + (j === p.q ? 'entra ' : '') + (piv ? 'pivote' : '') + '">' + fraccion(f[j]) + '</td>';
      }
      h += '<td>' + fraccion(f[5]) + '</td>';
      h += '<td>' + (p.q >= 0 && f[p.q] > 1e-9 ? fraccion(f[5] / f[p.q]) : '—') + '</td></tr>';
    });

    h += '<tr class="filaz"><th>z</th>';
    for (let j = 0; j < 5; j++) h += '<td class="' + (j === p.q ? 'entra' : '') + '">' + fraccion(p.z[j]) + '</td>';
    h += '<td>' + fraccion(p.z[5]) + '</td><td></td></tr></tbody></table>';
    document.getElementById('tabla-simplex').innerHTML = h;

    // explicación en palabras
    const v = vertice(p);
    let t = 'Vértice actual: (' + fraccion(v[0]) + ', ' + fraccion(v[1]) + '), z = ' + fraccion(p.z[5]) + '. ';
    if (p.q < 0) {
      t += 'Todos los costos reducidos son mayores o iguales a 0: es la solución óptima.';
    } else {
      t += 'Entra ' + textoNombres[p.q] + ' (costo reducido más negativo: ' + fraccion(p.z[p.q]) + '). ' +
           'Sale ' + textoNombres[p.base[p.r]] + ' (razón mínima: ' + fraccion(p.razon) + ').';
    }
    document.getElementById('lectura-paso').textContent = t;

    document.getElementById('btn-atras').disabled = actual === 0;
    document.getElementById('btn-sigue').disabled = actual === pasos.length - 1;
    dibujarruta();
  }

  document.getElementById('btn-atras').addEventListener('click', () => { if (actual > 0) { actual--; pintartabla(); } });
  document.getElementById('btn-sigue').addEventListener('click', () => { if (actual < pasos.length - 1) { actual++; pintartabla(); } });
  document.getElementById('btn-reinicio').addEventListener('click', () => { actual = 0; pintartabla(); });
  pintartabla();
})();

/* ---------- dualidad: el primal sube y el dual baja ---------- */
(function () {
  const svg = document.getElementById('grafico-dual');
  const ancho = 520, alto = 330, mi = 50, md = 20, ms = 40, mb = 44;
  svg.setAttribute('viewBox', '0 0 ' + ancho + ' ' + alto);
  const sx = i => mi + (i - 0.5) / 3 * (ancho - mi - md);
  const sy = v => alto - mb - v / 48 * (alto - ms - mb);

  for (let v = 0; v <= 48; v += 12) {
    el('line', { x1: mi, y1: sy(v), x2: ancho - md, y2: sy(v), class: 'rej' }, svg);
    txt(svg, mi - 8, sy(v) + 4, v, { class: 'tick', 'text-anchor': 'end' });
  }
  el('line', { x1: mi, y1: sy(0), x2: ancho - md, y2: sy(0), class: 'eje' }, svg);
  el('line', { x1: mi, y1: sy(0), x2: mi, y2: sy(48), class: 'eje' }, svg);
  el('line', { x1: mi, y1: sy(36), x2: ancho - md, y2: sy(36), class: 'res' }, svg);
  txt(svg, mi + 6, sy(36) - 6, 'óptimo = 36', { class: 'etq-s' });

  const primal = [0, 30, 36];
  const dual = [42, 39, 36];
  [primal, dual].forEach((serie, s) => {
    el('polyline', {
      points: serie.map((v, i) => sx(i + 1) + ',' + sy(v)).join(' '),
      class: s === 0 ? 'l-primal' : 'l-dual'
    }, svg);
    serie.forEach((v, i) => {
      el('circle', { cx: sx(i + 1), cy: sy(v), r: 4.5, fill: s === 0 ? '#12908e' : '#e0652f' }, svg);
      txt(svg, sx(i + 1), sy(v) + (s === 0 ? 20 : -10), v, {
        class: 'etq-s', 'text-anchor': 'middle'
      });
    });
  });
  [1, 2, 3].forEach(i => txt(svg, sx(i), sy(0) + 18, 'valor ' + i, { class: 'tick', 'text-anchor': 'middle' }));

  // leyenda
  el('line', { x1: mi + 10, y1: 16, x2: mi + 40, y2: 16, class: 'l-primal' }, svg);
  txt(svg, mi + 46, 20, 'primal (sube)', { class: 'etq-s' });
  el('line', { x1: mi + 170, y1: 16, x2: mi + 200, y2: 16, class: 'l-dual' }, svg);
  txt(svg, mi + 206, 20, 'dual (baja)', { class: 'etq-s' });
})();

/* ---------- costo por iteración O(mn) ---------- */
(function () {
  const svg = document.getElementById('grafico-costo');
  const rm = document.getElementById('ctl-m');
  const rn = document.getElementById('ctl-n');
  const vm = document.getElementById('val-m');
  const vn = document.getElementById('val-n');
  const lec = document.getElementById('lectura-costo');

  function actualizar() {
    const m = Number(rm.value), n = Number(rn.value);
    vm.textContent = m;
    vn.textContent = n;
    svg.innerHTML = '';
    // el rectángulo representa la matriz A de tamaño m x n
    const w = 40 + n / 200 * 380;
    const h = 20 + m / 100 * 170;
    el('rect', { x: 20, y: 14, width: w, height: h, fill: 'rgba(31,78,140,.16)', stroke: '#1f4e8c', 'stroke-width': 2 }, svg);
    txt(svg, 20 + w / 2, 14 + h / 2 + 5, 'A  (' + m + ' × ' + n + ')', { class: 'etq', 'text-anchor': 'middle' });
    lec.textContent = 'Cada iteración toca del orden de m · n = ' + (m * n).toLocaleString('es') + ' números.';
  }
  rm.addEventListener('input', actualizar);
  rn.addEventListener('input', actualizar);
  actualizar();
})();

/* ---------- regresión LAD contra mínimos cuadrados ---------- */
(function () {
  const svg = document.getElementById('grafico-lad');
  const p = crearplano(svg, 520, 360, 11, 11, 1);
  const g = el('g', {}, svg);
  const btn = document.getElementById('btn-atipico');
  const lec = document.getElementById('lectura-lad');

  const datos = [[1, 2.9], [2, 3.4], [3, 4.6], [4, 5.1], [5, 6.2], [6, 6.6], [7, 7.9], [8, 8.3], [9, 9.4]];
  const atipico = [10, 1.5];
  let conAtipico = false;

  // mínimos cuadrados (fórmula cerrada)
  function mco(pts) {
    const n = pts.length;
    const mx = pts.reduce((s, v) => s + v[0], 0) / n;
    const my = pts.reduce((s, v) => s + v[1], 0) / n;
    let sxy = 0, sxx = 0;
    pts.forEach(v => { sxy += (v[0] - mx) * (v[1] - my); sxx += (v[0] - mx) * (v[0] - mx); });
    const b = sxy / sxx;
    return { a: my - b * mx, b: b };
  }

  // LAD: la mejor recta pasa por dos de los puntos, se prueban todos los pares
  function lad(pts) {
    let mejor = null;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (pts[i][0] === pts[j][0]) continue;
        const b = (pts[j][1] - pts[i][1]) / (pts[j][0] - pts[i][0]);
        const a = pts[i][1] - b * pts[i][0];
        const s = pts.reduce((t, v) => t + Math.abs(v[1] - a - b * v[0]), 0);
        if (!mejor || s < mejor.s - 1e-12) mejor = { a: a, b: b, s: s };
      }
    }
    return mejor;
  }

  function error(pts, r) {
    return pts.reduce((t, v) => t + Math.abs(v[1] - r.a - r.b * v[0]), 0);
  }

  function recta(r, clase) {
    el('line', {
      x1: p.sx(0), y1: p.sy(r.a), x2: p.sx(11), y2: p.sy(r.a + r.b * 11),
      class: clase, 'clip-path': 'url(#' + p.id + ')'
    }, g);
  }

  function actualizar() {
    g.innerHTML = '';
    const pts = conAtipico ? datos.concat([atipico]) : datos;
    const a = mco(pts), l = lad(pts);
    recta(a, 'l-mco');
    recta(l, 'l-lad');
    pts.forEach(v => el('circle', {
      cx: p.sx(v[0]), cy: p.sy(v[1]), r: 5, class: (conAtipico && v === atipico) ? 'pt-raro' : 'pt'
    }, g));

    // leyenda
    el('line', { x1: p.sx(0.4), y1: 20, x2: p.sx(1.4), y2: 20, class: 'l-lad' }, g);
    txt(g, p.sx(1.6), 24, 'LAD', { class: 'etq-s' });
    el('line', { x1: p.sx(3), y1: 20, x2: p.sx(4), y2: 20, class: 'l-mco' }, g);
    txt(g, p.sx(4.2), 24, 'mínimos cuadrados', { class: 'etq-s' });

    lec.textContent = 'Suma de errores absolutos → LAD: ' + error(pts, l).toFixed(1) +
      ' · mínimos cuadrados: ' + error(pts, a).toFixed(1) + '. ' +
      (conAtipico ? 'El dato atípico arrastra a la recta de mínimos cuadrados; LAD casi no se mueve.' : 'Sin atípicos, las dos rectas son casi iguales.');
    btn.textContent = conAtipico ? 'Quitar dato atípico' : 'Agregar dato atípico';
  }
  btn.addEventListener('click', () => { conAtipico = !conAtipico; actualizar(); });
  actualizar();
})();

/* ---------- menú: marca la sección que se está viendo ---------- */
(function () {
  const enlaces = Array.from(document.querySelectorAll('nav a'));
  const secciones = enlaces.map(a => document.querySelector(a.getAttribute('href')));
  const obs = new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      if (e.isIntersecting) {
        enlaces.forEach(a => a.classList.toggle('activo', a.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  secciones.forEach(s => obs.observe(s));
})();
