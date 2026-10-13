/* presets.js
 * Solo 3 presets fijos de referencia al 100%.
 * El resto se arma con el test Ishihara (ishihara.js),
 * que calcula tipo e intensidad y guarda el preset propio.
 * mode: 1 simulacion. type: 1 protan, 2 deutan, 3 tritan.
 */
window.DALTON_PRESETS = [
  { id: 'vision-normal', nombre: 'Visión normal', descripcion: 'Original sin filtro. Referencia.', mode: 0, type: 0, severity: 0, split: false },  { id: 'sim-protan-100', nombre: 'Protan 100%', descripcion: 'Protanopia total. Referencia.', mode: 1, type: 1, severity: 1.0, split: false },
  { id: 'sim-deutan-100', nombre: 'Deutan 100%', descripcion: 'Deuteranopia total. La mas comun.', mode: 1, type: 2, severity: 1.0, split: false },
  { id: 'sim-tritan-100', nombre: 'Tritan 100%', descripcion: 'Tritanopia total. Caso raro.', mode: 1, type: 3, severity: 1.0, split: false }
];

window.DALTON_INTENSITIES = [0, 0.25, 0.5, 0.75, 1.0];
window.DALTON_TYPES = [
  { v: 0, nombre: 'Normal' },
  { v: 1, nombre: 'Protan (rojo)' },
  { v: 2, nombre: 'Deutan (verde)' },
  { v: 3, nombre: 'Tritan (azul)' }
];
window.DALTON_MODES = [
  { v: 0, nombre: 'Original' },
  { v: 1, nombre: 'Simulacion' },
  { v: 2, nombre: 'Correccion' }
];
