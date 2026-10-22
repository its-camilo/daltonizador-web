/* tools/check-matrices.js
 * Verificacion numerica de machado.js. Ejecutar: node tools/check-matrices.js
 * 1. Blanco y grises se conservan (filas suman 1) en todo tipo y severidad.
 * 2. Identidad en severidad 0.
 * 3. Par rojo-verde vulnerable del diagrama colapsa en deutan 1.0
 *    (contraste WCAG y distancia de color bajan), par azul-amarillo resiste.
 */
const M = require('../machado.js');
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const enc = (c) => { c = Math.min(1, Math.max(0, c)); return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const Y = (l) => 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
const apply = (m, l) => [0, 1, 2].map((r) => Math.min(1, Math.max(0, m[r * 3] * l[0] + m[r * 3 + 1] * l[1] + m[r * 3 + 2] * l[2])));
const wcag = (a, b) => { const y1 = Y(a), y2 = Y(b); return (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05); };
const dist = (a, b) => Math.hypot(...a.map((v, i) => enc(v) - enc(b[i])));
let fail = 0;
const check = (ok, msg) => { console.log((ok ? 'OK   ' : 'FALLA') + ' ' + msg); if (!ok) fail++; };

for (const t of [1, 2, 3]) {
  let worst = 0;
  for (let s = 0; s <= 1.0001; s += 0.05) {
    const p = M.simParams(t, s); // lo que recibe el shader (tritan = Brettel)
    for (const m of [p.m1, p.m2]) for (let r = 0; r < 3; r++) worst = Math.max(worst, Math.abs(m[r * 3] + m[r * 3 + 1] + m[r * 3 + 2] - 1));
  }
  check(worst < 2e-3, 'tipo ' + t + ': blanco/grises conservados (error max ' + worst.toExponential(2) + ')');
  const p0 = M.simParams(t, 0);
  check([p0.m1, p0.m2].every((m) => m.every((v, i) => Math.abs(v - M.IDENTITY[i]) < 1e-12)), 'tipo ' + t + ': severidad 0 = identidad');
}

const pairs = [
  { n: 'rojo-verde vulnerable (diagrama)', a: '#d32f2f', b: '#00c853', expectCollapse: true },
  { n: 'azul-amarillo seguro (diagrama)', a: '#0066ff', b: '#ffcc00', expectCollapse: false }
];
for (const p of pairs) {
  const A = hex(p.a).map(lin), B = hex(p.b).map(lin);
  const m = M.simMatrix(2, 1);
  const d0 = dist(A, B), d1 = dist(apply(m, A), apply(m, B));
  console.log('      ' + p.n + ': WCAG ' + wcag(A, B).toFixed(2) + ' -> ' + wcag(apply(m, A), apply(m, B)).toFixed(2) +
    ', distancia sRGB ' + d0.toFixed(3) + ' -> ' + d1.toFixed(3));
  check(p.expectCollapse ? d1 < d0 * 0.6 : d1 > d0 * 0.6, p.n + (p.expectCollapse ? ' colapsa en deutan' : ' resiste en deutan'));
}
process.exit(fail ? 1 : 0);
