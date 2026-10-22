/* tools/calibrate-thresholds.js
 * Recalibra el umbral de $Q (MIN_SCORE) y el margen a favor de la respuesta
 * normal (NORMAL_MARGIN) de digits-q.js con datos reales de un grupo de prueba.
 * Uso: node tools/calibrate-thresholds.js carpeta-con-json/
 * Cada JSON sale del boton "Exportar datos (calibracion)" del test.
 *
 * Metodo: se usan los participantes con vision declarada "normal" (o, si no la
 * declararon, con tamizaje normal). En las laminas numericas que pueden ver
 * (1-8, 10, 12, 13) se recalcula la lectura con distintos umbrales y margenes y
 * se reporta la tasa de lecturas correctas. Se sugiere el umbral mas alto que
 * mantenga >= 95 % de aciertos (filtra garabatos sin castigar a quien dibuja bien).
 */
const fs = require('fs');
const path = require('path');
global.window = {};
require('../vendor/qdollar/qdollar.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'digits-q.js'), 'utf8');

const dir = process.argv[2];
if (!dir) { console.log('Uso: node tools/calibrate-thresholds.js carpeta/'); process.exit(1); }
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
const data = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const normals = data.filter((d) => d.visionDeclarada === 'normal' || (!d.visionDeclarada && d.resultado.screening === 'normal'));
console.log('Archivos: ' + data.length + '. Participantes de referencia (vision normal): ' + normals.length);
if (!normals.length) process.exit(0);

// Clave minima (igual a ishihara.js).
const KEY = { 0: '12', 1: '8', 2: '5', 3: '29', 4: '74', 5: '7', 6: '45', 7: '2', 9: '16', 11: '35', 12: '96' };
const CANDS = { 0: ['12'], 1: ['8', '3'], 2: ['5', '2'], 3: ['29', '70'], 4: ['74', '21'], 5: ['7'], 6: ['45'], 7: ['2'], 9: ['16'], 11: ['35', '5', '3'], 12: ['96', '6', '9'] };

function loadWith(minScore, margin) {
  window.DigitsQ = undefined;
  const patched = src.replace(/const MIN_SCORE = [0-9.]+;/, 'const MIN_SCORE = ' + minScore + ';')
    .replace(/const NORMAL_MARGIN = [0-9.]+;/, 'const NORMAL_MARGIN = ' + margin + ';');
  new Function('window', patched)(window);
  return window.DigitsQ;
}

const results = [];
for (const minScore of [0.06, 0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.20]) {
  for (const margin of [1.0, 0.95, 0.9, 0.85, 0.8]) {
    const D = loadWith(minScore, margin);
    let ok = 0, n = 0;
    normals.forEach((d) => Object.keys(KEY).forEach((i) => {
      const st = (d.trazos[i] || []).filter((s) => s.length >= 4);
      if (!st.length) return;
      n++;
      if (D.read(st, CANDS[i], KEY[i]).text === KEY[i]) ok++;
    }));
    results.push({ minScore, margin, acc: n ? ok / n : 0, n });
  }
}
results.forEach((r) => console.log('MIN_SCORE ' + r.minScore.toFixed(2) + '  NORMAL_MARGIN ' + r.margin.toFixed(2) + '  aciertos ' + (r.acc * 100).toFixed(1) + '% (' + r.n + ' dibujos)'));
const good = results.filter((r) => r.acc >= 0.95 && r.margin === 0.9).sort((a, b) => b.minScore - a.minScore)[0];
console.log(good ? '\nSugerido: MIN_SCORE = ' + good.minScore + ' con NORMAL_MARGIN = 0.9' : '\nNingun umbral llega a 95 %: revisar plantillas de digitos.');
