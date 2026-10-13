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
precision highp float;
in vec2 vTexCoord;
uniform sampler2D uTexture;
uniform int uMode;
uniform int uType;
uniform float uSeverity;
uniform float uSplit;
out vec4 outColor;
vec3 srgb2lin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 lin2srgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float luminanceY(vec3 lin) { return 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b; }
const mat3 RGB2LMS = mat3(0.8951, -0.7502, 0.0389, 0.2664, 1.7135, -0.0685, -0.1614, 0.0367, 1.0296);
const mat3 LMS2RGB = mat3(0.986992, 0.432305, -0.008528, -0.147054, 0.518360, 0.040042, 0.159962, 0.049291, 0.968486);
mat3 projectorForType(int t) {
  if (t == 1) { return mat3(0.0, 0.0, 0.0, 2.02344, 1.0, 0.0, -2.52581, 0.0, 1.0); }
  else if (t == 2) { return mat3(1.0, 0.494207, 0.0, 0.0, 0.0, 0.0, 0.0, 1.24827, 1.0); }
  else if (t == 3) { return mat3(1.0, 0.0, -0.395913, 0.0, 1.0, 0.801109, 0.0, 0.0, 0.0); }
  return mat3(1.0);
}
void main() {
  vec3 srgb = texture(uTexture, vTexCoord).rgb;
  vec3 lin = srgb2lin(srgb);
  vec3 lms = RGB2LMS * lin;
  mat3 P = projectorForType(uType);
  vec3 lmsSimFull = (uType == 0) ? lms : P * lms;
  vec3 lmsMix = mix(lms, lmsSimFull, clamp(uSeverity, 0.0, 1.0));
  vec3 rgbSimLin = clamp(LMS2RGB * lmsMix, 0.0, 1.0);
  vec3 err = lin - rgbSimLin;
  vec3 corr = lin;
  float s = clamp(uSeverity, 0.0, 1.0);
  if (uType == 1) { corr.g += err.r * 0.30 * s; corr.b += err.r * 0.70 * s; }
  else if (uType == 2) { corr.r += err.g * 0.30 * s; corr.b += err.g * 0.70 * s; }
  else if (uType == 3) { corr.r += err.b * 0.50 * s; corr.g += err.b * 0.30 * s; }
  float yOrig = luminanceY(lin);
  float yCorr = luminanceY(corr);
  corr = clamp(corr + (yOrig - yCorr), 0.0, 1.0);
  vec3 result;
  if (uMode == 1) { result = lin2srgb(rgbSimLin); }
  else if (uMode == 2) { result = (uType == 0) ? srgb : lin2srgb(corr); }
  else { result = srgb; }
  if (uSplit > 0.5 && vTexCoord.x < 0.5) { result = srgb; }
  outColor = vec4(result, 1.0);
}
`;

  const $ = (id) => document.getElementById(id);
  let gl = null, prog = null, vao = null;
  let tex = null, fbo = null, fboTex = null;
  let srcCanvas = null, videoEl = null, useVideo = false;
  let loc = {};
  let state = { mode: 1, type: 2, severity: 0.8, split: false, on: true };
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
    // En pasa 1 fuerza original para no contaminar.
    gl.uniform1i(loc.uMode, 0);
    gl.uniform1i(loc.uType, 0);
    gl.uniform1f(loc.uSeverity, 0);
    gl.uniform1f(loc.uSplit, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Pasa 2: a pantalla con filtro. Lee fboTex como sampler.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.uniform1i(loc.uTexture, 0);
    gl.uniform1i(loc.uMode, state.on ? state.mode : 0);
    gl.uniform1i(loc.uType, state.type);
    gl.uniform1f(loc.uSeverity, state.severity);
    gl.uniform1f(loc.uSplit, state.split ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  function loop() {
    if (useVideo && videoEl && !videoEl.paused && videoEl.readyState >= 2) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoEl);
    }
    draw();
    frames++;
    const now = performance.now();
    if (now - lastT >= 500) {
      fps = Math.round((frames * 1000) / (now - lastT));
      frames = 0;
      lastT = now;
      $('fps').textContent = fps + ' fps';
    }
    requestAnimationFrame(loop);
  }

  function saveProfile() {
    try {
      localStorage.setItem('dalton.perfil', JSON.stringify({ type: state.type, severity: state.severity }));
      localStorage.setItem('dalton.ui', JSON.stringify({ mode: state.mode, split: state.split }));
    } catch (e) { /* modo privado */ }
  }

  function loadProfile() {
    try {
      const p = JSON.parse(localStorage.getItem('dalton.perfil') || 'null');
      if (p && typeof p.type === 'number') {
        state.type = p.type;
        state.severity = p.severity;
      }
      const u = JSON.parse(localStorage.getItem('dalton.ui') || 'null');
      if (u && typeof u.mode === 'number') {
        state.mode = u.mode;
      }
      state.split = false; // vista dividida eliminada: siempre imagen completa
    } catch (e) { /* ignora */ }
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 2000);
  }

  function syncUI() {
    $('mode').value = String(state.mode);
    $('type').value = String(state.type);
    $('severity').value = String(state.severity);
    $('sevVal').textContent = Number(state.severity).toFixed(2);
    $('btnOn').textContent = state.on ? 'Filtro: ON' : 'Filtro: OFF';
    const names = { 0: 'Normal', 1: 'Protan', 2: 'Deutan', 3: 'Tritan' };
    const modes = { 0: 'Original', 1: 'Simulacion', 2: 'Correccion' };
    $('hudState').textContent = modes[state.mode] + ' · ' + names[state.type] + ' ' + Number(state.severity).toFixed(2);
    // Sincroniza el preset si el estado coincide con uno conocido.
    const sel = $('preset');
    if (sel && sel.options.length) {
      const hit = (window.DALTON_PRESETS || []).find((p) =>
        p.mode === state.mode && p.type === state.type &&
        Math.abs(p.severity - state.severity) < 1e-6 && p.split === state.split);
      sel.value = hit ? hit.id : '';
    }
  }

  function applyPreset(id) {
    const p = (window.DALTON_PRESETS || []).find((x) => x.id === id);
    if (!p) return;
    state.mode = p.mode;
    state.type = p.type;
    state.severity = p.severity;
    state.split = p.split;
    state.on = true;
    saveProfile();
    syncUI();
    toast('Preset: ' + p.nombre);
    log('Preset aplicado: ' + p.id + ' ' + p.descripcion);
  }

  function bindUI() {
    const presets = window.DALTON_PRESETS || [];
    const sel = $('preset');
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = '— Elige preset —';
    sel.appendChild(ph);
    presets.forEach((p) => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.nombre;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => applyPreset(sel.value));

    $('mode').addEventListener('change', (e) => { state.mode = +e.target.value; saveProfile(); syncUI(); });
    $('type').addEventListener('change', (e) => { state.type = +e.target.value; saveProfile(); syncUI(); });
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
    $('testBack').addEventListener('click', () => {
      if (currentPlate() && currentPlate().kind === 'trace') Test.saved[Test.idx] = Test.strokes;
      if (Test.idx > 0) { Test.idx--; renderTestStep(); }
    });
    $('testNext').addEventListener('click', testNext);
    $('testClose').addEventListener('click', closeTest);
    // Dibujo con mouse o tacto sobre laminas de trazo.
    const tc = $('testCanvas');
    tc.addEventListener('pointerdown', (e) => {
      if (!Test.open || !currentPlate() || currentPlate().kind !== 'trace') return;
      e.preventDefault();
      try { tc.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ }
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

  function redrawTestPlate() {
    window.drawIshiharaTestPlate(testCanvas(), currentPlate());
    drawUserStrokes();
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
    window.drawIshiharaTestPlate(testCanvas(), p);
    drawUserStrokes();
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
      const cnt = document.createElement('p');
      cnt.className = 'hint';
      cnt.id = 'testStrokeCount';
      q.appendChild(cnt);
      updateStrokeCount();
      const b = document.createElement('button');
      b.className = 'opt';
      b.textContent = 'Borrar trazos';
      b.addEventListener('click', () => { Test.strokes = []; Test.cur = null; Test.saved[Test.idx] = []; redrawTestPlate(); });
      q.appendChild(b);
    } else {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.id = 'testAnswer';
      inp.inputMode = 'numeric';
      inp.placeholder = '¿Que numero ves?';
      inp.value = (Test.answers[Test.idx] === 'noveo') ? '' : Test.answers[Test.idx];
      inp.setAttribute('aria-label', 'Numero que ves en la lamina');
      q.appendChild(inp);
      const b = document.createElement('button');
      b.className = 'opt' + (Test.answers[Test.idx] === 'noveo' ? ' sel' : '');
      b.textContent = 'No veo ningun numero';
      b.addEventListener('click', () => { Test.answers[Test.idx] = 'noveo'; renderTestStep(); });
      q.appendChild(b);
      inp.addEventListener('input', () => {
        Test.answers[Test.idx] = inp.value.replace(/\s+/g, '');
      });
      setTimeout(() => inp.focus(), 50);
    }
    $('testBack').disabled = Test.idx === 0;
    $('testNext').textContent = (Test.idx === 13) ? 'Ver resultado →' : 'Siguiente →';
  }

  function testNext() {
    const p = currentPlate();
    let a = Test.answers[Test.idx];
    if (p.kind !== 'trace') {
      const inp = $('testAnswer');
      if (inp) a = inp.value.replace(/\s+/g, '');
      if (a === '') { toast('Responde o pulsa No veo numero'); return; }
      Test.answers[Test.idx] = a.toLowerCase();
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
    bUse.textContent = 'Usar mi preset (correccion)';
    bUse.addEventListener('click', () => {
      state.type = r.type;
      state.severity = r.severity;
      state.mode = 2;
      state.split = false;
      state.on = true;
      saveProfile(); syncUI(); closeTest();
      toast('Preset propio: ' + r.typeName + ' ' + r.severity.toFixed(2));
    });
    const bSim = document.createElement('button');
    bSim.textContent = 'Probar simulacion';
    bSim.addEventListener('click', () => {
      state.type = r.type === 0 ? 2 : r.type;
      state.severity = r.type === 0 ? 1.0 : r.severity;
      state.mode = 1;
      state.split = false;
      state.on = true;
      saveProfile(); syncUI(); closeTest();
      toast('Simulacion lista');
    });
    row.appendChild(bUse);
    row.appendChild(bSim);
    box.appendChild(row);
    box.scrollIntoView({ block: 'nearest' });
  }

  async function boot() {
    const canvas = $('gl');
    gl = canvas.getContext('webgl2', { antialias: false });
    if (!gl) {
      log('WebGL2 no disponible. Usa Chrome, Brave o Safari reciente.');
      return;
    }
    loadProfile();
    // UNPACK_FLIP_Y global. Corrige orientacion de Canvas2D y video.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    // Carga shaders .vert y .frag independientes. Fallback embebido si file://.
    const vsSrc = await loadText('shaders/daltonizador.vert', FALLBACK_VERT);
    const fsSrc = await loadText('shaders/daltonizador.frag', FALLBACK_FRAG);
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
    loc.uMode = gl.getUniformLocation(prog, 'uMode');
    loc.uType = gl.getUniformLocation(prog, 'uType');
    loc.uSeverity = gl.getUniformLocation(prog, 'uSeverity');
    loc.uSplit = gl.getUniformLocation(prog, 'uSplit');

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
      if (!localStorage.getItem('dalton.perfil')) {
        log('Primer uso. Haz el test Ishihara para armar tu preset.');
        openTest();
      }
    } catch (e) { /* modo privado */ }
  }

  document.addEventListener('DOMContentLoaded', () => {
    boot().catch((e) => { console.error(e); log('Error: ' + e.message); });
  });
})();
