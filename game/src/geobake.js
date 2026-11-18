// geobake.js — Velmara After Dark: seeded PRNG, vertex-colour geometry batching
// and canvas-texture helpers. Everything static in the city is baked through
// GeoBatch so hundreds of boxes become a handful of draw calls.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  // mulberry32: tiny deterministic PRNG, the whole city grows from one seed.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  V.mulberry32 = mulberry32;

  function shade(hex, f) {
    const r = Math.min(255, Math.max(0, Math.round(((hex >> 16) & 255) * f)));
    const g = Math.min(255, Math.max(0, Math.round(((hex >> 8) & 255) * f)));
    const b = Math.min(255, Math.max(0, Math.round((hex & 255) * f)));
    return (r << 16) | (g << 8) | b;
  }
  V.shade = shade;

  // GeoBatch accumulates transformed, coloured boxes and flat quads into one
  // BufferGeometry. Faces: +x,-x,+y,-y,+z,-z with a per-face light factor so a
  // single Lambert material still reads as shaded low-poly geometry.
  const FACES = [
    { n: [1, 0, 0], f: 0.82, c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
    { n: [-1, 0, 0], f: 0.66, c: [[-1, 0, 0], [-1, 0, 1], [-1, 1, 1], [-1, 1, 0]] },
    { n: [0, 1, 0], f: 1.0, c: [[-1, 1, 1], [1, 1, 1], [1, 1, 0], [-1, 1, 0]] },
    { n: [0, -1, 0], f: 0.4, c: [[-1, -1, 0], [1, -1, 0], [1, -1, 1], [-1, -1, 1]] },
    { n: [0, 0, 1], f: 0.92, c: [[-1, 0, 1], [1, 0, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: [0, 0, -1], f: 0.58, c: [[1, 0, 0], [-1, 0, 0], [-1, 1, 0], [1, 1, 0]] },
  ];

  function GeoBatch() {
    this.pos = []; this.nor = []; this.col = []; this.idx = []; this.count = 0;
  }
  GeoBatch.prototype.box = function (cx, cy, cz, sx, sy, sz, hex, ry) {
    const cos = Math.cos(ry || 0), sin = Math.sin(ry || 0);
    const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
    for (let fi = 0; fi < 6; fi++) {
      const face = FACES[fi];
      const fr = Math.min(1, r * face.f + 0.03), fg = Math.min(1, g * face.f + 0.03), fb = Math.min(1, b * face.f + 0.03);
      const base = this.count;
      for (let vi = 0; vi < 4; vi++) {
        const c = face.c[vi];
        let x = c[0] * sx / 2, y = c[1] * sy / 2, z = c[2] * sz / 2;
        const rx = x * cos - z * sin, rz = x * sin + z * cos;
        this.pos.push(cx + rx, cy + y, cz + rz);
        const nx = face.n[0] * cos - face.n[2] * sin, nz = face.n[0] * sin + face.n[2] * cos;
        this.nor.push(nx, face.n[1], nz);
        this.col.push(fr, fg, fb);
      }
      this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      this.count += 4;
    }
    return this;
  };
  // Flat quad facing +z before rotation ry (used for windows and lamp glows).
  GeoBatch.prototype.quad = function (cx, cy, cz, w, h, hex, ry) {
    const cos = Math.cos(ry || 0), sin = Math.sin(ry || 0);
    const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
    const base = this.count;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) {
      const x = corners[i][0] * w / 2, y = corners[i][1] * h / 2;
      this.pos.push(cx + x * cos, cy + y, cz + x * sin);
      this.nor.push(sin, 0, cos);
      this.col.push(r, g, b);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.count += 4;
    return this;
  };
  // Flat quad lying in the XZ plane (road dashes, marker rings on the ground).
  GeoBatch.prototype.flat = function (cx, cy, cz, w, d, hex) {
    const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
    const base = this.count;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) {
      this.pos.push(cx + corners[i][0] * w / 2, cy, cz + corners[i][1] * d / 2);
      this.nor.push(0, 1, 0);
      this.col.push(r, g, b);
    }
    this.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    this.count += 4;
    return this;
  };
  GeoBatch.prototype.build = function (material) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setIndex(this.idx);
    const mesh = new THREE.Mesh(geo, material);
    mesh.matrixAutoUpdate = false;
    return mesh;
  };
  V.GeoBatch = GeoBatch;

  V.matLambert = function () {
    return new THREE.MeshLambertMaterial({ vertexColors: true });
  };
  V.matBasic = function () {
    return new THREE.MeshBasicMaterial({ vertexColors: true });
  };

  // Canvas texture painter: fn(ctx, size) draws, returns a THREE texture.
  function canvasTexture(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 2;
    return t;
  }
  V.canvasTexture = canvasTexture;

  // A neon sign: bright canvas lettering on a dark board. The plane's +z faces
  // away from the wall it is mounted on; callers pass the outward yaw so the
  // lettering never ends up facing into the building.
  function neonSign(text, color, w, h) {
    const tex = canvasTexture(512, 128, function (ctx, W, H) {
      ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.strokeRect(8, 8, W - 16, H - 16);
      ctx.font = '900 64px Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = color; ctx.shadowBlur = 26;
      ctx.fillStyle = color;
      ctx.fillText(text, W / 2, H / 2 + 2);
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      ctx.fillText(text, W / 2, H / 2 + 2);
    });
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: false })
    );
    return m;
  }
  V.neonSign = neonSign;

  // Distance helpers shared by every system.
  V.dist2d = function (ax, az, bx, bz) {
    const dx = ax - bx, dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  };
  V.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
  V.lerp = function (a, b, t) { return a + (b - a) * t; };
  // Shortest-angle lerp for headings.
  V.turnToward = function (cur, target, maxStep) {
    let d = target - cur;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (d > maxStep) d = maxStep; else if (d < -maxStep) d = -maxStep;
    return cur + d;
  };
})(window.VAD);
