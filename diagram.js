/* diagram.js
 * Genera imagen de prueba por codigo. Sin archivos externos.
 * Dibuja tarjeta de prueba para color ops y daltonismo.
 * Incluye: gradientes, rampa gris, parches, par rojo-verde
 * vulnerable 1.28:1, par azul-amarillo seguro, placas tipo Ishihara.
 * Uso: const canvas = window.makeTestDiagram(1024, 640);
 */
(function () {
  'use strict';

  function rand(seedObj) {
    // Generador simple determinista para placas estables.
    seedObj.s = (seedObj.s * 1664525 + 1013904223) >>> 0;
    return seedObj.s / 4294967296;
  }

  function drawGradient(ctx, x, y, w, h, c0, c1) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  function drawIshiharaPlate(ctx, cx, cy, r, number, seed, fg, bg) {
    const seedObj = { s: seed };
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = bg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // Puntos de fondo.
    for (let i = 0; i < 900; i++) {
      const a = rand(seedObj) * Math.PI * 2;
      const d = Math.sqrt(rand(seedObj)) * (r - 6);
      const px = cx + Math.cos(a) * d;
      const py = cy + Math.sin(a) * d;
      const pr = 2 + rand(seedObj) * 5;
      ctx.fillStyle = rand(seedObj) > 0.5 ? bg : 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    // Numero con puntos de contraste.
    ctx.fillStyle = fg;
    ctx.font = 'bold ' + Math.floor(r * 1.1) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), cx, cy + 2);
    // Puntos sobre numero para textura Ishihara.
    for (let i = 0; i < 220; i++) {
      const px = cx - r * 0.5 + rand(seedObj) * r;
      const py = cy - r * 0.5 + rand(seedObj) * r;
      ctx.fillStyle = fg;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(px, py, 2 + rand(seedObj) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();
    // Borde.
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  window.makeTestDiagram = function (W, H) {
    W = W || 1024;
    H = H || 640;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Fondo.
    ctx.fillStyle = '#1a1d21';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Daltonizador GLSL — Tarjeta de prueba Fase A', 24, 40);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#c8cdd2';
    ctx.fillText('Diagrama por codigo. Gradientes, grises, pares WCAG y placas tipo Ishihara.', 24, 62);

    // Gradientes que delatan matematica en espacio errado.
    drawGradient(ctx, 24, 84, (W - 48) / 2 - 8, 54, '#ff0000', '#00ff00');
    drawGradient(ctx, 24 + (W - 48) / 2 + 8, 84, (W - 48) / 2 - 8, 54, '#0066ff', '#ffcc00');
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText('Rojo a verde (eje vulnerable)', 24, 152);
    ctx.fillText('Azul a amarillo (eje seguro)', 24 + (W - 48) / 2 + 8, 152);

    // Rampa gris para lectura de exposicion.
    const gx = 24, gy = 164, gw = W - 48, gh = 34;
    for (let i = 0; i < 16; i++) {
      const v = Math.floor((i / 15) * 255);
      ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
      ctx.fillRect(gx + (gw / 16) * i, gy, gw / 16 + 1, gh);
    }
    ctx.fillStyle = '#fff';
    ctx.fillText('Rampa gris. Verifica luminancia Y sin cambio de tono.', 24, 212);

    // Parches saturados.
    const patches = ['#ff0000', '#00c853', '#0066ff', '#ffcc00', '#ff00ff', '#00cccc', '#ffffff', '#000000'];
    const pw = (W - 48 - 7 * 8) / 8;
    patches.forEach(function (c, i) {
      ctx.fillStyle = c;
      ctx.fillRect(24 + i * (pw + 8), 224, pw, 56);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(24 + i * (pw + 8), 224, pw, 56);
    });
    ctx.fillStyle = '#fff';
    ctx.fillText('Parches saturados. Handles perceptuales en display space.', 24, 294);

    // Par vulnerable rojo / verde.
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(24, 306, (W - 48) / 2 - 8, 72);
    ctx.fillStyle = '#00c853';
    ctx.fillRect(24 + (W - 48) / 2 + 8, 306, (W - 48) / 2 - 8, 72);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('ERROR', 44, 334);
    ctx.fillText('1.28:1 vulnerable', 44, 358);
    ctx.fillStyle = '#111';
    ctx.fillText('EXITO', 24 + (W - 48) / 2 + 28, 334);
    ctx.fillText('Usa icono + texto', 24 + (W - 48) / 2 + 28, 358);
    // Iconos de doble codificacion.
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('X', W / 2 - 44, 350);
    ctx.fillStyle = '#111';
    ctx.fillText('✓', W - 70, 350);

    // Placas tipo Ishihara.
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText('Placas tipo Ishihara. Trazo en 11 y 14 estima intensidad.', 24, 402);
    drawIshiharaPlate(ctx, 110, 500, 78, '12', 11, '#c96a2b', '#7fae6e');
    drawIshiharaPlate(ctx, 300, 500, 78, '8', 22, '#b55242', '#8fae7a');
    drawIshiharaPlate(ctx, 490, 500, 78, '29', 33, '#a85a3a', '#93b06a');
    drawIshiharaPlate(ctx, 680, 500, 78, '74', 44, '#b06a35', '#7fae8a');
    // Placa azul-amarilla para tritan.
    drawIshiharaPlate(ctx, 870, 500, 78, '6', 55, '#2b6cb0', '#e8d44d');

    ctx.fillStyle = '#9aa0a6';
    ctx.font = '12px sans-serif';
    ctx.fillText('Fondos rojo-verde colapsan en protan/deutan. Azul-amarillo resiste.', 24, H - 16);
    return canvas;
  };
})();
