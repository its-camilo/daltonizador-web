/* presets.js
 * Presets = tipo de vision. La intensidad (severidad) es independiente:
 * va en el slider y se conserva al cambiar de preset.
 * Modo unico: simulacion (Machado 2009).
 * type: 0 normal, 1 protan, 2 deutan, 3 tritan.
 */
window.DALTON_PRESETS = [
  { id: 'vision-normal', type: 0, nombre: 'Visión normal', descripcion: 'Original sin filtro.' },
  { id: 'protan', type: 1, nombre: 'Protan (rojo)', descripcion: 'Protanomalía / protanopía.' },
  { id: 'deutan', type: 2, nombre: 'Deutan (verde)', descripcion: 'Deuteranomalía / deuteranopía. La más común.' },
  { id: 'tritan', type: 3, nombre: 'Tritan (azul)', descripcion: 'Tritanomalía / tritanopía. Caso raro.' }
];

window.DALTON_TYPE_NAMES = { 0: 'Visión normal', 1: 'Protan', 2: 'Deutan', 3: 'Tritan' };
