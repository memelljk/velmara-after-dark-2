// shotrig.js — deterministic screenshot poses for ?shot=<scene>&seed=7.
// Real-time simulation runs at a fraction of real time in headless Chrome,
// so scenes are POSED, not played: cars, cruisers with lit light bars,
// wanted stars, HUD state and camera are all set directly, then the normal
// render loop draws the frame Chrome captures. No pixel editing anywhere.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  function getShot() {
    const q = new URLSearchParams(location.search);
    return q.get('shot');
  }

  function baseSetup(G) {
    const p = G.player;
    p.cash = 2450; p.rep = 320; p.health = 100; p.maxHealth = 100; p.armor = 40;
    p.clockMin = 21 * 60 + 40;
    G.campaign.phase = 'run'; // keep the meet-Odile objective from overriding ours
  }
  function setObjective(G, title, sub, x, z, timer) {
    G.objective = { title: title, sub: sub, x: x, z: z, timer: timer || null, color: 0xffd76a };
  }
  function park(G, car, x, z, heading, speed) {
    car.x = x; car.z = z; car.heading = heading; car.speed = speed || 0;
    V.motors.syncMesh(car);
    return car;
  }

  const POSES = {
    // 1-cover: pink Orphee GT driving the Neon Mile in rain, traffic ahead,
    // FIRST PARCEL banner, full HUD, radio name on.
    cover: function (G) {
      baseSetup(G);
      const p = G.player;
      const car = V.motors.spawnCar(G, 'orphee', 5, -92, Math.PI, { role: 'player', paint: 0xff4fa3, cones: true });
      park(G, car, 5, -92, Math.PI, 14);
      p.inCar = car; p.mesh.visible = false;
      park(G, V.motors.spawnCar(G, 'sedan', -5, -128, Math.PI, { role: 'traffic', cones: true }), -5, -128, Math.PI, 10);
      park(G, V.motors.spawnCar(G, 'coupe', 5, -158, Math.PI, { role: 'traffic' }), 5, -158, Math.PI, 10);
      park(G, V.motors.spawnCar(G, 'van', -5, -66, 0, { role: 'traffic' }), -5, -66, 0, 8);
      setObjective(G, 'First Parcel', 'Deliver the parcel to the Neon Mile drop', 26, -120, null);
      G.shotCam = { x: 5, y: 4.4, z: -74, lx: 5, ly: 1.4, lz: -110 };
    },
    // 2-chase: player coupe at speed, FOUR cruisers behind with lit bars, an
    // officer on the sidewalk, 4 stars, Lose the police objective.
    chase: function (G) {
      baseSetup(G);
      const p = G.player;
      const car = V.motors.spawnCar(G, 'coupe', 125, 30, Math.PI, { role: 'player', paint: 0x2255c2, cones: true });
      park(G, car, 125, 30, Math.PI, 24);
      p.inCar = car; p.mesh.visible = false;
      const spots = [[122, 48], [129, 60], [121, 74], [128, 88]];
      spots.forEach(function (s) {
        const cop = V.motors.spawnCar(G, 'interceptor', s[0], s[1], Math.PI, { role: 'police', cones: true });
        park(G, cop, s[0], s[1], Math.PI, 22);
        G.police.push(cop);
      });
      const officer = V.combat.spawnFighter(G, 134, 44, { officer: true, static: true });
      officer.heading = -Math.PI / 2;
      officer.mesh.rotation.y = -Math.PI / 2;
      G.wanted = 4; G.heatPts = 200;
      setObjective(G, 'Lose the Police', 'Break line of sight and let the heat cool', 125, -40, null);
      G.shotCam = { x: 125, y: 3.6, z: 12, lx: 125, ly: 1.2, lz: 60 };
    },
    // 3-onfoot: Jax in the Old Market among stalls and pedestrians, Odile's
    // dialogue open, a shop marker by the noodle stall, ammo on the HUD.
    onfoot: function (G) {
      baseSetup(G);
      const p = G.player;
      p.x = -176; p.z = 47; p.heading = 0.6; p.mag = 12; p.reserve = 60;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
      // Bring a handful of pedestrians into the plaza.
      for (let i = 0; i < 6 && i < G.peds.length; i++) {
        const ped = G.peds[i];
        ped.x = -186 + i * 6; ped.z = 44 + (i % 3) * 9;
        ped.mesh.position.set(ped.x, 0, ped.z);
      }
      // A market food stall fronts as the visible shop: sign + marker ring.
      const sign = V.neonSign('NOODLE 9', '#ff9d5c', 8, 2);
      sign.position.set(-180, 4.6, 41.2); // south face of the stall, lettering outward toward the plaza
      sign.rotation.y = 0;
      G.city.scene.add(sign);
      const ring = new V.GeoBatch();
      ring.flat(-180, 0.1, 44, 4.4, 4.4, 0xff9d5c);
      const ringMesh = ring.build(V.matBasic());
      G.city.scene.add(ringMesh);
      setObjective(G, 'First Parcel', 'Pick up the parcel at the stall', -180, 62, null);
      V.overlay.showDialogue([
        ['Odile Vane', 'Jax — stall row, red awnings, the noodle counter. The parcel is under it. Take it, and try not to drip on the merchandise.'],
      ], function () {});
      G.shotCam = { x: -166, y: 3.1, z: 33, lx: -181, ly: 1.4, lz: 55 };
    },
    // 4-mission: Dockmaster Pickup on the harbour run, Nine Minutes to Dock
    // Nine with ~96 s left and the drop ~47 m out, TATTOO sign ahead,
    // oncoming traffic crossing the frame.
    mission: function (G) {
      baseSetup(G);
      const p = G.player;
      p.clockMin = 22 * 60 + 5;
      const truck = V.motors.spawnCar(G, 'pickup', 118, 222, 0.77, { role: 'player', paint: 0xd9a441, cones: true });
      park(G, truck, 118, 222, 0.77, 12);
      p.inCar = truck; p.mesh.visible = false;
      park(G, V.motors.spawnCar(G, 'sedan', 168, 246, -Math.PI / 2, { role: 'traffic', cones: true }), 168, 246, -Math.PI / 2, 9);
      park(G, V.motors.spawnCar(G, 'van', 84, 252, Math.PI / 2, { role: 'traffic' }), 84, 252, Math.PI / 2, 7);
      setObjective(G, 'Nine Minutes to Dock Nine', 'Deliver the cargo to Dock Nine', 150, 255, 96);
      G.shotCam = { x: 106, y: 4.6, z: 206, lx: 140, ly: 2, lz: 248 };
    },
  };

  function applyShot(G, name) {
    const pose = POSES[name];
    if (!pose) return false;
    pose(G);
    V.overlay.refreshHUD(G);
    V.overlay.refreshObjective(G);
    return true;
  }

  V.shotrig = { getShot: getShot, applyShot: applyShot };
})(window.VAD);
