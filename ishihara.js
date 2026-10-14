/* ishihara.js
 * Test interactivo de 14 laminas estilo Ishihara.
 * Laminas generadas por codigo como APROXIMACION educativa.
 * No reemplazan las oficiales Kanehara ni un diagnostico medico.
 * Clave de respuestas segun Ishihara Instructions 14 plates:
 * 1:12 todos. 2:8/3. 3:5/2. 4:29/70. 5:74/21. 6-8: solo normal.
 * 9: invertida (normal no la ve, deficiente ve 2). 10:16/nada.
 * 11: trazo. 12:35/5 protan fuerte/3 deutan fuerte.
 * 13:96/6 protan/9 deutan. 14: trazo doble.
 * El test Ishihara no diagnostica tritan. Tritan queda manual.
 */
(function () {
  'use strict';

  window.ISHIHARA_PLATES = [
    { id: 1, kind: 'num', fig: '12', normal: '12', note: 'Demostracion. Todos ven 12.' },
    { id: 2, kind: 'num', fig: '8', normal: '8', rg: '3', note: 'Normal 8. Deficiencia rojo-verde 3.' },
    { id: 3, kind: 'num', fig: '5', normal: '5', rg: '2', note: 'Normal 5. Deficiencia 2.' },
    { id: 4, kind: 'num', fig: '29', normal: '29', rg: '70', note: 'Normal 29. Deficiencia 70.' },
    { id: 5, kind: 'num', fig: '74', normal: '74', rg: '21', note: 'Normal 74. Deficiencia 21.' },
    { id: 6, kind: 'num', fig: '6', normal: '6', rg: '', note: 'Solo vision normal la lee.' },
    { id: 7, kind: 'num', fig: '3', normal: '3', rg: '', note: 'Solo vision normal la lee.' },
    { id: 8, kind: 'num', fig: '2', normal: '2', rg: '', note: 'Normal 2. Deficiencia no la ve.' },
    { id: 9, kind: 'num', fig: '2', rev: true, normal: '', rg: '2', note: 'Invertida. Normal casi no la ve. Deficiencia ve 2.' },
    { id: 10, kind: 'num', fig: '16', normal: '16', rg: '', note: 'Normal 16. Deficiencia no la ve.' },
    { id: 11, kind: 'trace', note: 'Trazo. Normal sigue la verde-azulada.',
      opts: ['Sigo la linea verde-azulada completa', 'Sigo otra linea distinta', 'No puedo seguir ninguna linea'] },
    { id: 12, kind: 'num2', fig: '35', normal: '35', protan: '5', deutan: '3',
      note: 'Normal y leve 35. Protan fuerte 5. Deutan fuerte 3.' },
    { id: 13, kind: 'num2', fig: '96', normal: '96', protan: '6', deutan: '9',
      note: 'Normal y leve 96. Protan fuerte 6. Deutan fuerte 9.' },
    { id: 14, kind: 'trace', note: 'Trazo doble. Morada y roja.',
      opts: ['Sigo ambas lineas, morada y roja', 'Solo sigo la morada', 'Solo sigo la roja', 'No sigo ninguna'] }
  ];

  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function disc(ctx, x, y, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Especificacion de figura por lamina. Misma fuente para dibujar y plantillas.
  function figureSpec(plate, W) {
    const cx = W / 2, cy = W / 2;
    const rev = !!plate.rev;
    if (plate.kind === 'num2') {
      return {
        font: 'bold 142px sans-serif',
        slots: [{ x: cx - 50, y: cy + 4 }, { x: cx + 50, y: cy + 4 }],
        figColors: ['#126b55', '#a92e24'],
        bg: ['#9abe78', '#a7c486', '#8eaf6d', '#b0c987'],
        bgBase: '#9abe78'
      };
    }
    const size = plate.fig.length > 1 ? 172 : 216;
    return {
      font: 'bold ' + size + 'px sans-serif',
      slots: [{ x: cx, y: cy + 6 }],
      figColors: [rev ? '#126b55' : '#a92e24'],
      bg: rev ? ['#c18d60', '#b77d50', '#c99c6f', '#ae754c'] : ['#9abe78', '#a7c486', '#8eaf6d', '#b0c987'],
      bgBase: rev ? '#c18d60' : '#9abe78'
    };
  }

  // Dibuja textos en máscara offscreen. Devuelve ImageData.
  function textMask(W, font, draws) {
    const c = document.createElement('canvas');
    c.width = W; c.height = W;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#000';
    x.fillRect(0, 0, W, W);
    x.fillStyle = '#fff';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = font;
    draws.forEach(function (d) { x.fillText(d.text, d.x, d.y); });
    return x.getImageData(0, 0, W, W);
  }

  function maskHit(mask, W, x, y) {
    const xi = Math.max(0, Math.min(W - 1, x | 0));
    const yi = Math.max(0, Math.min(W - 1, y | 0));
    // El fondo es negro opaco, por eso alpha vale 255 también fuera del texto.
    // El canal rojo distingue el texto blanco del fondo negro.
    return mask.data[(yi * W + xi) * 4] > 110;
  }

  // Puntos de plantilla para un candidato. draws: lista {text,x,y}.
  function templatePoints(W, font, draws) {
    const mask = textMask(W, font, draws);
    const pts = [];
    for (let y = 0; y < W; y += 5) {
      for (let x = 0; x < W; x += 5) {
        if (maskHit(mask, W, x, y)) pts.push([x, y]);
      }
    }
    return pts;
  }

  // Candidatos de respuesta por lamina. El dibujo se compara con cada uno.
  function plateCandidates(plate) {
    if (plate.kind === 'num2') return [plate.normal, plate.protan, plate.deutan];
    if (plate.rev) return ['2'];
    const out = [];
    if (plate.normal) out.push(plate.normal);
    if (plate.rg && plate.rg !== plate.normal) out.push(plate.rg);
    return out.length ? out : [plate.fig];
  }

  // Convierte candidato a draws sobre los slots de la figura.
  function candidateDraws(plate, W, cand) {
    const spec = figureSpec(plate, W);
    if (plate.kind === 'num2') {
      if (cand.length === 2) {
        return [{ text: cand[0], x: spec.slots[0].x, y: spec.slots[0].y },
                { text: cand[1], x: spec.slots[1].x, y: spec.slots[1].y }];
      }
      const si = Math.max(0, plate.fig.indexOf(cand));
      const slot = spec.slots[Math.min(si, spec.slots.length - 1)];
      return [{ text: cand, x: slot.x, y: slot.y }];
    }
    return [{ text: cand, x: spec.slots[0].x, y: spec.slots[0].y }];
  }

  function flatStrokes(strokes) {
    const out = [];
    strokes.forEach(function (st) { st.forEach(function (p) { out.push(p); }); });
    return out;
  }

  function coverageOf(A, B, tol) {
    if (!A.length || !B.length) return 0;
    let hit = 0;
    for (let i = 0; i < A.length; i++) {
      const a = A[i];
      for (let j = 0; j < B.length; j++) {
        const dx = a[0] - B[j][0], dy = a[1] - B[j][1];
        if (dx * dx + dy * dy < tol * tol) { hit++; break; }
      }
    }
    return hit / A.length;
  }

  // Normaliza puntos: centra en centroide y escala por radio medio.
  // El reconocimiento queda invariante a posicion y tamaño del dibujo.
  function normPts(pts, cap) {
    let s = pts;
    if (s.length > cap) {
      const st = Math.ceil(s.length / cap);
      s = s.filter(function (_, i) { return i % st === 0; });
    }
    let cx = 0, cy = 0;
    s.forEach(function (p) { cx += p[0]; cy += p[1]; });
    cx /= s.length; cy /= s.length;
    let r = 0;
    s.forEach(function (p) { r += Math.hypot(p[0] - cx, p[1] - cy); });
    r /= s.length;
    if (!(r > 1e-6)) r = 1;
    return s.map(function (p) { return [(p[0] - cx) / r, (p[1] - cy) / r]; });
  }
  window.__matchNorm = normPts;
  window.__matchCov = coverageOf;

  // Reconoce el numero dibujado por comparacion con plantillas.
  // Normaliza dibujo y plantilla: vale dibujar grande, pequeño o movido.
  // Devuelve el candidato ('8', '70', 'noveo', ...) o null si no hay dibujo.
  window.scoreDrawnNumber = function (plateId, strokes, S) {
    const use = strokes.filter(function (st) { return st.length >= 4; });
    let n = 0;
    use.forEach(function (st) { n += st.length; });
    if (!use.length || n < 6) return null;
    const flat = flatStrokes(use);
    // Exige tamaño minimo para evitar garabatos diminutos.
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    flat.forEach(function (p) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    });
    if (Math.hypot(x1 - x0, y1 - y0) < 40) return null;
    const W = 420;
    const plate = window.ISHIHARA_PLATES.filter(function (p) { return p.id === plateId; })[0];
    if (!plate) return null;
    const spec = figureSpec(plate, W);
    const NF = normPts(flat, 300);
    const tol = 0.45;
    const cands = plateCandidates(plate);
    const scores = {};
    let best = 'noveo', bestF1 = 0;
    cands.forEach(function (cand) {
      const T = normPts(templatePoints(W, spec.font, candidateDraws(plate, W, cand)), 300);
      const rec = coverageOf(T, NF, tol);
      const prec = coverageOf(NF, T, tol);
      const f1 = (rec + prec) > 0 ? 2 * rec * prec / (rec + prec) : 0;
      scores[cand] = f1;
      if (f1 > bestF1) { bestF1 = f1; best = cand; }
    });
    if (bestF1 < 0.25) return 'noveo';
    // Margen a favor de la respuesta normal: no sobrediagnosticar por dibujo torpe.
    const normalAns = plate.normal;
    if (best !== 'noveo' && normalAns && best !== normalAns && scores[normalAns] != null) {
      if (bestF1 - scores[normalAns] < 0.05) return normalAns;
    }
    return best;
  };

  function dotField(ctx, cx, cy, r, R, n, palette) {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2;
      const d = Math.sqrt(R()) * (r - 4);
      disc(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2 + R() * 4.5, palette[(R() * palette.length) | 0]);
    }
  }

  function qbez(p0, p1, p2, t) {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  }

  // Trazos de las laminas 11 y 14 en coordenadas relativas (-100..100).
  // Cada trazo es una lista de segmentos quadraticos [p0,p1,p2].
  function traceDef(id) {
    if (id === 11) return [
      { color: '#3f7f7a', segs: [[[-90, 80], [-30, -90], [40, -20]], [[40, -20], [90, -80], [60, 70]]] },
      { color: '#a05a4a', segs: [[[-95, -60], [0, 40], [95, 50]]] }
    ];
    return [
      { color: '#7a4a8c', segs: [[[-95, 60], [-20, -80], [30, 0]], [[30, 0], [95, -40], [60, 60]]] },
      { color: '#a04a3a', segs: [[[-95, -40], [0, 60], [40, 10]], [[40, 10], [95, 70], [20, 80]]] }
    ];
  }

  // Trazos en pixeles del canvas. Misma fuente para dibujar y calificar.
  function scaledTracePaths(id, W) {
    const k = W / 420, cx = W / 2, cy = W / 2;
    return traceDef(id).map(function (path) {
      const pts = [];
      path.segs.forEach(function (s) {
        const a = [cx + s[0][0] * k, cy + s[0][1] * k];
        const b = [cx + s[1][0] * k, cy + s[1][1] * k];
        const c = [cx + s[2][0] * k, cy + s[2][1] * k];
        for (let t = 0; t <= 1.0001; t += 0.04) pts.push(qbez(a, b, c, t));
      });
      return { color: path.color, pts: pts };
    });
  }

  function drawTracePaths(ctx, id, W, R) {
    scaledTracePaths(id, W).forEach(function (path) {
      for (let i = 0; i < path.pts.length; i += 2) {
        const p = path.pts[i];
        disc(ctx, p[0] + (R() - 0.5) * 4, p[1] + (R() - 0.5) * 4, 4 + R() * 4, path.color);
      }
    });
  }

  function distPt(p, q) {
    const dx = p[0] - q[0], dy = p[1] - q[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Califica trazos del usuario. strokes: arreglo de trazos, cada uno lista [x,y].
  // Asigna cada trazo al camino mas cercano solo si gana con claridad.
  // Devuelve indice de opcion ('0'..'3') o null si no hay dibujo util.
  window.scoreTrace = function (plateId, strokes, S) {
    const use = strokes.filter(function (st) { return st.length >= 4; });
    let n = 0;
    use.forEach(function (st) { n += st.length; });
    if (!use.length || n < 8) return null;
    const paths = scaledTracePaths(plateId, S || 420);
    const tol = Math.max(18, (S || 420) * 0.07);
    function meanDist(st, pts) {
      let sum = 0;
      for (let i = 0; i < st.length; i++) {
        let m = 1e12;
        for (let j = 0; j < pts.length; j++) {
          const d = distPt(st[i], pts[j]);
          if (d < m) m = d;
        }
        sum += m;
      }
      return sum / st.length;
    }
    const owners = paths.map(function () { return false; });
    use.forEach(function (st) {
      const ds = paths.map(function (p) { return meanDist(st, p.pts); });
      let bi = 0;
      for (let i = 1; i < ds.length; i++) if (ds[i] < ds[bi]) bi++;
      if (ds[bi] > tol) return;
      for (let i = 0; i < ds.length; i++) {
        if (i !== bi && ds[bi] > ds[i] * 0.7) return; // sin ganador claro
      }
      owners[bi] = true;
    });
    if (plateId === 11) {
      if (owners[0]) return '0';
      if (owners[1]) return '1';
      return '2';
    }
    const p = owners[0], r = owners[1];
    if (p && r) return '0';
    if (p) return '1';
    if (r) return '2';
    return '3';
  };

  window.drawIshiharaTestPlate = function (canvas, plate) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, cx = W / 2, cy = W / 2, r = W / 2 - 14;
    const R = rng(plate.id * 7919 + 13);
    ctx.clearRect(0, 0, W, canvas.height);
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, W, canvas.height);

    if (plate.kind === 'trace' && plate.id === 11) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#8fa07a'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      dotField(ctx, cx, cy, r, R, 700, ['#8fa07a', '#7d9268', '#9db088', '#6f845e']);
      drawTracePaths(ctx, 11, W, R);
      ctx.restore();
    } else if (plate.kind === 'trace' && plate.id === 14) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#8b8f7a'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      dotField(ctx, cx, cy, r, R, 700, ['#8b8f7a', '#7c8069', '#9aa086', '#6f735f']);
      drawTracePaths(ctx, 14, W, R);
      ctx.restore();
    } else {
      // Lamina numerica DIFICIL: figura solo con puntos, sin relleno solido.
      // Cada punto cae en figura o fondo segun la mascara del texto.
      const spec = figureSpec(plate, W);
      const fullDraws = plate.fig.split('').map(function (ch, i) {
        const s = spec.slots[Math.min(i, spec.slots.length - 1)];
        return { text: ch, x: s.x, y: s.y };
      });
      const figMask = textMask(W, spec.font, fullDraws);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = spec.bgBase; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      const ND = 4200;
      for (let i = 0; i < ND; i++) {
        const a = R() * Math.PI * 2;
        const d = Math.sqrt(R()) * (r - 4);
        const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d;
        let col = spec.bg[(R() * spec.bg.length) | 0];
        if (maskHit(figMask, W, px, py)) {
          // Identifica digito para bicolor en num2.
          let slot = 0;
          if (plate.kind === 'num2') slot = (px < cx) ? 0 : 1;
          col = spec.figColors[slot];
          if (R() < 0.06) col = spec.bg[(R() * spec.bg.length) | 0]; // poco ruido
        } else if (R() < 0.01) {
          col = spec.figColors[(R() * spec.figColors.length) | 0]; // poco señuelo
        }
        disc(ctx, px, py, 3 + R() * 5, col);
      }
      ctx.restore();
    }
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    return canvas;
  };

  // answers: arreglo de 14 strings. Numero normalizado o 'noveo' o indice de trazo.
  // Devuelve {type, severity, label, errors, detail, note}.
  window.scoreIshihara = function (answers) {
    const P = window.ISHIHARA_PLATES;
    const norm = answers.map(function (a) { return String(a == null ? '' : a).trim().toLowerCase(); });
    let E = 0; // errores de tamizaje en laminas 2-10
    for (let i = 1; i <= 8; i++) {
      const pl = P[i];
      const a = norm[i];
      if (pl.rev) { if (a === '2') E++; }
      else if (a !== pl.normal) E++;
    }
    // Lamina 10 (indice 9)
    if (norm[9] !== P[9].normal) E++;

    let protan = 0, deutan = 0, mild = 0;
    const a12 = norm[11], a13 = norm[12];
    if (a12 === P[11].protan) protan += 2; else if (a12 === P[11].deutan) deutan += 2;
    else if (a12 === P[11].normal) mild++; else if (a12 !== '' && a12 !== 'noveo') E += 0;
    if (a13 === P[12].protan) protan += 2; else if (a13 === P[12].deutan) deutan += 2;
    else if (a13 === P[12].normal) mild++;
    const t11 = norm[10], t14 = norm[13];
    if (t14 === '1') protan += 2; else if (t14 === '2') deutan += 2;
    else if (t14 === '3') { protan++; deutan++; }
    if (t11 === '2') E++;

    const controlOK = norm[0] === '12';
    let type = 0, severity = 0, label = '';
    if (E <= 1) {
      type = 0; severity = 0;
      label = 'Vision cromatica normal en este test';
    } else {
      if (protan === deutan) type = (t14 === '1') ? 1 : 2; // empate: trazo manda, si no deutan por prevalencia
      else type = protan > deutan ? 1 : 2;
      const strongDigits = (a12 === P[11].protan || a12 === P[11].deutan || a13 === P[12].protan || a13 === P[12].deutan);
      if (strongDigits || E >= 7) severity = 1.0;
      else if (E >= 5) severity = 0.8;
      else if (E >= 3) severity = 0.6;
      else severity = 0.3;
      label = (type === 1 ? 'Protan' : 'Deutan') + (severity >= 0.8 ? ' fuerte' : severity >= 0.5 ? ' media' : ' leve') + ' (aproximado)';
    }
    const names = ['Normal', 'Protan (rojo)', 'Deutan (verde)', 'Tritan (azul)'];
    return {
      type: type, severity: severity, label: label,
      errors: E, controlOK: controlOK, mild: mild,
      typeName: names[type],
      detail: 'Aciertos de tamizaje: ' + (9 - Math.min(E, 9)) + '/9. Votos protan ' + protan + ', deutan ' + deutan + '.',
      note: 'Aproximacion educativa, no diagnostico. Ishihara no evalua tritan. ' +
        (!controlOK ? 'Control inicial distinto de 12: repite el test con calma. ' : '') +
        (type !== 0 && protan === deutan && t14 !== '1' ? 'Tipo por prevalencia (deutan es mas comun). ' : '')
    };
  };
})();

// ---- Renderer de laminas con libreria open source (MIT) ----
// Fuente: @mtillmann/ishihara v0.2.2 (vendor/ishihara-mtillmann/LICENSE).
// Empaqueta circulos dentro del glifo con dos paletas: figura y fondo.
// Solo para laminas numericas de una figura (no 12 ni 13, que necesitan
// dos colores por digito). Si la libreria no carga, usa el renderer propio.
(function () {
  'use strict';
  const LIB_PAL = {
    normal: { fig: ['#a92e24', '#b8402f', '#9c2a22'], bg: ['#9abe78', '#a7c486', '#8eaf6d', '#b0c987'], dark: '#22252a' },
    rev: { fig: ['#126b55', '#1a7d63', '#0e5a47'], bg: ['#c18d60', '#b77d50', '#c99c6f', '#ae754c'], dark: '#22252a' }
  };
  const cache = {};

  window.libPlateCanvas = async function (plate, size) {
    const key = plate.id + ':' + size;
    if (cache[key]) return cache[key];
    if (typeof window.ishihara !== 'function') return null;
    const pal = plate.rev ? LIB_PAL.rev : LIB_PAL.normal;
    const digits = plate.fig.length;
    const packer = await window.ishihara({
      text: plate.fig,
      font: 'bold ' + (digits > 1 ? 172 : 216) + 'px sans-serif',
      textColors: pal.fig,
      backgroundColors: pal.bg,
      padding: '12%',
      margin: '6%',
      radius: 'auto',
      circlePackerOptions: {
        numCircles: 2600,
        minRadius: 3,
        maxRadius: 9,
        spacing: 1,
        higherAccuracy: true,
        useMainThread: true
      }
    });
    const src = packer.asCanvas({ scale: 1 });
    cache[key] = src;
    return src;
  };

  // Dibuja una lamina numerica. Devuelve true si uso la libreria.
  window.drawIshiharaLibPlate = async function (canvas, plate) {
    if (plate.kind !== 'num') return false;
    const W = canvas.width;
    const src = await window.libPlateCanvas(plate, W);
    if (!src) return false;
    const ctx = canvas.getContext('2d');
    const cx = W / 2, cy = W / 2, r = W / 2 - 14;
    ctx.fillStyle = LIB_PAL.normal.dark;
    ctx.fillRect(0, 0, W, W);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = plate.rev ? LIB_PAL.rev.bg[0] : LIB_PAL.normal.bg[0];
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // La libreria devuelve la region del texto con margen. Se ajusta al circulo.
    const side = r * 2;
    ctx.drawImage(src, cx - side / 2, cy - side / 2, side, side);
    ctx.restore();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    return true;
  };

  // Punto de entrada usado por main.js: libreria si existe, si no el renderer propio.
  window.drawIshiharaTestPlateAsync = async function (canvas, plate) {
    const used = await window.drawIshiharaLibPlate(canvas, plate);
    if (!used) window.drawIshiharaTestPlate(canvas, plate);
    return used;
  };
})();
