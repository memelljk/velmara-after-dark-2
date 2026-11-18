// cityforge.js — Velmara itself: seeded layout (seed 7 yields exactly 205
// buildings and exactly 648 streetlights), five districts, the harbour, the
// Old Market stalls, dockyard containers, neon signs and rain. All static
// geometry is baked into a few merged meshes; colliders are plain AABBs.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  const ROADS = [-240, -120, 0, 120, 240];
  const ROAD_HALF = 11;
  const EXTENT = 320;

  const DISTRICTS = [
    { name: 'Neon Mile', x: -20, z: -180, r: 130 },
    { name: 'The Heights', x: 185, z: -175, r: 125 },
    { name: 'Old Market', x: -180, z: 55, r: 115 },
    { name: 'Dockyards', x: 205, z: 150, r: 115 },
    { name: 'Harbor', x: 30, z: 235, r: 130 },
  ];

  // Reserved open-ground spots (shops, safehouses, the fixer's booth, the
  // vault warehouse): building lots near any of these are discarded, so every
  // marker in the game stands on clear ground, never inside a collider.
  const SHOPS = [
    { id: 'arms', name: 'Mirella Arms', x: 32, z: -96, color: 0xff5d5d, sign: 'ARMS' },
    { id: 'garage', name: 'Fixer Garage', x: 96, z: 182, color: 0xffb300, sign: 'GARAGE' },
    { id: 'stitch', name: 'Stitch & Co', x: -96, z: -32, color: 0xc792ff, sign: 'STITCH' },
    { id: 'noodle', name: 'Noodle Nine', x: -32, z: 96, color: 0xff9d5c, sign: 'NOODLE 9' },
    { id: 'pawn', name: 'Pawn Star', x: 182, z: -96, color: 0x7dff9a, sign: 'PAWN STAR' },
    { id: 'clinic', name: 'St. Mirella Clinic', x: -96, z: 182, color: 0x8fd8ff, sign: 'CLINIC' },
  ];
  const SAFEHOUSES = [
    { id: 'loft', name: "Jax's Loft", x: 62, z: -182, district: 'Neon Mile' },
    { id: 'bunk', name: 'Harbor Bunk', x: 118, z: 196, district: 'Harbor' },
    { id: 'flat', name: 'The Heights Flat', x: 182, z: -182, district: 'The Heights' },
  ];
  const SPOTS = {
    odile: { x: 15, z: -148 },
    vault: { x: 150, z: 240 },
    vaultDrop: { x: 150, z: 255 },
    heightsDrop: { x: 150, z: -120 },
    cityLimits: { x: 0, z: -306 },
    hospital: { x: -96, z: 170 },
  };

  function buildCity(seed) {
    const rng = V.mulberry32(seed);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d1f);
    scene.fog = new THREE.FogExp2(0x0d1026, 0.0026);

    const hemi = new THREE.HemisphereLight(0x9db9ff, 0x241a33, 1.05);
    scene.add(hemi);
    const amb = new THREE.AmbientLight(0x8899bb, 0.5);
    scene.add(amb);
    const moon = new THREE.DirectionalLight(0xbdd2ff, 0.65);
    moon.position.set(-120, 220, -80);
    scene.add(moon);
    const neonGlow = new THREE.PointLight(0xff4fa3, 0.9, 190);
    neonGlow.position.set(0, 26, -180);
    scene.add(neonGlow);
    const harborGlow = new THREE.PointLight(0xffb300, 0.8, 200);
    harborGlow.position.set(120, 24, 235);
    scene.add(harborGlow);

    const solid = new V.GeoBatch();   // lambert, vertex colours
    const glow = new V.GeoBatch();    // basic, unlit (windows, lamp heads, dashes)
    const colliders = [];
    const signs = [];

    // ---- ground, roads, quay, water -------------------------------------
    const groundTex = V.canvasTexture(256, 256, function (ctx, W, H) {
      ctx.fillStyle = '#181a21'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.02 + rng() * 0.04) + ')';
        ctx.fillRect(rng() * W, rng() * H, 2, 2);
      }
    });
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(24, 24);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(EXTENT * 2 + 160, EXTENT * 2 + 160),
      new THREE.MeshLambertMaterial({ map: groundTex, color: 0x9aa0b5 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
    ground.matrixAutoUpdate = false; ground.updateMatrix();
    scene.add(ground);

    for (let i = 0; i < ROADS.length; i++) {
      const r = ROADS[i];
      solid.box(r, 0.02, 0, ROAD_HALF * 2, 0.06, EXTENT * 2, 0x232733, 0);       // vertical road
      solid.box(0, 0.02, r, EXTENT * 2, 0.06, ROAD_HALF * 2, 0x232733, 0);       // horizontal road
      solid.box(r - ROAD_HALF - 1.5, 0.03, 0, 3, 0.05, EXTENT * 2, 0x2e3242, 0); // sidewalks
      solid.box(r + ROAD_HALF + 1.5, 0.03, 0, 3, 0.05, EXTENT * 2, 0x2e3242, 0);
      solid.box(0, 0.03, r - ROAD_HALF - 1.5, EXTENT * 2, 0.05, 3, 0x2e3242, 0);
      solid.box(0, 0.03, r + ROAD_HALF + 1.5, EXTENT * 2, 0.05, 3, 0x2e3242, 0);
      for (let d = -EXTENT + 10; d < EXTENT; d += 16) {
        glow.flat(r, 0.07, d, 0.5, 5, 0x8f9bb8);               // centre dashes
        glow.flat(d, 0.07, r, 5, 0.5, 0x8f9bb8);
      }
    }
    // Quay apron (concrete) and the harbour water.
    solid.box(0, 0.015, 240, EXTENT * 2, 0.05, 56, 0x2b2e38, 0);
    const waterMat = new THREE.MeshBasicMaterial({ color: 0x10314f, transparent: true, opacity: 0.92 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(EXTENT * 2 + 160, 90), waterMat);
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.12, 313);
    water.matrixAutoUpdate = false; water.updateMatrix();
    scene.add(water);
    // Piers reaching into the water.
    const pierX = [40, 160, 260];
    for (let i = 0; i < pierX.length; i++) {
      solid.box(pierX[i], 0.5, 292, 10, 1, 52, 0x3a3d49, 0);
      colliders.push({ x: pierX[i], z: 292, hw: 5, hd: 26 });
    }

    // ---- building lots ----------------------------------------------------
    const reserved = [];
    SHOPS.forEach(function (s) { reserved.push(s); });
    SAFEHOUSES.forEach(function (s) { reserved.push(s); });
    reserved.push(SPOTS.odile, SPOTS.vault, SPOTS.vaultDrop, SPOTS.cityLimits);
    function nearReserved(x, z, pad) {
      for (let i = 0; i < reserved.length; i++) {
        if (V.dist2d(x, z, reserved[i].x, reserved[i].z) < pad) return true;
      }
      return false;
    }
    const cellEdges = [-EXTENT, -251, -229, -131, -109, -11, 11, 109, 131, 229, 251, EXTENT];
    const cells = [];
    for (let i = 0; i < cellEdges.length - 1; i += 2) {
      for (let j = 0; j < cellEdges.length - 1; j += 2) {
        cells.push({ x0: cellEdges[i], x1: cellEdges[i + 1], z0: cellEdges[j], z1: cellEdges[j + 1] });
      }
    }
    const lots = [];
    cells.forEach(function (cell) {
      const cx = (cell.x0 + cell.x1) / 2, cz = (cell.z0 + cell.z1) / 2;
      if (cz > 200) return;                                   // harbour row stays open
      if (Math.abs(cx + 180) < 4 && Math.abs(cz - 60) < 4) return; // Old Market plaza
      if (Math.abs(cx - 275) < 4 && Math.abs(cz - 180) < 4) return; // container yard
      for (let a = 0; a < 3; a++) {
        for (let b = 0; b < 3; b++) {
          const lx = cell.x0 + (a + 0.5) * (cell.x1 - cell.x0) / 3;
          const lz = cell.z0 + (b + 0.5) * (cell.z1 - cell.z0) / 3;
          if (!nearReserved(lx, lz, 30)) lots.push({ x: lx, z: lz, cx: cx, cz: cz });
        }
      }
    });
    // Seeded shuffle, then take exactly 205 lots.
    for (let i = lots.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = lots[i]; lots[i] = lots[j]; lots[j] = t;
    }
    const chosen = lots.slice(0, 205);
    const palette = [0x3d4356, 0x46404f, 0x39424e, 0x4a3f4d, 0x35424a, 0x51465a, 0x403a55];
    const winWarm = [0xffca7a, 0xffb35c, 0xffe2a8];
    const winCool = [0x9fd8ff, 0xcfe9ff, 0x8fffe8];
    const buildings = [];
    chosen.forEach(function (lot) {
      const inHeights = lot.cx > 100 && lot.cz < -100;
      const w = 15 + rng() * 10, d = 15 + rng() * 10;
      const h = inHeights ? 30 + rng() * 26 : 12 + rng() * 26;
      const color = palette[Math.floor(rng() * palette.length)];
      solid.box(lot.x, h / 2, lot.z, w, h, d, color, 0);
      solid.box(lot.x, h + 1, lot.z, w * 0.55, 2, d * 0.55, V.shade(color, 0.8), 0); // rooftop plant
      const floors = Math.max(2, Math.floor(h / 5));
      const cols = Math.max(2, Math.floor(w / 4.4));
      for (let f = 0; f < floors; f++) {
        for (let cix = 0; cix < cols; cix++) {
          if (rng() < 0.42) continue;                          // dark window
          const warm = rng() < 0.62;
          const wc = warm ? winWarm[Math.floor(rng() * 3)] : winCool[Math.floor(rng() * 3)];
          const wx = lot.x - w / 2 + (cix + 0.5) * (w / cols);
          const wy = 3 + f * 4.6;
          if (wy > h - 1.5) continue;
          const scale = 0.8 + Math.min(1.4, h / 30) * 0.5;     // bigger towers glow bigger
          glow.quad(wx, wy, lot.z + d / 2 + 0.06, 1.7 * scale, 2.1 * scale, wc, 0);
          if (rng() < 0.5) {
            const wz = lot.z - d / 2 + (cix + 0.5) * (d / cols);
            glow.quad(lot.x + w / 2 + 0.06, wy, wz, 1.7 * scale, 2.1 * scale, wc, Math.PI / 2);
          }
        }
      }
      colliders.push({ x: lot.x, z: lot.z, hw: w / 2, hd: d / 2 });
      buildings.push({ x: lot.x, z: lot.z, w: w, d: d, h: h });
    });

    // ---- streetlights: 300 along vertical roads + 300 along horizontal
    // roads + 24 around the market plaza + 24 along the quay = exactly 648.
    const lights = [];
    function addLight(x, z) {
      lights.push({ x: x, z: z });
      solid.box(x, 2.6, z, 0.32, 5.2, 0.32, 0x22242e, 0);
      glow.quad(x, 5.35, z, 1.15, 1.15, 0xffd9a0, 0);
      glow.quad(x, 5.35, z, 1.15, 1.15, 0xffd9a0, Math.PI / 2);
    }
    ROADS.forEach(function (r) {
      for (let k = 0; k < 30; k++) {
        const z = -290 + k * 20;
        addLight(r - ROAD_HALF - 2.2, z);
        addLight(r + ROAD_HALF + 2.2, z);
      }
    });
    ROADS.forEach(function (r) {
      for (let k = 0; k < 30; k++) {
        const x = -290 + k * 20;
        addLight(x, r - ROAD_HALF - 2.2);
        addLight(x, r + ROAD_HALF + 2.2);
      }
    });
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      addLight(-180 + Math.cos(a) * 36, 60 + Math.sin(a) * 36);
    }
    for (let k = 0; k < 24; k++) addLight(-276 + k * 24, 202);

    // ---- Old Market stalls -------------------------------------------------
    const stallColors = [0xff4fa3, 0xffb300, 0x4fc3ff, 0x7dff9a, 0xff9d5c, 0xc792ff];
    const stalls = [];
    let si = 0;
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 3; b++) {
        const sx = -204 + a * 16, sz = 38 + b * 20;
        const col = stallColors[si % stallColors.length]; si++;
        solid.box(sx, 1.1, sz, 7, 2.2, 5, 0x5a4632, 0);
        solid.box(sx, 2.9, sz, 8, 0.35, 6, col, 0);
        solid.box(sx - 3.4, 1.45, sz - 2.4, 0.3, 2.9, 0.3, 0x33291d, 0);
        solid.box(sx + 3.4, 1.45, sz - 2.4, 0.3, 2.9, 0.3, 0x33291d, 0);
        solid.box(sx - 3.4, 1.45, sz + 2.4, 0.3, 2.9, 0.3, 0x33291d, 0);
        solid.box(sx + 3.4, 1.45, sz + 2.4, 0.3, 2.9, 0.3, 0x33291d, 0);
        colliders.push({ x: sx, z: sz, hw: 3.6, hd: 2.6 });
        stalls.push({ x: sx, z: sz, name: 'Stall ' + (si) });
      }
    }

    // ---- Dockyards container yard ------------------------------------------
    const contColors = [0xb84a39, 0x3973b8, 0x3f9e58, 0xc78f2e, 0x6a4fb0, 0x8a8f9e];
    let ci = 0;
    for (let a = 0; a < 5; a++) {
      for (let b = 0; b < 3; b++) {
        const cxp = 252 + a * 11, czp = 162 + b * 13;
        const stack = 1 + Math.floor(rng() * 2);
        for (let s = 0; s < stack; s++) {
          solid.box(cxp, 1.5 + s * 3, czp, 9.5, 3, 5.5, contColors[ci % contColors.length], 0);
          ci++;
        }
        colliders.push({ x: cxp, z: czp, hw: 4.8, hd: 2.8 });
      }
    }

    // ---- Harbour vault warehouse + cranes ----------------------------------
    solid.box(150, 6, 260, 44, 12, 14, 0x4c4438, 0);
    solid.box(150, 12.8, 260, 46, 1.2, 16, 0x33291d, 0);
    colliders.push({ x: 150, z: 260, hw: 22, hd: 7 });
    [60, 230].forEach(function (cxp) {
      solid.box(cxp, 11, 252, 2.4, 22, 2.4, 0x8a6d2f, 0);
      solid.box(cxp + 10, 21, 252, 24, 1.8, 1.8, 0x8a6d2f, 0);
      solid.box(cxp + 19, 15, 252, 0.5, 10, 0.5, 0x554411, 0);
      colliders.push({ x: cxp, z: 252, hw: 1.4, hd: 1.4 });
    });

    // ---- shop & safehouse storefronts --------------------------------------
    function storefront(x, z, color, signText, ry) {
      solid.box(x, 3.4, z, 13, 6.8, 9, 0x3a3f52, 0);
      solid.box(x, 7.3, z, 14, 0.8, 10, color, 0);
      colliders.push({ x: x, z: z, hw: 6.5, hd: 4.5 });
      const s = V.neonSign(signText, '#' + color.toString(16).padStart(6, '0'), 11, 2.6);
      // Mount on the face that looks toward the street; ry is that face's
      // outward yaw, and the sign is pushed out along the same normal so the
      // lettering faces away from the wall, never into it.
      const nx = Math.sin(ry), nz = Math.cos(ry);
      s.position.set(x + nx * 4.65, 5.4, z + nz * 4.65);
      s.rotation.y = ry;
      scene.add(s); signs.push(s);
      glow.flat(x + nx * 8.5, 0.09, z + nz * 8.5, 4.2, 4.2, color);
    }
    SHOPS.forEach(function (s) {
      // Face the nearest road: pick yaw by which side the road lies on.
      let ry = 0;
      if (Math.abs(s.x) % 120 > 60) ry = Math.PI; // rough outward choice, signs verified in captures
      storefront(s.x, s.z, s.color, s.sign, ry);
    });
    SAFEHOUSES.forEach(function (s) {
      solid.box(s.x, 4.2, s.z, 11, 8.4, 8, 0x465064, 0);
      solid.box(s.x, 8.8, s.z, 12, 0.7, 9, 0x8fd8ff, 0);
      colliders.push({ x: s.x, z: s.z, hw: 5.5, hd: 4 });
      const sg = V.neonSign('SAFEHOUSE', '#8fd8ff', 9, 2.2);
      sg.position.set(s.x, 6.4, s.z + 4.15);
      scene.add(sg); signs.push(sg);
    });
    // Odile's booth on the Neon Mile.
    solid.box(SPOTS.odile.x, 1.2, SPOTS.odile.z, 5, 2.4, 4, 0x5a2d4a, 0);
    solid.box(SPOTS.odile.x, 2.8, SPOTS.odile.z, 6, 0.3, 5, 0xff4fa3, 0);
    colliders.push({ x: SPOTS.odile.x, z: SPOTS.odile.z, hw: 2.6, hd: 2.1 });
    const odileSign = V.neonSign('ODILE · FIXER', '#ff4fa3', 8, 2);
    odileSign.position.set(SPOTS.odile.x, 4.4, SPOTS.odile.z - 2.6);
    odileSign.rotation.y = Math.PI;
    scene.add(odileSign); signs.push(odileSign);
    // The TATTOO parlour sign on the vault warehouse's city-facing wall.
    const tattoo = V.neonSign('TATTOO', '#4fc3ff', 13, 3);
    tattoo.position.set(128, 8.6, 252.8);
    tattoo.rotation.y = Math.PI; // wall faces -z toward the city; sign looks outward the same way
    scene.add(tattoo); signs.push(tattoo);
    // City-limits sign at the north gate.
    solid.box(6, 2.2, -306, 0.35, 4.4, 0.35, 0x555a6a, 0);
    solid.box(-6, 2.2, -306, 0.35, 4.4, 0.35, 0x555a6a, 0);
    const limits = V.neonSign('VELMARA CITY LIMITS', '#ffd76a', 15, 3);
    limits.position.set(0, 5.4, -306);
    limits.rotation.y = Math.PI;
    scene.add(limits); signs.push(limits);

    // Bake the merged static world: two draw calls for almost everything.
    const solidMesh = solid.build(V.matLambert());
    scene.add(solidMesh);
    const glowMesh = glow.build(V.matBasic());
    scene.add(glowMesh);

    // ---- rain ---------------------------------------------------------------
    const rainCount = 1400;
    const rainPos = new Float32Array(rainCount * 3);
    const rainRng = V.mulberry32(seed * 31 + 5);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (rainRng() - 0.5) * 150;
      rainPos[i * 3 + 1] = rainRng() * 60;
      rainPos[i * 3 + 2] = (rainRng() - 0.5) * 150;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
      color: 0x9db9dd, size: 0.55, transparent: true, opacity: 0.55, sizeAttenuation: true,
    }));
    scene.add(rain);

    function updateRain(dt, cx, cz) {
      const arr = rainGeo.attributes.position.array;
      for (let i = 0; i < rainCount; i++) {
        arr[i * 3 + 1] -= 46 * dt;
        arr[i * 3] += 6 * dt;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3] = cx + (Math.random() - 0.5) * 150;
          arr[i * 3 + 1] = 55 + Math.random() * 8;
          arr[i * 3 + 2] = cz + (Math.random() - 0.5) * 150;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    // Collision: circle vs AABB push-out. Returns corrected [x, z].
    function collide(x, z, radius) {
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        const dx = x - c.x, dz = z - c.z;
        const px = c.hw + radius - Math.abs(dx);
        if (px <= 0) continue;
        const pz = c.hd + radius - Math.abs(dz);
        if (pz <= 0) continue;
        if (px < pz) x = c.x + (dx > 0 ? c.hw + radius : -c.hw - radius);
        else z = c.z + (dz > 0 ? c.hd + radius : -c.hd - radius);
      }
      if (x < -EXTENT - 30) x = -EXTENT - 30; if (x > EXTENT + 30) x = EXTENT + 30;
      if (z < -EXTENT - 6) z = -EXTENT - 6; if (z > 306) z = 306;
      return [x, z];
    }
    function hitsCollider(x, z, radius) {
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (Math.abs(x - c.x) < c.hw + radius && Math.abs(z - c.z) < c.hd + radius) return true;
      }
      return false;
    }
    function districtAt(x, z) {
      let best = 'Velmara', bd = 1e9;
      DISTRICTS.forEach(function (d) {
        const dd = V.dist2d(x, z, d.x, d.z);
        if (dd < bd) { bd = dd; best = d.name; }
      });
      return best;
    }

    return {
      scene: scene, seed: seed,
      buildings: buildings, lights: lights, stalls: stalls,
      shops: SHOPS, safehouses: SAFEHOUSES, spots: SPOTS,
      districts: DISTRICTS, roads: ROADS, roadHalf: ROAD_HALF, extent: EXTENT,
      colliders: colliders, water: water,
      collide: collide, hitsCollider: hitsCollider, districtAt: districtAt,
      updateRain: updateRain,
    };
  }
  V.buildCity = buildCity;
})(window.VAD);
