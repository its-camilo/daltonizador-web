/* tools/compare-models.js
 * Compara Brettel 1997, Vienot 1999 y Machado 2009 a severidad 1.0.
 * Ejecutar: node tools/compare-models.js
 * Carta: rejilla sRGB de 6x6x6 (216 colores) + colores del diagrama.
 * Metrica: DeltaE CIE76 entre las salidas de cada par de modelos (media y maxima)
 * y error de blanco/grises de cada modelo.
 * Matrices de Brettel y Vienot: libDaltonLens (dominio publico), modelo
 * LMS Smith-Pokorny 75 sobre sRGB. Machado: Tabla 1 del paper.
 */
const M = require('../machado.js');
const C = require('./color.js');
const { BRETTEL, VIENOT } = M.MODELS;
const TABLE_TRITAN_MACHADO = M.simMatrix; // se usa via simMatrix(3, 1)

const chart = [];
for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++) chart.push([r / 5, g / 5, b / 5].map(C.lin));
['#d32f2f', '#00c853', '#0066ff', '#ffcc00', '#ff00ff', '#00cccc', '#c96a2b', '#7fae6e'].forEach((h) => chart.push(C.hexToLin(h)));

const brettel = (t, l) => {
  const p = BRETTEL[t];
  const side = l[0] * p.n[0] + l[1] * p.n[1] + l[2] * p.n[2] >= 0;
  return C.clamp01(C.mul(side ? p.m1 : p.m2, l));
};
const vienot = (t, l) => C.clamp01(C.mul(VIENOT[t], l));
const machado = (t, l) => C.clamp01(C.mul(TABLE_TRITAN_MACHADO(t, 1), l));

function compare(name, f, g) {
  let sum = 0, max = 0;
  chart.forEach((l) => { const d = C.dE(f(l), g(l)); sum += d; if (d > max) max = d; });
  return name + ': DeltaE media ' + (sum / chart.length).toFixed(2) + ', maxima ' + max.toFixed(2);
}
const names = { 1: 'Protan', 2: 'Deutan', 3: 'Tritan' };
for (const t of [1, 2, 3]) {
  console.log('\n' + names[t] + ' (severidad 1.0)');
  console.log('  ' + compare('Brettel vs Machado', (l) => brettel(t, l), (l) => machado(t, l)));
  if (VIENOT[t]) {
    console.log('  ' + compare('Brettel vs Vienot ', (l) => brettel(t, l), (l) => vienot(t, l)));
    console.log('  ' + compare('Vienot vs Machado ', (l) => vienot(t, l), (l) => machado(t, l)));
  }
  const grey = [0.2, 0.2, 0.2];
  const err = (f) => Math.max(C.dE(f([1, 1, 1]), [1, 1, 1]), C.dE(f(grey), grey)).toFixed(3);
  console.log('  Error en blanco/gris (DeltaE): Brettel ' + err((l) => brettel(t, l)) +
    (VIENOT[t] ? ', Vienot ' + err((l) => vienot(t, l)) : '') + ', Machado ' + err((l) => machado(t, l)));
}
console.log('\nEl shader usa Machado en protan/deutan y Brettel en tritan (Machado no modela bien la tritanopia).');
