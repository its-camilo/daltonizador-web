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

  function dottedPath(ctx, pts, R, color, w) {
    for (let s = 0; s < pts.length - 2; s += 2) {
      for (let t = 0; t <= 1; t += 0.025) {
        const p = qbez(pts[s], pts[s + 1], pts[s + 2], t);
        const jx = (R() - 0.5) * 3, jy = (R() - 0.5) * 3;
        disc(ctx, p[0] + jx, p[1] + jy, 4 + R() * 4, color);
      }
    }
    void w;
  }

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
      dottedPath(ctx, [[cx - 90, cy + 80], [cx - 30, cy - 90], [cx + 40, cy - 20], [cx + 90, cy - 80], [cx + 60, cy + 70]], R, '#3f7f7a', W);
      dottedPath(ctx, [[cx - 95, cy - 60], [cx, cy + 40], [cx + 95, cy + 50]], R, '#a05a4a', W);
      ctx.restore();
    } else if (plate.kind === 'trace' && plate.id === 14) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#8b8f7a'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      dotField(ctx, cx, cy, r, R, 700, ['#8b8f7a', '#7c8069', '#9aa086', '#6f735f']);
      dottedPath(ctx, [[cx - 95, cy + 60], [cx - 20, cy - 80], [cx + 30, cy + 0], [cx + 95, cy - 40]], R, '#7a4a8c', W);
      dottedPath(ctx, [[cx - 95, cy - 40], [cx, cy + 60], [cx + 40, cy + 10], [cx + 95, cy + 70]], R, '#a04a3a', W);
      ctx.restore();
    } else {
      const bg = plate.rev ? ['#a5714f', '#96613f', '#b3805c', '#8a5638'] : ['#7fae6e', '#8fae7a', '#6f9e63', '#93b06a'];
      const fg = plate.rev ? '#3f6b4f' : '#b06a35';
      const fg2 = '#8c3d30';
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = bg[0]; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      dotField(ctx, cx, cy, r, R, 850, bg);
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (plate.kind === 'num2') {
        // Dos tonos aproximados. Uno por digito para protan/deutan fuerte.
        ctx.font = 'bold 120px sans-serif';
        ctx.fillStyle = '#3f7f6e';
        ctx.fillText(plate.fig[0], cx - 52, cy + 4);
        ctx.fillStyle = fg2;
        ctx.fillText(plate.fig[1], cx + 52, cy + 4);
        ctx.fillStyle = 'rgba(63,127,110,0.4)';
        for (let i = 0; i < 90; i++) disc(ctx, cx - 95 + R() * 90, cy - 70 + R() * 140, 2 + R() * 3, 'rgba(63,127,110,0.5)');
        ctx.fillStyle = 'rgba(140,61,48,0.4)';
        for (let i = 0; i < 90; i++) disc(ctx, cx + 5 + R() * 90, cy - 70 + R() * 140, 2 + R() * 3, 'rgba(140,61,48,0.5)');
      } else {
        const size = plate.fig.length > 1 ? 150 : 190;
        ctx.font = 'bold ' + size + 'px sans-serif';
        ctx.fillText(plate.fig, cx, cy + 6);
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 200; i++) disc(ctx, cx - 110 + R() * 220, cy - 90 + R() * 180, 2 + R() * 3, fg);
        ctx.globalAlpha = 1;
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
