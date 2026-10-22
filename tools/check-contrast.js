/* tools/check-contrast.js
 * Contraste WCAG (L1 + 0.05) / (L2 + 0.05) de cada par de colores del diagrama
 * de prueba (diagram.js), antes y despues de simular cada tipo a severidad 1.0.
 * Ejecutar: node tools/check-contrast.js
 * La simulacion es la misma del shader (Machado protan/deutan, Brettel tritan),
 * asi que la luminancia "despues" es la que percibe el observador simulado.
 */
const C = require('./color.js');
const PAIRS = [
  ['Par vulnerable ERROR / EXITO', '#d32f2f', '#00c853'],
  ['Texto blanco sobre ERROR', '#ffffff', '#d32f2f'],
  ['Texto oscuro sobre EXITO', '#111111', '#00c853'],
  ['Degradado rojo vs verde (extremos)', '#ff0000', '#00ff00'],
  ['Degradado azul vs amarillo (extremos)', '#0066ff', '#ffcc00'],
  ['Parche rojo vs verde', '#ff0000', '#00c853'],
  ['Parche azul vs amarillo', '#0066ff', '#ffcc00'],
  ['Parche magenta vs cian', '#ff00ff', '#00cccc'],
  ['Placa 12: figura vs fondo', '#c96a2b', '#7fae6e'],
  ['Placa 8: figura vs fondo', '#b55242', '#8fae7a'],
  ['Placa 29: figura vs fondo', '#a85a3a', '#93b06a'],
  ['Placa 74: figura vs fondo', '#b06a35', '#7fae8a'],
  ['Placa 6 (azul-amarillo): figura vs fondo', '#2b6cb0', '#e8d44d']
];
const T = ['normal', 'protan', 'deutan', 'tritan'];
const rows = PAIRS.map(([name, a, b]) => {
  const A = C.hexToLin(a), B = C.hexToLin(b);
  const vals = [C.wcag(A, B)];
  for (let t = 1; t <= 3; t++) vals.push(C.wcag(C.simulate(t, 1, A), C.simulate(t, 1, B)));
  return { name, a, b, vals };
});
console.log('Par'.padEnd(44) + T.map((t) => t.padStart(8)).join(''));
rows.forEach((r) => console.log((r.name + ' ' + r.a + '/' + r.b).padEnd(44).slice(0, 60) + r.vals.map((v) => (v.toFixed(2) + ':1').padStart(8)).join('')));
module.exports = rows;
