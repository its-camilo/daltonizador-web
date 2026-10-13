#version 300 es
// daltonizador.frag
// Simulacion y correccion de daltonismo en tiempo real.
// Stack: WebGL2 + GLSL ES 3.00. Host: JavaScript puro.
// Referencias:
// - NotebookLM Visual: Shading color ops, srgb2lin exacto.
// - Brettel, Vienot, Mollon 1997: proyeccion en LMS para dicro matas.
// - Machado, Oliveira, Fernandes 2009: modelo por severidad 0-1.
// - W3C WCAG 2.1: luminancia Y y contraste.
precision highp float;

in vec2 vTexCoord;
uniform sampler2D uTexture;
uniform int uMode;      // 0 = original, 1 = simulacion, 2 = correccion
uniform int uType;      // 0 = normal, 1 = protan, 2 = deutan, 3 = tritan
uniform float uSeverity;// 0.0 a 1.0
uniform float uSplit;   // 0.0 = off, 1.0 = vista dividida
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

// Luminancia relativa WCAG. Opera en lineal.
float luminanceY(vec3 lin) {
  return 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
}

// RGB lineal a LMS. Matriz Bradford (Von Kries, D65).
// Columnas en orden R, G, B por regla column-major de GLSL.
const mat3 RGB2LMS = mat3(
  0.8951, -0.7502, 0.0389,
  0.2664, 1.7135, -0.0685,
  -0.1614, 0.0367, 1.0296
);

// LMS a RGB lineal. Inversa Bradford.
const mat3 LMS2RGB = mat3(
  0.986992, 0.432305, -0.008528,
  -0.147054, 0.518360, 0.040042,
  0.159962, 0.049291, 0.968486
);

// Proyectores Brettel 1997 en LMS. Cada fila proyecta al plano de confusion.
mat3 projectorForType(int t) {
  if (t == 1) {
    // Protanopia. Eje L colapsa.
    return mat3(0.0, 0.0, 0.0, 2.02344, 1.0, 0.0, -2.52581, 0.0, 1.0);
  } else if (t == 2) {
    // Deuteranopia. Eje M colapsa.
    return mat3(1.0, 0.494207, 0.0, 0.0, 0.0, 0.0, 0.0, 1.24827, 1.0);
  } else if (t == 3) {
    // Tritanopia. Eje S colapsa.
    return mat3(1.0, 0.0, -0.395913, 0.0, 1.0, 0.801109, 0.0, 0.0, 0.0);
  }
  return mat3(1.0);
}

void main() {
  vec3 srgb = texture(uTexture, vTexCoord).rgb;
  vec3 lin = srgb2lin(srgb);
  vec3 lms = RGB2LMS * lin;

  // Simula perdida total y luego interpola por severidad.
  // Formula RF-06: Final = Identidad x (1-s) + Tipo x s.
  // Equivale a mix() en LMS, modelo Machado por severidad.
  mat3 P = projectorForType(uType);
  vec3 lmsSimFull = (uType == 0) ? lms : P * lms;
  vec3 lmsMix = mix(lms, lmsSimFull, clamp(uSeverity, 0.0, 1.0));
  vec3 rgbSimLin = LMS2RGB * lmsMix;
  rgbSimLin = clamp(rgbSimLin, 0.0, 1.0);

  // Correccion por desplazamiento de error. Mueve informacion
  // perdida al canal visible y preserva luminancia Y.
  vec3 err = lin - rgbSimLin;
  vec3 corr = lin;
  float s = clamp(uSeverity, 0.0, 1.0);
  if (uType == 1) {
    corr.g += err.r * 0.30 * s;
    corr.b += err.r * 0.70 * s;
  } else if (uType == 2) {
    corr.r += err.g * 0.30 * s;
    corr.b += err.g * 0.70 * s;
  } else if (uType == 3) {
    corr.r += err.b * 0.50 * s;
    corr.g += err.b * 0.30 * s;
  }
  float yOrig = luminanceY(lin);
  float yCorr = luminanceY(corr);
  corr += (yOrig - yCorr);
  corr = clamp(corr, 0.0, 1.0);

  vec3 result;
  if (uMode == 1) {
    result = lin2srgb(rgbSimLin);
  } else if (uMode == 2) {
    result = (uType == 0) ? srgb : lin2srgb(corr);
  } else {
    result = srgb;
  }

  // Vista dividida. Izquierda original, derecha filtrada.
  if (uSplit > 0.5 && vTexCoord.x < 0.5) {
    result = srgb;
  }

  outColor = vec4(result, 1.0);
}
