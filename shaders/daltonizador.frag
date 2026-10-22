#version 300 es
// daltonizador.frag
// Simulacion de daltonismo en tiempo real. WebGL2 + GLSL ES 3.00.
// Modelo: Machado, Oliveira, Fernandes 2009 (mismo que Chrome DevTools).
// La matriz uSim (tipo + severidad, interpolada) se calcula en JS (machado.js)
// y llega como un solo uniform: el shader no tiene ramas por tipo ni modo.
// Pipeline: sRGB -> lineal (exacta) -> uSim * rgb -> clamp -> sRGB (exacta).
// Referencias:
// - NotebookLM Visual: Shading color ops, srgb2lin exacto.
// - Machado, Oliveira, Fernandes 2009, IEEE TVCG 15(6).
// - IEC 61966-2-1 (sRGB).
precision highp float;

in vec2 vTexCoord;
uniform sampler2D uTexture;
uniform mat3 uSim;      // RGB lineal -> RGB lineal simulado. Identidad = sin filtro.
out vec4 outColor;

// sRGB a lineal. Funcion piecewise exacta. No usa gamma 2.2.
vec3 srgb2lin(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

// Lineal a sRGB. Funcion piecewise exacta.
vec3 lin2srgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec4 src = texture(uTexture, vTexCoord);
  vec3 lin = srgb2lin(src.rgb);
  vec3 sim = clamp(uSim * lin, 0.0, 1.0);
  outColor = vec4(lin2srgb(sim), 1.0);
}
