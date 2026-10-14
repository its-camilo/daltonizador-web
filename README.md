# Daltonizador GLSL — WebGL2 Fase A

Filtro de daltonismo en tiempo real. WebGL2 + GLSL ES 3.00 + JavaScript puro. Sin frameworks. Sin build. 100% local.

## Corrección del profesor

Versión anterior pedía Windows + C++ + OpenGL 4.6.
Versión actual usa web con JavaScript y GLSL 3.
Cada shader inicia con `#version 300 es`.
Host en `main.js` con WebGL2 directo.

## Estructura

- `index.html` — canvas + HUD accesible.
- `style.css` — texto grande, alto contraste.
- `main.js` — host: quad NDC, textura, FBO, loop `requestAnimationFrame`.
- `shaders/daltonizador.vert` — passthrough NDC, sin matrices.
- `shaders/daltonizador.frag` — `srgb2lin` exacta, LMS Bradford, proyectores Brettel 1997, severidad Machado 0-1, preserva Y, `lin2srgb` exacta.
- `diagram.js` — imagen de prueba por código. Gradientes, rampa gris, parches, par rojo-verde vulnerable 1.28:1, par azul-amarillo seguro, placas tipo Ishihara.
- `presets.js` — 3 presets fijos al 100%: protan, deutan, tritan.
- `vendor/ishihara-mtillmann/` — copia sin cambios de `@mtillmann/ishihara` v0.2.2 (MIT, Martin Tillmann). Empaqueta puntos dentro de la figura para las láminas de una cifra. Ver `LICENSE` del directorio.
- `ishihara.js` — test de 14 láminas generadas por código (aproximación educativa, no oficiales Kanehara). Figuras solo con puntos, sin relleno. Números grandes y de alto contraste. Números y trazos se dibujan con mouse o dedo: los dígitos se reconocen por plantillas y los trazos por cercanía a cada camino. Calcula tipo e intensidad y arma el preset propio.

## Uso

Opción doble clic (respaldo embebido):

- Abre `index.html` en Chrome, Brave o Safari.

Opción recomendada (usa .vert/.frag independientes):

```bash
cd daltonizador-web
python3 -m http.server 8000
# abre http://localhost:8000
```

Controles:

- Botón ON/OFF + tecla `F` local. Sin tecla global del SO.
- Test Ishihara con 14 láminas: dibuja con mouse o dedo el número que ves (se reconoce por plantillas) o el trazo que sigues en láminas 11 y 14. Sin omitir en primer uso. Al final arma tu preset (tipo + intensidad) y lo guarda en `localStorage`.
- Botón de shaders: popup con el vertex y fragment GLSL en uso, con copiar.
- 3 presets fijos al 100% para referencia rápida. Cada preset afecta toda la imagen. La vista dividida queda como opción manual.
- Modo 0 original / 1 simulación / 2 corrección.
- Tipo 0 normal / 1 protan / 2 deutan / 3 tritan.
- Severidad 0.0 a 1.0. Fórmula `Final = Identidad*(1-s) + Tipo*s`.
- Vista dividida: izquierda original, derecha filtrada.
- Cargar imagen PNG/JPEG local. Cargar video local para Fase B.
- Perfil se guarda en `localStorage`.

## Fases

- Fase A: imagen por código. Lista.
- Fase B: video local y cámara. Base lista con `fileVideo`.
- Fase C: juego web simple en canvas propio. Usa mismo `.frag` sin copiar lógica.

## Pipeline

1. Pasa 1 a FBO offscreen. Copia fuente para round-trip explícito.
2. Pasa 2 a pantalla. Lee FBO como `sampler2D`.
3. Quad pantalla completa en NDC -1 a 1.
4. `texture(uTexture, vTexCoord)` por fragmento.
5. Decodifica, convierte a LMS, aplica matriz, preserva Y, recodifica.

## Validación

- Placas Ishihara de control 14 oficiales Kanehara. Uso educativo.
- Contraste WCAG `(L1+0.05)/(L2+0.05)`. Meta 3:1 gráficos, 4.5:1 texto.
- Caso vulnerable rojo-verde 1.28:1 colapsa en deutan.
- Caso seguro azul-amarillo resiste.

## Referencias

- Visual Computing Notebook: color, pipeline, archetypes, render to texture, color ops, ping-pong.
- Propuesta Proyecto 1: Daltonizador GLSL.
- Ishihara Instructions 14 plates, Kanehara.
- Brettel, Vienot, Mollon 1997.
- Machado, Oliveira, Fernandes 2009.
- W3C WCAG 2.1.
