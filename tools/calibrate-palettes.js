/* tools/calibrate-palettes.js
 * Calibra las paletas de las laminas contra el eje de confusion.
 * Ejecutar: node tools/calibrate-palettes.js  -> reescribe palettes.js
 *
 * Problema que resuelve: si figura y fondo tienen distinta luminancia, una
 * persona dicromata lee el numero por el claroscuro y la lamina no tamiza.
 * Metodo (en sRGB lineal, simulacion Machado 2009 a severidad 1.0):
 * 1. Cada paleta = color base x factores de brillo JITTER, iguales para figura
 *    y fondo. Asi el brillo varia punto a punto y no delata la figura.
 * 2. Busqueda aleatoria con semilla fija de pares (figura, fondo) que:
 *    - tengan la misma luminancia Y en vision normal,
 *    - maximicen DeltaE (CIE76) en vision normal,
 *    - minimicen DeltaE en las simulaciones donde la figura debe "desaparecer".
 * Objetivos por rol:
 *    vanish : visible normal; oculta en protan Y deutan (laminas 2-8, 10, linea A de la 11).
 *    hideP  : visible normal y deutan; oculta en protan (digito izq. de 12-13, linea roja de 14).
 *    hideD  : visible normal y protan; oculta en deutan (digito der. de 12-13, linea morada de 14).
 *    all    : visible para todos (linea B de la 11).
 */
const fs = require('fs');
const path = require('path');
const C = require('./color.js');

const JITTER = [0.78, 0.89, 1.0, 1.12, 1.25];
let seed = 20261021;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function scaleToY(l, y) { const k = y / C.Y(l); return l.map((v) => v * k); }
function inGamut(l) { return l.every((v) => v >= 0.003 && v * JITTER[JITTER.length - 1] <= 1); }

function score(role, f, b) {
  const n = C.dE(f, b);
  const p = C.dE(C.simulate(1, 1, f), C.simulate(1, 1, b));
  const d = C.dE(C.simulate(2, 1, f), C.simulate(2, 1, b));
  let s;
  if (role === 'vanish') s = n - 5 * Math.max(p, d);
  else if (role === 'hideP') s = Math.min(n, d) - 5 * p;
  else if (role === 'hideD') s = Math.min(n, p) - 5 * d;
  else s = Math.min(n, p, d) > 18 ? 0 : -100;
  return { s: s, n: n, p: p, d: d };
}

// Busca la figura para un fondo dado (mismo Y salvo en hideP/hideD, donde la
// igualdad que importa es en la simulacion; se prueba un rango de Y).
function search(role, bgLin, iters) {
  let best = null;
  const y0 = C.Y(bgLin);
  for (let i = 0; i < iters; i++) {
    let f = [rnd(), rnd(), rnd()].map((v) => v * 0.8);
    const yk = (role === 'vanish' || role === 'all') ? 1 : 0.7 + rnd() * 0.6;
    f = scaleToY(f, y0 * yk);
    if (!inGamut(f)) continue;
    const sc = score(role, f, bgLin);
    if (!best || sc.s > best.sc.s) best = { f: f, sc: sc };
  }
  // Refinamiento local.
  for (let i = 0; i < iters; i++) {
    let f = best.f.map((v) => v * (1 + (rnd() - 0.5) * 0.12));
    if (role === 'vanish' || role === 'all') f = scaleToY(f, y0);
    if (!inGamut(f)) continue;
    const sc = score(role, f, bgLin);
    if (sc.s > best.sc.s) best = { f: f, sc: sc };
  }
  return best;
}

const palette = (l) => JITTER.map((k) => C.linToHex(l.map((v) => v * k)));
const report = [];
function plateSet(name, bgHex, roles) {
  const bg = C.hexToLin(bgHex);
  const out = { bg: palette(bg), bgBase: C.linToHex(bg) };
  Object.keys(roles).forEach((key) => {
    const r = search(roles[key], bg, 40000);
    out[key] = palette(r.f);
    report.push(name + '.' + key + ' (' + roles[key] + '): ' + C.linToHex(r.f) + ' sobre ' + bgHex +
      ' | DeltaE normal ' + r.sc.n.toFixed(1) + ', protan ' + r.sc.p.toFixed(1) + ', deutan ' + r.sc.d.toFixed(1));
  });
  return out;
}

// Fondos: verde oliva (clasico Ishihara) y gris neutro para las de trazo.
const P = {
  jitter: JITTER,
  num: plateSet('num', '#9aa86e', { fig: 'vanish' }),
  num2: plateSet('num2', '#9aa86e', { left: 'hideP', right: 'hideD' }),
  trace11: plateSet('trace11', '#8f9a86', { a: 'vanish', b: 'all' }),
  trace14: plateSet('trace14', '#8f9a86', { red: 'hideP', purple: 'hideD' })
};

const header = '/* palettes.js — GENERADO por tools/calibrate-palettes.js. No editar a mano.\n' +
  ' * Paletas calibradas contra el eje de confusion (Machado 2009, severidad 1.0).\n' +
  report.map((l) => ' * ' + l).join('\n') + '\n */\n';
fs.writeFileSync(path.join(__dirname, '..', 'palettes.js'), header + 'window.ISHIHARA_PALETTES = ' + JSON.stringify(P, null, 2) + ';\n');
console.log(report.join('\n'));
