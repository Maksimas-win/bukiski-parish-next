// The volumetric «1,2 %» on the GPM page: plain WebGL, no libraries, no
// network. The page keeps a static typographic figure underneath; this module
// only swaps it for the rendered glyphs when WebGL works, motion is allowed
// and the visitor has not asked for comfortable reading. Nothing here depends
// on scrolling: the figure turns slowly by itself and follows a fine pointer.

import { MESH } from './percent3d-mesh.js?v=70f5a1cba2';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const identity = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function multiply(a, b) {
  const r = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) r[c * 4 + row] += a[k * 4 + row] * b[c * 4 + k];
  return r;
}
function translation(x, y, z) { const m = identity(); m[12] = x; m[13] = y; m[14] = z; return m; }
function rotation(axis, a) {
  const m = identity(); const c = Math.cos(a); const s = Math.sin(a);
  if (axis === 0) { m[5] = c; m[6] = s; m[9] = -s; m[10] = c; }
  if (axis === 1) { m[0] = c; m[2] = -s; m[8] = s; m[10] = c; }
  if (axis === 2) { m[0] = c; m[1] = s; m[4] = -s; m[5] = c; }
  return m;
}
function perspective(aspect) {
  const m = new Float32Array(16); const f = 1 / Math.tan(Math.PI / 10); const near = 0.1; const far = 60;
  m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = 2 * far * near / (near - far);
  return m;
}

/** Extrudes a glyph outline into a bevelled solid: front, back, sides and bevel strips. */
function createGeometry(shape) {
  const v = shape.points; const inset = v.map(q => q.slice()); const outward = v.map(() => [0, 0]);
  for (const ring of shape.rings) {
    for (let i = 0; i < ring.length; i++) {
      const id = ring[i]; const a = v[ring[(i + ring.length - 1) % ring.length]]; const b = v[id]; const c = v[ring[(i + 1) % ring.length]];
      const al = Math.hypot(b[0] - a[0], b[1] - a[1]); const bl = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const na = [(b[1] - a[1]) / al, -(b[0] - a[0]) / al]; const nb = [(c[1] - b[1]) / bl, -(c[0] - b[0]) / bl];
      const len = Math.hypot(na[0] + nb[0], na[1] + nb[1]) || 1;
      const n = [(na[0] + nb[0]) / len, (na[1] + nb[1]) / len];
      const offset = Math.min(0.016 / Math.max(0.25, n[0] * na[0] + n[1] * na[1]), Math.min(al, bl) * 0.32);
      inset[id] = [b[0] - n[0] * offset, b[1] - n[1] * offset]; outward[id] = n;
    }
  }
  const data = [];
  const vertex = (pt, z, n) => data.push(pt[0], pt[1], z, n[0], n[1], n[2]);
  for (let i = 0; i < shape.triangles.length; i += 3) {
    const [a, b, c] = shape.triangles.slice(i, i + 3);
    for (const id of [a, b, c]) vertex(inset[id], 0.16, [0, 0, 1]);
    for (const id of [c, b, a]) vertex(inset[id], -0.16, [0, 0, -1]);
  }
  for (const ring of shape.rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]; const b = ring[(i + 1) % ring.length];
      const dx = v[b][0] - v[a][0]; const dy = v[b][1] - v[a][1]; const len = Math.hypot(dx, dy);
      const n = [dy / len, -dx / len, 0];
      for (const [id, z] of [[a, 0.135], [a, -0.135], [b, -0.135], [a, 0.135], [b, -0.135], [b, 0.135]]) {
        const soft = outward[id][0] * n[0] + outward[id][1] * n[1] > 0.95;
        vertex(v[id], z, soft ? [outward[id][0], outward[id][1], 0] : n);
      }
      for (const sign of [1, -1]) {
        const face = sign * 0.16; const side = sign * 0.135;
        const corners = [[inset[a], face, a], [v[a], side, a], [v[b], side, b], [inset[a], face, a], [v[b], side, b], [inset[b], face, b]];
        if (sign < 0) corners.reverse();
        for (const [pt, z, id] of corners) vertex(pt, z, [outward[id][0] * 0.7, outward[id][1] * 0.7, sign * 0.72]);
      }
    }
  }
  return new Float32Array(data);
}

const VERTEX = `attribute vec3 aPosition; attribute vec3 aNormal;
uniform mat4 uMVP; uniform mat4 uModel; varying vec3 vNormal; varying vec3 vPosition;
void main(){ vec4 pos=uModel*vec4(aPosition,1.0); vPosition=pos.xyz;
vNormal=mat3(uModel)*aNormal; gl_Position=uMVP*vec4(aPosition,1.0); }`;

// Gilt rather than steel: the lighting matches the parish palette (wine, dome blue, gilt).
const FRAGMENT = `precision mediump float;
varying vec3 vNormal; varying vec3 vPosition; uniform vec3 uCamera; uniform float uOpacity;
void main(){ vec3 n=normalize(vNormal), v=normalize(uCamera-vPosition), r=reflect(-v,n);
float diffuse=max(0.0,dot(n,normalize(vec3(-0.6,1.1,1.8))));
float softbox=pow(max(0.0,dot(r,normalize(vec3(-0.65,0.85,1.2)))),18.0);
float strip=smoothstep(-0.25,-0.08,r.y)-smoothstep(0.12,0.28,r.y);
float edge=pow(1.0-max(0.0,dot(n,v)),3.0);
vec3 metal=vec3(0.30,0.20,0.07)+vec3(0.46,0.36,0.17)*max(0.0,n.z);
metal+=vec3(0.22,0.17,0.08)*diffuse+vec3(0.72,0.62,0.42)*softbox;
metal+=vec3(0.20,0.15,0.06)*strip+vec3(0.55,0.42,0.18)*edge;
gl_FragColor=vec4(pow(min(metal,vec3(1.0)),vec3(0.92)),uOpacity); }`;

export function init() {
  const root = document.querySelector('[data-gpm-hero]');
  const canvas = root?.querySelector('canvas');
  if (!root || !canvas) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const finePointer = matchMedia('(pointer: fine)');
  const still = () => reduced.matches || forcedColors.matches || document.documentElement.classList.contains('high-contrast');
  if (still()) return; // the static figure is already on the page

  let gl; let program; let locations; let parts = []; let raf = 0; let visible = true; let failed = false;
  let x = 0; let y = 0; let targetX = 0; let targetY = 0;
  let viewport = { width: 1, height: 1 };
  const started = performance.now(); let previous = started;

  function shader(type, source) {
    const s = gl.createShader(type);
    if (!s) throw new Error('shader');
    gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); throw new Error('compile'); }
    return s;
  }

  function setup() {
    gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true, stencil: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('webgl');
    const vs = shader(gl.VERTEX_SHADER, VERTEX); const fs = shader(gl.FRAGMENT_SHADER, FRAGMENT);
    program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(program);
    locations = {
      position: gl.getAttribLocation(program, 'aPosition'), normal: gl.getAttribLocation(program, 'aNormal'),
      mvp: gl.getUniformLocation(program, 'uMVP'), model: gl.getUniformLocation(program, 'uModel'),
      camera: gl.getUniformLocation(program, 'uCamera'), opacity: gl.getUniformLocation(program, 'uOpacity')
    };
    const keys = ['one', root.dataset.decimal === '.' ? 'dot' : 'comma', 'two', 'percent'];
    const width = keys.reduce((n, key) => n + MESH[key].advance, 0) + 0.06;
    let offset = 0;
    parts = keys.map((key, i) => {
      const shape = MESH[key]; const data = createGeometry(shape); const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const part = { buffer, count: data.length / 6, x: offset + shape.advance / 2 - width / 2, y: shape.offsetY, i };
      offset += shape.advance + (i === 2 ? 0.06 : 0);
      return part;
    });
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  function resize() {
    if (failed) return;
    const rect = canvas.getBoundingClientRect();
    viewport = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
    const dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.35 : 1.75);
    const width = Math.round(viewport.width * dpr); const height = Math.round(viewport.height * dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    requestFrame();
  }

  function paint(now) {
    raf = 0;
    if (failed || still() || document.hidden || !visible) return;
    const dt = Math.min(48, Math.max(1, now - previous)); previous = now;
    const mix = 1 - Math.exp(-dt / 90);
    x += (targetX - x) * mix; y += (targetY - y) * mix;
    const entry = smooth(0, 1300, now - started);
    const idle = (now - started) / 1000;
    const aspect = viewport.width / viewport.height;
    const distance = Math.max(3.9, 2.5 / (Math.tan(Math.PI / 10) * aspect));
    const pv = multiply(perspective(aspect), translation(0, 0, -distance));
    // A slow breathing turn so the figure reads as a solid object even when the pointer is still.
    let base = multiply(rotation(2, -0.04), rotation(1, -0.22 + x * 0.14 + Math.sin(idle * 0.45) * 0.08));
    base = multiply(base, rotation(0, 0.12 + y * 0.10 + Math.cos(idle * 0.33) * 0.04));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.useProgram(program);
    gl.uniform3f(locations.camera, 0, 0, distance); gl.uniform1f(locations.opacity, entry);
    for (const part of parts) {
      let model = multiply(base, translation(part.x, part.y + (1 - entry) * 0.16, -(1 - entry) * 0.5));
      model = multiply(model, rotation(2, (part.i - 1.5) * 0.02));
      gl.uniformMatrix4fv(locations.model, false, model); gl.uniformMatrix4fv(locations.mvp, false, multiply(pv, model));
      gl.bindBuffer(gl.ARRAY_BUFFER, part.buffer);
      gl.enableVertexAttribArray(locations.position); gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(locations.normal); gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, 24, 12);
      gl.drawArrays(gl.TRIANGLES, 0, part.count);
    }
    requestFrame();
  }

  function requestFrame() {
    if (!raf && !failed && !still() && visible && !document.hidden) raf = requestAnimationFrame(paint);
  }

  function fallback() {
    failed = true; cancelAnimationFrame(raf); raf = 0;
    root.classList.remove('has-webgl');
    if (gl && !gl.isContextLost()) { parts.forEach(part => gl.deleteBuffer(part.buffer)); if (program) gl.deleteProgram(program); }
  }

  try {
    setup();
    root.classList.add('has-webgl');
    resize();
    addEventListener('resize', resize, { passive: true });
    root.addEventListener('pointermove', event => {
      if (!finePointer.matches || event.pointerType === 'touch') return;
      const r = root.getBoundingClientRect();
      targetX = clamp((event.clientX - r.left) / r.width) * 2 - 1;
      targetY = clamp((event.clientY - r.top) / r.height) * 2 - 1;
      requestFrame();
    }, { passive: true });
    root.addEventListener('pointerleave', () => { targetX = targetY = 0; requestFrame(); }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else { previous = performance.now(); requestFrame(); }
    });
    reduced.addEventListener('change', () => { if (still()) fallback(); });
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) { previous = performance.now(); requestFrame(); } else { cancelAnimationFrame(raf); raf = 0; }
      }, { rootMargin: '80px' });
      observer.observe(root);
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  } catch {
    fallback();
  }
}
