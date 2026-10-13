/* presets.js
 * Presets de configuracion e intensidad para probar rapido.
 * mode: 0 original, 1 simulacion, 2 correccion.
 * type: 0 normal, 1 protan, 2 deutan, 3 tritan.
 * severity: 0.0 a 1.0. split: false o true.
 */
window.DALTON_PRESETS = [
  { id: 'original', nombre: 'Original sin filtro', descripcion: 'Referencia sin cambios.', mode: 0, type: 0, severity: 0, split: false },
  { id: 'sim-protan-leve', nombre: 'Sim protan leve 0.30', descripcion: 'Protanomalia leve. Prueba inicial.', mode: 1, type: 1, severity: 0.3, split: false },
  { id: 'sim-protan-media', nombre: 'Sim protan media 0.60', descripcion: 'Protanomalia media.', mode: 1, type: 1, severity: 0.6, split: false },
  { id: 'sim-protan-fuerte', nombre: 'Sim protan fuerte 1.00', descripcion: 'Protanopia total.', mode: 1, type: 1, severity: 1.0, split: false },
  { id: 'sim-deutan-leve', nombre: 'Sim deutan leve 0.30', descripcion: 'Deuteranomalia leve, la mas comun.', mode: 1, type: 2, severity: 0.3, split: false },
  { id: 'sim-deutan-media', nombre: 'Sim deutan media 0.60', descripcion: 'Caso intermedio rojo-verde.', mode: 1, type: 2, severity: 0.6, split: false },
  { id: 'sim-deutan-fuerte', nombre: 'Sim deutan fuerte 1.00', descripcion: 'Deuteranopia total. Colapsa par 1.28:1.', mode: 1, type: 2, severity: 1.0, split: false },
  { id: 'sim-tritan-media', nombre: 'Sim tritan media 0.60', descripcion: 'Tritanomalia media eje azul-amarillo.', mode: 1, type: 3, severity: 0.6, split: false },
  { id: 'sim-tritan-fuerte', nombre: 'Sim tritan fuerte 1.00', descripcion: 'Tritanopia total, caso raro.', mode: 1, type: 3, severity: 1.0, split: false },
  { id: 'corr-protan', nombre: 'Corr protan 0.80', descripcion: 'Correccion protan con Y preservada.', mode: 2, type: 1, severity: 0.8, split: false },
  { id: 'corr-deutan', nombre: 'Corr deutan 0.80', descripcion: 'Correccion deutan recomendada para demo.', mode: 2, type: 2, severity: 0.8, split: false },
  { id: 'corr-tritan', nombre: 'Corr tritan 0.70', descripcion: 'Correccion tritan.', mode: 2, type: 3, severity: 0.7, split: false },
  { id: 'split-deutan', nombre: 'Split deutan 0.80', descripcion: 'Izquierda original, derecha filtrada.', mode: 1, type: 2, severity: 0.8, split: true },
  { id: 'split-corr', nombre: 'Split corr deutan 0.80', descripcion: 'Compara correccion contra original.', mode: 2, type: 2, severity: 0.8, split: true },
  { id: 'wcag-vulnerable', nombre: 'WCAG par vulnerable', descripcion: 'Evidencia colapso rojo-verde en simulacion.', mode: 1, type: 2, severity: 1.0, split: true },
  { id: 'wcag-seguro', nombre: 'WCAG par seguro', descripcion: 'Azul-amarillo sigue distinguible en deutan.', mode: 1, type: 2, severity: 1.0, split: false }
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
