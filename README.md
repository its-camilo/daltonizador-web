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
- `shaders/daltonizador.frag` — `srgb2lin` exacta, `uniform mat3 uSim` (Machado 2009) sobre RGB lineal, `lin2srgb` exacta. Sin ramas por tipo ni modo.
- `machado.js` — 33 matrices de Machado, Oliveira y Fernandes 2009 (protan, deutan, tritan; severidad 0.0-1.0 en pasos de 0.1). Interpola entre vecinas y entrega la matriz column-major para `uniformMatrix3fv`. Mismo modelo que Chrome DevTools.
- `diagram.js` — imagen de prueba por código. Gradientes, rampa gris, parches, par rojo-verde vulnerable 1.28:1, par azul-amarillo seguro, placas tipo Ishihara.
- `presets.js` — presets de tipo: Visión normal, Protan, Deutan, Tritan. La intensidad es independiente y se conserva al cambiar de preset.
- `digits-q.js` — reconoce los números dibujados con el reconocedor $Q (nube de puntos, multitrazo, invariante a orden y dirección). Separa números de dos cifras por hueco horizontal.
- `vendor/qdollar/` — $Q Super-Quick Recognizer, versión JavaScript oficial (New BSD, Vatavu, Anthony, Wobbrock; port de N. Magrofuoco), envuelto en un IIFE sin cambios.
- `tools/check-matrices.js` y `tools/check-digits.js` — verificaciones con `node`: blanco/grises conservados, colapso del par rojo-verde, precisión del reconocedor con trazos sintéticos.
- `vendor/ishihara-mtillmann/` — copia sin cambios de `@mtillmann/ishihara` v0.2.2 (MIT, Martin Tillmann). Empaqueta puntos dentro de la figura para las láminas de una cifra. Ver `LICENSE` del directorio.
- `ishihara.js` — test de 14 láminas generadas por código (aproximación educativa, no oficiales Kanehara). Figuras solo con puntos, sin relleno. Números grandes y de alto contraste. Números y trazos se dibujan con mouse o dedo: los dígitos se reconocen con $Q y los trazos por cercanía a cada camino. Calcula tipo e intensidad y arma el preset propio.

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
- Modo único: simulación (Machado 2009). La corrección pasa al ítem 3 del trabajo a futuro.
- Preset = tipo de visión: Visión normal, Protan, Deutan, Tritan. Sin opción "Elige preset".
- Intensidad 0.0 a 1.0 independiente del preset: con intensidad 0 el preset se mantiene (la imagen se ve sin filtro). Con Visión normal el slider se desactiva.
- Al terminar el test, "Usar mi resultado" deja Visión normal o Protan/Deutan/Tritan con la intensidad calculada.
- HUD con fps y tiempo de GPU por frame (si el navegador expone `EXT_disjoint_timer_query_webgl2`).
- Cargar imagen PNG/JPEG local. Cargar video local para Fase B.
- Perfil se guarda en `localStorage` con esquema versionado (`v: 2`); datos corruptos se descartan.

## Fases

- Fase A: imagen por código. Lista.
- Fase B: video local y cámara. Base lista con `fileVideo`.
- Fase C: juego web simple en canvas propio. Usa mismo `.frag` sin copiar lógica.

## Pipeline

1. Pasa 1 a FBO offscreen. Copia fuente para round-trip explícito.
2. Pasa 2 a pantalla. Lee FBO como `sampler2D`.
3. Quad pantalla completa en NDC -1 a 1.
4. `texture(uTexture, vTexCoord)` por fragmento.
5. Decodifica a lineal, aplica `uSim` (Machado), recorta a [0,1], recodifica a sRGB.

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
- Machado, Oliveira, Fernandes 2009. https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
- Vatavu, Anthony, Wobbrock 2018. $Q Super-Quick Recognizer. https://depts.washington.edu/acelab/proj/dollar/qdollar.html
- W3C WCAG 2.1.
