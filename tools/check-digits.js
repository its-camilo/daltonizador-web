/* tools/check-digits.js — prueba sintetica del reconocedor $Q (digits-q.js). Ejecutar: node tools/check-digits.js */
global.window = {};
require('../vendor/qdollar/qdollar.js');
require('../digits-q.js');
const D = window.DigitsQ;
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function distort(strokes, amt, dx) {
  const sx = 80 * (1 + (rnd() - .5) * .3), sy = 80 * (1 + (rnd() - .5) * .3), sh = (rnd() - .5) * .3;
  return strokes.map(st => {
    const pts = st.map(p => [(p[0] + sh * p[1] + dx) * sx, p[1] * sy]);
    const out = []; let ox = 0, oy = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const L = Math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]); const n = Math.max(1, Math.round(L / 4));
      for (let k = 0; k < n; k++) { const t = k / n; ox = ox * 0.8 + (rnd() - .5) * amt * 0.4; oy = oy * 0.8 + (rnd() - .5) * amt * 0.4;
        out.push([pts[i][0] + (pts[i+1][0]-pts[i][0]) * t + ox, pts[i][1] + (pts[i+1][1]-pts[i][1]) * t + oy]); }
    }
    out.push(pts[pts.length - 1]);
    return out;
  });
}
const amts = [4, 10, 18];
for (const amt of amts) {
  let ok = 0, n = 0, minC = 1, conf = {};
  for (const d of Object.keys(D.DIGITS)) for (const v of D.DIGITS[d]) for (let k = 0; k < 6; k++) {
    const r = D.readDigit(distort(v, amt, 0)); n++;
    if (r.digit === d) { ok++; minC = Math.min(minC, r.score); } else conf[d + '->' + r.digit] = (conf[d + '->' + r.digit] || 0) + 1;
  }
  console.log('ruido', amt, 'acierto', (ok / n * 100).toFixed(1) + '%', 'min score correcto', minC.toFixed(3), JSON.stringify(conf));
}
// garabatos
let mx = 0;
for (let k = 0; k < 40; k++) { const st = [[]]; for (let i = 0; i < 30; i++) st[0].push([rnd()*100, rnd()*140]); mx = Math.max(mx, D.readDigit(st).score); }
console.log('max score garabato aleatorio', mx.toFixed(3));
// dos cifras
let ok2 = 0, n2 = 0;
for (const t of ['29', '70', '74', '21', '16', '35', '96', '12']) for (let k = 0; k < 5; k++) {
  const s = []; t.split('').forEach((ch, i) => s.push(...distort(D.DIGITS[ch][0], 8, i * 1.6)));
  const r = D.read(s, [t], t === '29' ? '29' : t); n2++; if (r.text === t) ok2++; else console.log('fallo', t, r);
}
console.log('dos cifras', ok2 + '/' + n2);
// sesgo: dibuja 3 en lamina 2 (8/3)
let r3 = 0; for (let k = 0; k < 10; k++) if (D.read(distort(D.DIGITS['3'][0], 8, 0), ['8', '3'], '8').text === '3') r3++;
console.log('dibuja 3 en lamina 8/3 -> leido 3:', r3 + '/10');
