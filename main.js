/* main.js
 * Host JavaScript puro. Sin frameworks. WebGL2 directo.
 * Capas: init, compila shaders, quad NDC, textura, FBO, HUD, loop.
 * Referencia: NotebookLM Visual - host programming model,
 * texture mapping, render to texture, color ops.
 */
(function () {
  'use strict';

  const FALLBACK_VERT = `#version 300 es
layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aTexCoord;
out vec2 vTexCoord;
void main() { vTexCoord = aTexCoord; gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

  // Respaldo file://. Copia exacta de shaders/daltonizador.frag.
  // Fuente de verdad: shaders/daltonizador.frag. Si editas el .frag, copia aqui.
  const FALLBACK_FRAG = `#version 300 es
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
`;

  const $ = (id) => document.getElementById(id);
  let gl = null, prog = null, vao = null;
  let tex = null, fbo = null, fboTex = null;
  let srcCanvas = null, videoEl = null, useVideo = false;
  let loc = {};
  // Modo unico: simulacion. El preset es el tipo; la intensidad es independiente.
  let state = { type: 2, severity: 0.8, on: true };
  const PROFILE_KEY = 'dalton.perfil';
  const PROFILE_VERSION = 2;
  let gpu = { ext: null, query: null, pending: false, ms: null, frame: 0 };
  let vsSrcUsed = '', fsSrcUsed = '';
  let frames = 0, lastT = performance.now(), fps = 0;

  function log(msg) {
    const el = $('log');
    if (el) el.textContent = msg;
    console.log('[daltonizador]', msg);
  }

  async function loadText(path, fallback) {
    try {
      const r = await fetch(path);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } catch (e) {
      console.warn('Uso fallback embebido para', path, e);
      return fallback;
    }
  }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  function initQuad() {
    // Quad 2x2 en NDC. Posicion XY + UV. Sin matrices.
    const data = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
      -1,  1, 0, 1,
       1,  1, 1, 1
    ]);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.bindVertexArray(null);
  }

  function makeTexture() {
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  function uploadCanvas(c) {
    // Canvas2D tiene origen arriba-izquierda. WebGL espera
    // origen abajo-izquierda. FLIP_Y corrige el arriba-para-abajo.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  }

  function makeFBO(w, h) {
    if (fboTex) gl.deleteTexture(fboTex);
    if (fbo) gl.deleteFramebuffer(fbo);
    fboTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) throw new Error('FBO incompleto');
  }

  function resize() {
    const canvas = $('gl');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(canvas.clientWidth * dpr) || 1024;
    const h = Math.floor(canvas.clientHeight * dpr) || 640;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      makeFBO(w, h);
    }
    $('res').textContent = canvas.width + 'x' + canvas.height;
  }

  const IDENTITY_CM = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  let simCache = { key: '', m: IDENTITY_CM };

  // Matriz Machado para el estado actual (column-major). Cache por tipo+severidad.
  function currentSimMatrix() {
    if (!state.on || state.type === 0) return IDENTITY_CM;
    const key = state.type + ':' + state.severity;
    if (simCache.key !== key) {
      const M = window.DALTON_MACHADO;
      simCache = { key: key, m: M.toColumnMajor(M.simMatrix(state.type, state.severity)) };
    }
    return simCache.m;
  }

  // Tiempo de GPU por frame (ambas pasadas) con EXT_disjoint_timer_query_webgl2.
  // Solo si el navegador lo expone (Chrome de escritorio suele hacerlo).
  function gpuBegin() {
    if (!gpu.ext || gpu.pending) return false;
    if (gpu.frame++ % 30 !== 0) return false;
    gpu.query = gl.createQuery();
    gl.beginQuery(gpu.ext.TIME_ELAPSED_EXT, gpu.query);
    return true;
  }

  function gpuEnd(started) {
    if (started) { gl.endQuery(gpu.ext.TIME_ELAPSED_EXT); gpu.pending = true; }
    if (!gpu.pending) return;
    const ready = gl.getQueryParameter(gpu.query, gl.QUERY_RESULT_AVAILABLE);
    const disjoint = gl.getParameter(gpu.ext.GPU_DISJOINT_EXT);
    if (ready || disjoint) {
      if (ready && !disjoint) gpu.ms = gl.getQueryParameter(gpu.query, gl.QUERY_RESULT) / 1e6;
      gl.deleteQuery(gpu.query);
      gpu.query = null;
      gpu.pending = false;
    }
  }

  function draw() {
    resize();
    const canvas = $('gl');
    // Pasa 1: offscreen. Copia fuente al FBO para round-trip explicito.
    // Dibuja quad con textura fuente hacia fboTex.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc.uTexture, 0);
    // En pasa 1 fuerza identidad para no contaminar.
    gl.uniformMatrix3fv(loc.uSim, false, IDENTITY_CM);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Pasa 2: a pantalla con filtro. Lee fboTex como sampler.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.uniform1i(loc.uTexture, 0);
    gl.uniformMatrix3fv(loc.uSim, false, currentSimMatrix());
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  function loop() {
    if (useVideo && videoEl && !videoEl.paused && videoEl.readyState >= 2) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoEl);
    }
    const g = gpuBegin();
    draw();
    gpuEnd(g);
    frames++;
    const now = performance.now();
    if (now - lastT >= 500) {
      fps = Math.round((frames * 1000) / (now - lastT));
      frames = 0;
      lastT = now;
      $('fps').textContent = fps + ' fps' + (gpu.ms != null ? ' · GPU ' + gpu.ms.toFixed(2) + ' ms' : '');
    }
    requestAnimationFrame(loop);
  }

  function saveProfile() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ v: PROFILE_VERSION, type: state.type, severity: state.severity }));
    } catch (e) { /* modo privado */ }
  }

  // Valida el perfil guardado. Acepta v2 y migra v1 (type + severity).
  // Datos corruptos o fuera de rango se descartan. Devuelve true si habia perfil valido.
  function loadProfile() {
    try {
      localStorage.removeItem('dalton.ui'); // esquema v1: el modo ya no se guarda
      const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      const okType = p && Number.isInteger(p.type) && p.type >= 0 && p.type <= 3;
      const okSev = p && typeof p.severity === 'number' && isFinite(p.severity) && p.severity >= 0 && p.severity <= 1;
      if (!okType || !okSev) {
        if (p !== null) localStorage.removeItem(PROFILE_KEY);
        return false;
      }
      state.type = p.type;
      state.severity = p.severity;
      if (p.v !== PROFILE_VERSION) saveProfile();
      return true;
    } catch (e) {
      try { localStorage.removeItem(PROFILE_KEY); } catch (e2) { /* ignora */ }
      return false;
    }
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 2000);
  }

  function syncUI() {
    const names = window.DALTON_TYPE_NAMES;
    const normal = state.type === 0;
    // El preset refleja solo el tipo: con intensidad 0 sigue en el mismo preset.
    const p = (window.DALTON_PRESETS || []).find((x) => x.type === state.type);
    if (p) $('preset').value = p.id;
    $('severity').value = String(state.severity);
    $('severity').disabled = normal;
    document.querySelectorAll('[data-sev]').forEach((b) => { b.disabled = normal; });
    $('sevVal').textContent = normal ? '—' : Number(state.severity).toFixed(2);
    $('btnOn').textContent = state.on ? 'Filtro: ON' : 'Filtro: OFF';
    $('hudState').textContent = !state.on ? 'Filtro OFF · original'
      : normal ? 'Visión normal'
      : 'Simulación · ' + names[state.type] + ' ' + Number(state.severity).toFixed(2);
  }

  // Cambia solo el tipo. La intensidad del slider se conserva.
  function applyPreset(id) {
    const p = (window.DALTON_PRESETS || []).find((x) => x.id === id);
    if (!p) return;
    state.type = p.type;
    state.on = true;
    saveProfile();
    syncUI();
    toast(p.type === 0 ? p.nombre : p.nombre + ' ' + Number(state.severity).toFixed(2));
    log('Preset aplicado: ' + p.id + '. ' + p.descripcion);
  }

  function bindUI() {
    const presets = window.DALTON_PRESETS || [];
    const sel = $('preset');
    sel.innerHTML = '';
    presets.forEach((p) => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.nombre;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => applyPreset(sel.value));

    $('severity').addEventListener('input', (e) => { state.severity = +e.target.value; saveProfile(); syncUI(); });
    $('btnOn').addEventListener('click', () => {
      state.on = !state.on;
      syncUI();
      toast(state.on ? 'Filtro ON' : 'Filtro OFF');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') {
        state.on = !state.on;
        syncUI();
        toast(state.on ? 'Filtro ON' : 'Filtro OFF');
      }
    });
    $('btnDiagram').addEventListener('click', () => {
      useVideo = false;
      srcCanvas = window.makeTestDiagram(1024, 640);
      uploadCanvas(srcCanvas);
      toast('Diagrama por codigo');
    });
    $('btnTest').addEventListener('click', openTest);
    $('btnShaders').addEventListener('click', openShaders);
    $('shClose').addEventListener('click', () => { $('shOverlay').hidden = true; });
    $('shCopyVert').addEventListener('click', () => copyShader(vsSrcUsed, 'Vertex copiado'));
    $('shCopyFrag').addEventListener('click', () => copyShader(fsSrcUsed, 'Fragment copiado'));
    $('testBack').addEventListener('click', () => {
      if (currentPlate() && currentPlate().kind === 'trace') Test.saved[Test.idx] = Test.strokes;
      if (Test.idx > 0) { Test.idx--; renderTestStep(); }
    });
    $('testNext').addEventListener('click', testNext);
    $('testClose').addEventListener('click', closeTest);
    // Dibujo con mouse o tacto sobre laminas de trazo.
    const tc = $('testCanvas');
    tc.addEventListener('pointerdown', (e) => {
      if (!Test.open || !currentPlate()) return;
      const k = currentPlate().kind;
      if (k !== 'trace' && k !== 'num' && k !== 'num2') return;
      e.preventDefault();
      try { tc.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ }
      if (k !== 'trace') Test.answers[Test.idx] = ''; // dibujar anula el noveo
      Test.cur = [toTestCoords(e)];
      Test.strokes.push(Test.cur);
    });
    tc.addEventListener('pointermove', (e) => {
      if (!Test.cur) return;
      e.preventDefault();
      const p = toTestCoords(e);
      const last = Test.cur[Test.cur.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 2) return;
      Test.cur.push(p);
      // Trazo incremental sin redibujar la lamina.
      const x = tc.getContext('2d');
      x.save();
      x.lineWidth = Math.max(4, tc.width * 0.014);
      x.lineCap = 'round';
      x.lineJoin = 'round';
      x.strokeStyle = '#ffeb3b';
      x.shadowColor = '#000';
      x.shadowBlur = 6;
      x.beginPath();
      x.moveTo(last[0], last[1]);
      x.lineTo(p[0], p[1]);
      x.stroke();
      x.restore();
    });
    const endTrace = () => {
      if (Test.cur) {
        Test.saved[Test.idx] = Test.strokes;
        Test.cur = null;
        updateStrokeCount();
      }
    };
    tc.addEventListener('pointerup', endTrace);
    tc.addEventListener('pointercancel', endTrace);
    $('fileImg').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        useVideo = false;
        uploadCanvas(c);
        URL.revokeObjectURL(img.src);
        toast('Imagen cargada');
      };
      img.src = URL.createObjectURL(f);
    });
    $('fileVideo').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      videoEl.src = URL.createObjectURL(f);
      videoEl.play().then(() => { useVideo = true; toast('Video en vivo'); });
    });
  }

  // ---- Test Ishihara: arma el preset propio ----
  const Test = { open: false, idx: 0, answers: new Array(14).fill(''), done: null, strokes: [], cur: null, saved: {}, t0: 0 };
  let testClock = null;

  function testCanvas() { return $('testCanvas'); }

  function toTestCoords(e) {
    const tc = testCanvas();
    const r = tc.getBoundingClientRect();
    return [(e.clientX - r.left) * tc.width / r.width, (e.clientY - r.top) * tc.height / r.height];
  }

  function drawUserStrokes() {
    const tc = testCanvas();
    const x = tc.getContext('2d');
    x.save();
    x.lineWidth = Math.max(4, tc.width * 0.014);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.strokeStyle = '#ffeb3b';
    x.shadowColor = '#000';
    x.shadowBlur = 6;
    Test.strokes.forEach(function (st) {
      if (st.length === 1) {
        x.fillStyle = '#ffeb3b';
        x.beginPath();
        x.arc(st[0][0], st[0][1], x.lineWidth / 2, 0, Math.PI * 2);
        x.fill();
        return;
      }
      x.beginPath();
      x.moveTo(st[0][0], st[0][1]);
      for (let i = 1; i < st.length; i++) x.lineTo(st[i][0], st[i][1]);
      x.stroke();
    });
    x.restore();
  }

  // Dibuja la lamina actual (libreria o renderer propio) y luego los trazos.
  // El token evita que una lamina vieja pise la nueva si el usuario avanza rapido.
  function paintPlate(p, after) {
    const token = Test.idx;
    window.drawIshiharaTestPlateAsync(testCanvas(), p).then(function () {
      if (Test.open && Test.idx === token) after();
    });
  }

  function redrawTestPlate() {
    paintPlate(currentPlate(), function () {
      drawUserStrokes();
      updateStrokeCount();
    });
    updateStrokeCount();
  }

  function updateStrokeCount() {
    const el = $('testStrokeCount');
    if (el) el.textContent = 'Trazos dibujados: ' + Test.strokes.length + '. Puedes hacer varios trazos.';
  }

  function startClock() {
    stopClock();
    Test.t0 = performance.now();
    const el = $('testTimer');
    testClock = setInterval(() => {
      const s = (performance.now() - Test.t0) / 1000;
      el.textContent = '⏱ ' + s.toFixed(1) + 's';
      el.style.background = s > 3 ? '#a02020' : '';
    }, 200);
  }

  function stopClock() {
    if (testClock) { clearInterval(testClock); testClock = null; }
  }

  function openTest() {
    Test.open = true;
    Test.idx = 0;
    Test.answers = new Array(14).fill('');
    Test.done = null;
    Test.saved = {};
    $('testOverlay').hidden = false;
    $('testResult').hidden = true;
    renderTestStep();
  }

  function closeTest() {
    Test.open = false;
    Test.cur = null;
    stopClock();
    $('testOverlay').hidden = true;
  }

  function currentPlate() { return window.ISHIHARA_PLATES[Test.idx]; }

  function renderTestStep() {
    const p = currentPlate();
    $('testStep').textContent = (Test.idx + 1) + '/14';
    $('testResult').hidden = true;
    Test.strokes = Test.saved[Test.idx] || [];
    Test.cur = null;
    paintPlate(p, function () { drawUserStrokes(); updateStrokeCount(); });
    testCanvas().style.cursor = (p.kind === 'trace') ? 'crosshair' : 'default';
    startClock();
    $('testNote').textContent = 'Lamina ' + p.id + ' de 14. ' + p.note +
      (p.kind === 'trace' ? ' Dibuja sobre la lamina la linea que logras seguir.' : '');
    const q = $('testQ');
    q.innerHTML = '';
    if (p.kind === 'trace') {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'Usa el mouse o el dedo. Dibuja cada linea que veas. La calificacion compara tu trazo con cada camino.';
      q.appendChild(hint);
    } else {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'Dibuja con el mouse o el dedo el numero que ves. Sin escribir con teclado.';
      q.appendChild(hint);
    }
    const cnt = document.createElement('p');
    cnt.className = 'hint';
    cnt.id = 'testStrokeCount';
    q.appendChild(cnt);
    updateStrokeCount();
    const b = document.createElement('button');
    b.className = 'opt';
    if (p.kind === 'trace') {
      b.textContent = 'Borrar trazos';
      b.addEventListener('click', () => { Test.strokes = []; Test.cur = null; Test.saved[Test.idx] = []; redrawTestPlate(); });
    } else {
      b.textContent = 'No veo ningun numero';
      b.addEventListener('click', () => {
        Test.answers[Test.idx] = 'noveo';
        Test.strokes = [];
        Test.cur = null;
        Test.saved[Test.idx] = [];
        redrawTestPlate();
        toast('Registrado: no ve numero');
      });
    }
    q.appendChild(b);
    $('testBack').disabled = Test.idx === 0;
    $('testNext').textContent = (Test.idx === 13) ? 'Ver resultado →' : 'Siguiente →';
  }

  function testNext() {
    const p = currentPlate();
    let a = Test.answers[Test.idx];
    if (p.kind !== 'trace') {
      const tc = testCanvas();
      const hasDrawing = Test.strokes.some(function (st) { return st.length >= 4; });
      if (hasDrawing) {
        const rec = window.scoreDrawnNumber(p.id, Test.strokes, tc.width);
        if (rec === null) { toast('Dibuja el numero o pulsa No veo numero'); return; }
        Test.saved[Test.idx] = Test.strokes;
        a = rec; // candidato reconocido o noveo por baja coincidencia
        toast(a === 'noveo' ? 'No se reconoce: cuenta como no visto' : 'Leido: ' + a);
      } else if (a === 'noveo') {
        Test.saved[Test.idx] = [];
      } else { toast('Dibuja el numero o pulsa No veo numero'); return; }
      Test.answers[Test.idx] = a;
    } else {
      const tc = testCanvas();
      const res = window.scoreTrace(p.id, Test.strokes, tc.width);
      if (res === null) { toast('Dibuja el trazo primero'); return; }
      Test.saved[Test.idx] = Test.strokes;
      a = res;
      Test.answers[Test.idx] = a;
    }
    if (Test.idx < 13) { Test.idx++; renderTestStep(); }
    else finishTest();
  }

  function finishTest() {
    stopClock();
    Test.done = window.scoreIshihara(Test.answers);
    const r = Test.done;
    const box = $('testResult');
    box.hidden = false;
    box.innerHTML = '';
    const big = document.createElement('div');
    big.className = 'big';
    big.textContent = 'Resultado: ' + r.label + ' · ' + r.severity.toFixed(2);
    box.appendChild(big);
    [['Detalle', r.detail], ['Nota', r.note]].forEach(function (pair) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = pair[0] + ': ' + pair[1];
      box.appendChild(p);
    });
    const row = document.createElement('div');
    row.className = 'row';
    const bUse = document.createElement('button');
    bUse.className = 'primary';
    bUse.textContent = r.type === 0 ? 'Usar mi resultado (Visión normal)'
      : 'Usar mi resultado (' + window.DALTON_TYPE_NAMES[r.type] + ' ' + r.severity.toFixed(2) + ')';
    bUse.addEventListener('click', () => {
      state.type = r.type;
      if (r.type !== 0) state.severity = r.severity;
      state.on = true;
      saveProfile(); syncUI(); closeTest();
      toast(r.type === 0 ? 'Visión normal' : 'Preset: ' + window.DALTON_TYPE_NAMES[r.type] + ' ' + r.severity.toFixed(2));
    });
    row.appendChild(bUse);
    box.appendChild(row);
    box.scrollIntoView({ block: 'nearest' });
  }

  // ---- Visor de shaders actuales ----
  function openShaders() {
    $('shVert').textContent = vsSrcUsed || '// sin cargar aun';
    $('shFrag').textContent = fsSrcUsed || '// sin cargar aun';
    $('shOverlay').hidden = false;
  }

  function copyShader(src, msg) {
    if (!src) { toast('Nada para copiar'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(src).then(() => toast(msg), () => toast('No se pudo copiar'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = src;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast(msg); }
      catch (e) { toast('No se pudo copiar'); }
      document.body.removeChild(ta);
    }
  }

  async function boot() {
    const canvas = $('gl');
    gl = canvas.getContext('webgl2', { antialias: false });
    if (!gl) {
      log('WebGL2 no disponible. Usa Chrome, Brave o Safari reciente.');
      return;
    }
    const hadProfile = loadProfile();
    // UNPACK_FLIP_Y global. Corrige orientacion de Canvas2D y video.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    // Carga shaders .vert y .frag independientes. Fallback embebido si file://.
    const vsSrc = await loadText('shaders/daltonizador.vert', FALLBACK_VERT);
    const fsSrc = await loadText('shaders/daltonizador.frag', FALLBACK_FRAG);
    vsSrcUsed = vsSrc;
    fsSrcUsed = fsSrc;
    if (vsSrc === FALLBACK_VERT || fsSrc === FALLBACK_FRAG) {
      log('Modo file:// con respaldo embebido. Para .frag independiente usa servidor local.');
    }
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog));
    }
    loc.uTexture = gl.getUniformLocation(prog, 'uTexture');
    loc.uSim = gl.getUniformLocation(prog, 'uSim');
    gpu.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');

    initQuad();
    makeTexture();
    srcCanvas = window.makeTestDiagram(1024, 640);
    // Textura inicial 1024x640 para evitar FBO cero.
    uploadCanvas(srcCanvas);
    makeFBO(canvas.clientWidth || 1024, canvas.clientHeight || 640);
    videoEl = $('video');

    bindUI();
    syncUI();
    log('WebGL2 listo. Fase A con diagrama por codigo.');
    requestAnimationFrame(loop);
    window.addEventListener('resize', resize);
    // Primer uso sin perfil: abre el test para armar el preset propio.
    try {
      if (!hadProfile) {
        log('Primer uso. Haz el test Ishihara para armar tu preset.');
        openTest();
      }
    } catch (e) { /* modo privado */ }
  }

  document.addEventListener('DOMContentLoaded', () => {
    boot().catch((e) => { console.error(e); log('Error: ' + e.message); });
  });
})();
