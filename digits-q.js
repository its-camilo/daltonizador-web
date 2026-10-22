/* digits-q.js
 * Reconocimiento de numeros dibujados con el reconocedor $Q
 * (Vatavu, Anthony, Wobbrock 2018; vendor/qdollar, New BSD).
 * $Q compara nubes de puntos: ignora orden, direccion y numero de trazos,
 * y es tolerante a trazos torpes. Funciona con mouse o dedo.
 *
 * Plantillas: digitos 0-9 escritos a mano alzada como polilineas en una
 * caja 1 x 1.4 (y hacia abajo), con variantes para 1, 4, 7 y 9.
 * Numeros de dos cifras: se separan los trazos por hueco horizontal y se
 * reconoce cada cifra. Si el usuario los une, se compara la nube completa
 * contra plantillas compuestas de los candidatos de la lamina.
 *
 * API: window.DigitsQ.read(strokes, candidates, normal)
 *   strokes: [[[x,y],...], ...]  candidates: ['29','70']  normal: '29'
 *   -> { text: '29' | 'noveo', score, mode }
 */
(function () {
  'use strict';

  function arc(cx, cy, rx, ry, a0, a1, n) {
    const out = [];
    n = n || 24;
    for (let i = 0; i <= n; i++) {
      const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
      out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return out;
  }
  function cat() { return [].concat.apply([], arguments); }

  // Cada digito: lista de variantes; cada variante: lista de trazos.
  const DIGITS = {
    '0': [[arc(0.5, 0.7, 0.42, 0.68, 270, 630)]],
    '1': [[[[0.5, 0], [0.5, 1.4]]], [[[0.25, 0.3], [0.5, 0], [0.5, 1.4]]]],
    '2': [[cat(arc(0.5, 0.4, 0.42, 0.38, 190, 400), [[0.05, 1.4], [0.95, 1.4]])]],
    '3': [[cat(arc(0.5, 0.34, 0.38, 0.33, 200, 450), arc(0.5, 1.03, 0.42, 0.36, 270, 520))]],
    '4': [[[[0.65, 0], [0.05, 0.95], [0.95, 0.95]], [[0.7, 0.35], [0.7, 1.4]]],
          [[[0.2, 0], [0.1, 0.85], [0.9, 0.85]], [[0.72, 0.15], [0.72, 1.4]]]],
    '5': [[[[0.85, 0], [0.2, 0]], cat([[0.2, 0], [0.16, 0.62]], arc(0.48, 0.97, 0.42, 0.42, 225, 495))],
          [cat([[0.85, 0], [0.2, 0], [0.16, 0.62]], arc(0.48, 0.97, 0.42, 0.42, 225, 495))]],
    '6': [[cat([[0.8, 0.05], [0.45, 0.28], [0.18, 0.66]], arc(0.5, 1.03, 0.4, 0.36, 180, 540))]],
    '7': [[[[0.05, 0], [0.95, 0], [0.35, 1.4]]], [[[0.05, 0], [0.95, 0], [0.35, 1.4]], [[0.3, 0.7], [0.8, 0.7]]]],
    '8': [[cat(arc(0.5, 0.35, 0.32, 0.34, 90, -270), arc(0.5, 1.03, 0.42, 0.37, 270, 630))]],
    '9': [[cat(arc(0.5, 0.4, 0.4, 0.38, 0, 360), [[0.9, 0.4], [0.85, 1.4]])],
          [cat(arc(0.5, 0.4, 0.4, 0.38, 0, 360), [[0.9, 0.4], [0.8, 1.0], [0.45, 1.4]])]]
  };

  // Convierte trazos [[x,y]...] a puntos $Q con id de trazo, con desplazamiento x.
  function toQ(strokes, dx, idBase) {
    const P = window.QDollar.Point;
    const out = [];
    strokes.forEach(function (st, k) {
      st.forEach(function (p) { out.push(new P(p[0] + dx, p[1], idBase + k + 1)); });
    });
    return out;
  }

  // Plantillas para un texto ('7' o '29'): producto de variantes por cifra.
  function templatesFor(text) {
    let combos = [{ strokes: [], dx: 0 }];
    text.split('').forEach(function (ch) {
      const next = [];
      (DIGITS[ch] || []).forEach(function (variant) {
        combos.forEach(function (c) {
          const moved = variant.map(function (st) { return st.map(function (p) { return [p[0] + c.dx, p[1]]; }); });
          next.push({ strokes: c.strokes.concat(moved), dx: c.dx + 1.35 });
        });
      });
      combos = next;
    });
    return combos.map(function (c) { return new window.QDollar.PointCloud(text, toQ(c.strokes, 0, 0)); });
  }

  const cache = {};
  function clouds(text) { return cache[text] || (cache[text] = templatesFor(text)); }

  // Puntaje $Q (0-1, mayor es mejor) de los trazos contra un texto.
  const rec = { r: null };
  function scoreAgainst(points, text) {
    if (!rec.r) rec.r = new window.QDollar.Recognizer();
    rec.r.PointClouds = clouds(text);
    return rec.r.Recognize(points).Score;
  }

  function bbox(st) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    st.forEach(function (p) {
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    });
    return { x0: x0, x1: x1, y0: y0, y1: y1 };
  }

  // Agrupa trazos por solape horizontal. Devuelve grupos ordenados de izq a der.
  function groupByX(strokes) {
    const items = strokes.map(function (st) { return { st: st, b: bbox(st) }; })
      .sort(function (a, b) { return a.b.x0 - b.b.x0; });
    const all = bbox([].concat.apply([], strokes));
    const tol = (all.y1 - all.y0) * 0.06;
    const groups = [];
    items.forEach(function (it) {
      const g = groups[groups.length - 1];
      if (g && it.b.x0 <= g.x1 + tol) { g.items.push(it.st); g.x1 = Math.max(g.x1, it.b.x1); }
      else groups.push({ items: [it.st], x0: it.b.x0, x1: it.b.x1 });
    });
    return groups;
  }

  // Une grupos hasta dejar n, fusionando por el hueco mas pequeño.
  function mergeTo(groups, n) {
    const g = groups.slice();
    while (g.length > n) {
      let k = 0, best = 1e9;
      for (let i = 0; i < g.length - 1; i++) {
        const gap = g[i + 1].x0 - g[i].x1;
        if (gap < best) { best = gap; k = i; }
      }
      g.splice(k, 2, { items: g[k].items.concat(g[k + 1].items), x0: g[k].x0, x1: Math.max(g[k].x1, g[k + 1].x1) });
    }
    return g;
  }

  // Lee una cifra: puntaje contra 0-9. Devuelve {digit, score, scores}.
  function readDigit(strokes) {
    const pts = toQ(strokes, 0, 0);
    const scores = {};
    let digit = '', score = 0;
    Object.keys(DIGITS).forEach(function (d) {
      const s = scoreAgainst(pts, d);
      scores[d] = s;
      if (s > score) { score = s; digit = d; }
    });
    return { digit: digit, score: score, scores: scores };
  }

  // Umbral minimo de $Q para aceptar una lectura (calibrado con trazos sinteticos
  // con ruido; revisar con grupo de prueba). Margen: si la respuesta normal queda
  // a menos del 10% de la mejor, se acepta la normal (no sobrediagnosticar).
  const MIN_SCORE = 0.12;
  const NORMAL_MARGIN = 0.9;

  function read(strokes, candidates, normal) {
    const wantTwo = candidates.some(function (c) { return c.length === 2; });
    const wantOne = candidates.some(function (c) { return c.length === 1; });
    let groups = groupByX(strokes);

    // Caso cifra por cifra (1 o 2 grupos).
    if (groups.length >= 2 && wantTwo) {
      groups = mergeTo(groups, 2);
      const reads = groups.map(function (g) { return readDigit(g.items); });
      if (reads.every(function (r) { return r.score >= MIN_SCORE; })) {
        let text = reads.map(function (r) { return r.digit; }).join('');
        if (normal && normal.length === 2 && text !== normal) {
          const near = reads.every(function (r, i) {
            return r.digit === normal[i] || r.scores[normal[i]] >= r.score * NORMAL_MARGIN;
          });
          if (near) text = normal;
        }
        return { text: text, score: Math.min(reads[0].score, reads[1].score), mode: 'cifras' };
      }
      return { text: 'noveo', score: 0, mode: 'cifras' };
    }

    if (groups.length === 1 && (wantOne || !wantTwo)) {
      const r = readDigit(strokes);
      if (r.score < MIN_SCORE) return { text: 'noveo', score: r.score, mode: 'cifra' };
      let text = r.digit;
      if (normal && normal.length === 1 && text !== normal && r.scores[normal] >= r.score * NORMAL_MARGIN) text = normal;
      return { text: text, score: r.score, mode: 'cifra' };
    }

    // Numero de dos cifras dibujado unido: nube completa contra candidatos.
    const pts = toQ(strokes, 0, 0);
    let best = 'noveo', bestS = 0;
    const scores = {};
    candidates.filter(function (c) { return c; }).forEach(function (c) {
      const s = scoreAgainst(pts, c);
      scores[c] = s;
      if (s > bestS) { bestS = s; best = c; }
    });
    if (bestS < MIN_SCORE) return { text: 'noveo', score: bestS, mode: 'nube' };
    if (normal && best !== normal && scores[normal] >= bestS * NORMAL_MARGIN) best = normal;
    return { text: best, score: bestS, mode: 'nube' };
  }

  window.DigitsQ = { read: read, readDigit: readDigit, DIGITS: DIGITS, _groupByX: groupByX };
})();
