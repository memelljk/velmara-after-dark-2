// crowd.js — Velmara's pedestrians: thirty citizens who stroll the
// sidewalks, hurry away from gunfire and car horns, and can be robbed at
// gunpoint (which the police notice). Each is one merged humanoid mesh.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  const SHIRTS = [0x7a4a8c, 0x3f7d5c, 0xb0653a, 0x4a6ea5, 0xa53a5c, 0x6e7d3a, 0x8c8f9e, 0x5c7d9e, 0xd9c9a8, 0x37474f];

  function spawnPeds(G, count) {
    const roads = G.city.roads;
    for (let i = 0; i < count; i++) {
      const shirt = SHIRTS[Math.floor(G.rng() * SHIRTS.length)];
      const mesh = V.jax.makeHumanoid({ shirt: shirt }); // pants default from shirt
      const road = roads[Math.floor(G.rng() * roads.length)];
      const vertical = G.rng() < 0.5;
      const side = G.rng() < 0.5 ? -13.2 : 13.2;
      const along = -270 + G.rng() * 540;
      const x = vertical ? road + side : along;
      const z = vertical ? along : road + side;
      mesh.position.set(x, 0, z);
      G.city.scene.add(mesh);
      G.peds.push({
        mesh: mesh, x: x, z: z, heading: G.rng() * Math.PI * 2,
        tx: x, tz: z, speed: 1.5 + G.rng() * 1.1, walkPhase: G.rng() * 6,
        state: 'stroll', fleeUntil: 0, robbedAt: -99, dead: false, hp: 100,
        isThug: false, isOfficer: false,
      });
    }
  }

  function pickTarget(G, ped) {
    const roads = G.city.roads;
    const road = roads[Math.floor(G.rng() * roads.length)];
    const vertical = G.rng() < 0.5;
    const side = G.rng() < 0.5 ? -13.2 : 13.2;
    const along = -280 + G.rng() * 560;
    ped.tx = vertical ? road + side : along;
    ped.tz = vertical ? along : road + side;
  }

  function updatePeds(G, dt) {
    const p = G.player;
    for (let i = 0; i < G.peds.length; i++) {
      const ped = G.peds[i];
      if (ped.dead || ped.isThug || ped.isOfficer) continue;
      let speed = ped.speed;
      // Flee gunfire and nearby mayhem.
      if (G.lastShotAt && G.time - G.lastShotAt < 3 && V.dist2d(ped.x, ped.z, G.lastShotX, G.lastShotZ) < 30) {
        ped.state = 'flee'; ped.fleeUntil = G.time + 3;
      }
      if (ped.state === 'flee') {
        if (G.time > ped.fleeUntil) { ped.state = 'stroll'; pickTarget(G, ped); }
        else {
          const away = Math.atan2(ped.x - G.lastShotX, ped.z - G.lastShotZ);
          ped.tx = ped.x + Math.sin(away) * 18;
          ped.tz = ped.z + Math.cos(away) * 18;
          speed = 4.6;
        }
      }
      const dx = ped.tx - ped.x, dz = ped.tz - ped.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < 1.2) { if (ped.state === 'stroll') pickTarget(G, ped); continue; }
      const vx = dx / d, vz = dz / d;
      const fixed = G.city.collide(ped.x + vx * speed * dt, ped.z + vz * speed * dt, 0.6);
      ped.x = fixed[0]; ped.z = fixed[1];
      ped.heading = V.turnToward(ped.heading, Math.atan2(vx, vz), dt * 8);
      ped.walkPhase += dt * 8;
      ped.mesh.position.set(ped.x, Math.abs(Math.sin(ped.walkPhase)) * 0.07, ped.z);
      ped.mesh.rotation.y = ped.heading;
    }
  }

  // Rob the nearest pedestrian at gunpoint: cash, a little rep, one star.
  function robNearest(G) {
    const p = G.player;
    let best = null, bd = 4.2;
    for (let i = 0; i < G.peds.length; i++) {
      const ped = G.peds[i];
      if (ped.dead || ped.isThug || ped.isOfficer) continue;
      const d = V.dist2d(p.x, p.z, ped.x, ped.z);
      if (d < bd) { bd = d; best = ped; }
    }
    if (!best) return false;
    const take = 15 + Math.floor(G.rng() * 45);
    p.cash += take;
    best.state = 'flee'; best.fleeUntil = G.time + 4;
    best.tx = best.x + (best.x - p.x) * 4; best.tz = best.z + (best.z - p.z) * 4;
    if (G.onCrime) G.onCrime(14, best.x, best.z);
    V.overlay.toast('Robbed $' + take + ' — the street talks, the police listen');
    return true;
  }

  V.crowd = { spawnPeds: spawnPeds, updatePeds: updatePeds, robNearest: robNearest, pickTarget: pickTarget };
})(window.VAD);
