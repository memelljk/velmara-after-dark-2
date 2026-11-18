// jax.js — people geometry and the hero. Every humanoid is ONE merged
// vertex-coloured mesh (legs, torso, arms, head baked together); a missing
// pants colour is impossible because the legs default to a shade derived
// from the torso colour. Also holds Jax Rook's on-foot movement and the
// fixer Odile Vane, who waits at her Neon Mile booth.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  const SKINS = [0xe8b98d, 0xc68863, 0x8d5a3b, 0xf0c8a0, 0x6e442a];

  function makeHumanoid(opts) {
    opts = opts || {};
    const shirt = opts.shirt !== undefined ? opts.shirt : 0x3a6ea5;
    // Default pants: derived from the shirt so the field can never be
    // undefined (a missing pants colour once produced a THREE colour warning).
    const pants = opts.pants !== undefined ? opts.pants : V.shade(shirt, 0.45);
    const skin = opts.skin !== undefined ? opts.skin : SKINS[Math.floor(Math.random() * SKINS.length)];
    const hair = opts.hair !== undefined ? opts.hair : 0x1c1512;
    const b = new V.GeoBatch();
    b.box(-0.16, 0.45, 0, 0.26, 0.9, 0.3, pants, 0);        // legs
    b.box(0.16, 0.45, 0, 0.26, 0.9, 0.3, pants, 0);
    b.box(0, 1.22, 0, 0.62, 0.68, 0.34, shirt, 0);          // torso
    b.box(-0.42, 1.18, 0, 0.18, 0.62, 0.2, shirt, 0);       // arms
    b.box(0.42, 1.18, 0, 0.18, 0.62, 0.2, shirt, 0);
    b.box(-0.42, 0.82, 0, 0.16, 0.16, 0.18, skin, 0);       // hands
    b.box(0.42, 0.82, 0, 0.16, 0.16, 0.18, skin, 0);
    b.box(0, 1.78, 0, 0.4, 0.44, 0.4, skin, 0);             // head
    b.box(0, 2.03, 0, 0.44, 0.12, 0.44, hair, 0);           // hair cap
    if (opts.vest) b.box(0, 1.24, 0, 0.68, 0.6, 0.4, 0x22262e, 0);   // armour vest
    if (opts.badge) b.box(0, 1.3, 0.2, 0.66, 0.5, 0.06, 0x2d4a7a, 0); // police chest panel
    const mesh = b.build(V.matLambert());
    mesh.matrixAutoUpdate = true;
    return mesh;
  }

  function makePlayer(G) {
    const mesh = makeHumanoid({ shirt: 0xc2255c, pants: 0x1d2030, skin: 0xc68863, hair: 0x14100e });
    G.city.scene.add(mesh);
    const p = {
      mesh: mesh, x: 6, z: -138, heading: Math.PI, speedNow: 0,
      health: 100, maxHealth: 100, armor: 0,
      cash: 120, rep: 0, loot: 0,
      inCar: null, walkPhase: 0, dead: false,
      mag: 12, reserve: 60, hasGun: true,
      missionIndex: 0, clockMin: 21 * 60,
    };
    mesh.position.set(p.x, 0, p.z);
    return p;
  }

  // On-foot movement: camera-relative WASD, Shift sprint, city collision.
  function updateOnFoot(G, dt, input, camYaw) {
    const p = G.player;
    if (p.inCar || p.dead) return;
    let mx = 0, mz = 0;
    if (input.up) mz += 1;
    if (input.down) mz -= 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    const moving = (mx !== 0 || mz !== 0);
    const sprint = input.sprint ? 1.55 : 1;
    if (moving) {
      const len = Math.sqrt(mx * mx + mz * mz);
      mx /= len; mz /= len;
      const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
      const wx = mx * cos - mz * sin;
      const wz = -mx * sin - mz * cos;
      const sp = 6.4 * sprint;
      const fixed = G.city.collide(p.x + wx * sp * dt, p.z + wz * sp * dt, 0.7);
      p.x = fixed[0]; p.z = fixed[1];
      p.heading = V.turnToward(p.heading, Math.atan2(wx, wz), dt * 12);
      p.walkPhase += dt * (input.sprint ? 13 : 9);
      p.speedNow = sp;
    } else {
      p.speedNow = 0;
      p.walkPhase = 0;
    }
    p.mesh.position.set(p.x, moving ? Math.abs(Math.sin(p.walkPhase)) * 0.09 : 0, p.z);
    p.mesh.rotation.y = p.heading;
    p.mesh.rotation.x = moving ? Math.sin(p.walkPhase) * 0.045 : 0;
  }

  function makeOdile(G) {
    const mesh = makeHumanoid({ shirt: 0xff4fa3, pants: 0x241428, skin: 0x8d5a3b, hair: 0x0e0a14 });
    const spot = G.city.spots.odile;
    mesh.position.set(spot.x - 3.4, 0, spot.z);
    mesh.rotation.y = Math.PI / 2;
    G.city.scene.add(mesh);
    return { mesh: mesh, x: spot.x - 3.4, z: spot.z, name: 'Odile Vane' };
  }

  V.jax = { makeHumanoid: makeHumanoid, makePlayer: makePlayer, updateOnFoot: updateOnFoot, makeOdile: makeOdile, SKINS: SKINS };
})(window.VAD);
