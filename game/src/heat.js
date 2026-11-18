// heat.js — the wanted system: heat points from witnessed crimes cool into
// 0–5 stars, police interceptors that hunt and ram, foot officers at high
// stars who shoot and make arrests, flashing light bars, and the BUSTED
// meter that fills when the law is close and you are slow.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  function starsFor(heatPts) {
    if (heatPts <= 0) return 0;
    return Math.min(5, 1 + Math.floor(heatPts / 55));
  }

  function onCrime(G, points, x, z) {
    // Crimes count double when a police unit is close enough to witness.
    let witnessed = false;
    for (let i = 0; i < G.police.length; i++) {
      if (V.dist2d(x, z, G.police[i].x, G.police[i].z) < 55) { witnessed = true; break; }
    }
    G.heatPts += witnessed ? points * 1.6 : points;
    G.lastCrimeAt = G.time;
    const s = starsFor(G.heatPts);
    if (s > G.wanted) {
      G.wanted = s;
      V.overlay.refreshHUD(G);
    }
  }

  function spawnInterceptor(G) {
    const p = G.player;
    const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
    // Spawn on a road roughly 100 m away, off-screen but close enough to hunt.
    const roads = G.city.roads;
    for (let tries = 0; tries < 8; tries++) {
      const vertical = G.rng() < 0.5;
      const road = roads[Math.floor(G.rng() * roads.length)];
      const along = V.clamp((vertical ? pz : px) + (G.rng() < 0.5 ? -105 : 105), -290, 290);
      const x = vertical ? road : along;
      const z = vertical ? along : road;
      if (V.dist2d(x, z, px, pz) < 70) continue;
      const car = V.motors.spawnCar(G, 'interceptor', x, z, 0, { role: 'police', cones: true });
      G.police.push(car);
      return car;
    }
    const car = V.motors.spawnCar(G, 'interceptor', px + 100, pz, 0, { role: 'police', cones: true });
    G.police.push(car);
    return car;
  }

  function updatePoliceCar(G, car, dt) {
    const p = G.player;
    const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
    const d = V.dist2d(car.x, car.z, px, pz);
    // Flash the light bar by alternating its material tint.
    if (car.barMesh) {
      const phase = Math.floor(G.time * 5 + car.id) % 2;
      car.barMesh.material.color.setHex(phase ? 0xff8888 : 0x88aaff);
    }
    if (car.dead) return;
    let targetSpeed = 0;
    const playerSlow = p.inCar ? Math.abs(p.inCar.speed) < 2 : true;
    const holdDistance = p.inCar ? 0 : 8.5; // pull up beside a runner, ram a driver
    if (d > holdDistance) {
      const desired = Math.atan2(px - car.x, pz - car.z);
      car.heading = V.turnToward(car.heading, desired, dt * 2.4);
      targetSpeed = car.spec.top * (0.82 + G.wanted * 0.045);
      if (d < 16) targetSpeed = Math.min(targetSpeed, 12);
    }
    car.speed = V.lerp(car.speed, targetSpeed, Math.min(1, dt * 1.8));
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    const fixed = G.city.collide(nx, nz, 1.7);
    car.x = fixed[0]; car.z = fixed[1];
    V.motors.syncMesh(car);
    // Ramming a moving player car.
    if (p.inCar && d < 3.6 && Math.abs(car.speed) > 6) {
      V.motors.damageCar(G, p.inCar, 4, false);
      V.combat.hurtPlayer(G, 1.5);
      car.speed *= 0.4;
      V.sound.crash();
    }
    // Parked-up unit beside an on-foot player releases its officer.
    if (!p.inCar && d < 10 && Math.abs(car.speed) < 1.5 && !car.officerOut && G.wanted >= 2) {
      car.officerOut = true;
      V.combat.spawnFighter(G, car.x + 2, car.z, { officer: true });
    }
    void playerSlow;
  }

  function updateHeat(G, dt) {
    // Desired strength follows the stars.
    const wantCars = G.wanted === 0 ? 0 : Math.min(5, G.wanted + (G.wanted >= 3 ? 1 : 0));
    const alive = G.police.filter(function (c) { return !c.dead; });
    if (alive.length < wantCars && G.time - (G.lastSpawnAt || 0) > 2.5) {
      G.lastSpawnAt = G.time;
      spawnInterceptor(G);
    }
    // Despawn far units when the heat is gone.
    if (G.wanted === 0) {
      for (let i = G.police.length - 1; i >= 0; i--) {
        const c = G.police[i];
        const px = G.player.inCar ? G.player.inCar.x : G.player.x;
        const pz = G.player.inCar ? G.player.inCar.z : G.player.z;
        if (V.dist2d(c.x, c.z, px, pz) > 60 || c.dead) {
          G.city.scene.remove(c.mesh);
          G.cars.splice(G.cars.indexOf(c), 1);
          G.police.splice(i, 1);
        }
      }
    }
    for (let i = 0; i < G.police.length; i++) updatePoliceCar(G, G.police[i], dt);
    // Foot officers at high stars arrive on foot near the action.
    if (G.wanted >= 4 && G.state === 'play') {
      const officers = G.thugs.filter(function (t) { return t.isOfficer && !t.dead; }).length;
      if (officers < G.wanted - 2 && Math.random() < dt * 0.25) {
        const px = G.player.inCar ? G.player.inCar.x : G.player.x;
        const pz = G.player.inCar ? G.player.inCar.z : G.player.z;
        V.combat.spawnFighter(G, px + (Math.random() - 0.5) * 50, pz + (Math.random() - 0.5) * 50, { officer: true });
      }
    }
    // Cooling off: no fresh crime and nobody close enough to see you.
    if (G.time - G.lastCrimeAt > 18 && G.heatPts > 0) {
      const px = G.player.inCar ? G.player.inCar.x : G.player.x;
      const pz = G.player.inCar ? G.player.inCar.z : G.player.z;
      let seen = false;
      for (let i = 0; i < G.police.length; i++) {
        if (V.dist2d(px, pz, G.police[i].x, G.police[i].z) < 46) { seen = true; break; }
      }
      if (!seen) {
        G.heatPts = Math.max(0, G.heatPts - dt * 4.2);
        const s = starsFor(G.heatPts);
        if (s !== G.wanted) { G.wanted = s; V.overlay.refreshHUD(G); }
      }
    }
    V.sound.sirenUpdate(G.wanted > 0 && alive.length > 0);
    // BUSTED meter.
    const p = G.player;
    let pressure = 0;
    if (!p.inCar) {
      for (let i = 0; i < G.thugs.length; i++) {
        const t = G.thugs[i];
        if (t.isOfficer && !t.dead && V.dist2d(p.x, p.z, t.x, t.z) < 3.4) pressure = Math.max(pressure, 34);
      }
      for (let i = 0; i < G.police.length; i++) {
        if (V.dist2d(p.x, p.z, G.police[i].x, G.police[i].z) < 5) pressure = Math.max(pressure, 20);
      }
    } else if (Math.abs(p.inCar.speed) < 2) {
      for (let i = 0; i < G.police.length; i++) {
        if (V.dist2d(p.inCar.x, p.inCar.z, G.police[i].x, G.police[i].z) < 7) pressure = Math.max(pressure, 24);
      }
    }
    if (pressure > 0) G.busted = Math.min(100, G.busted + pressure * dt);
    else G.busted = Math.max(0, G.busted - 16 * dt);
    if (G.busted >= 100 && G.state === 'play' && G.onBusted) G.onBusted();
  }

  function clearHeat(G) {
    G.heatPts = 0; G.wanted = 0; G.busted = 0;
    for (let i = G.police.length - 1; i >= 0; i--) {
      G.city.scene.remove(G.police[i].mesh);
      const at = G.cars.indexOf(G.police[i]);
      if (at >= 0) G.cars.splice(at, 1);
    }
    G.police.length = 0;
    for (let i = G.thugs.length - 1; i >= 0; i--) {
      if (G.thugs[i].isOfficer) {
        G.city.scene.remove(G.thugs[i].mesh);
        G.thugs.splice(i, 1);
      }
    }
    V.overlay.refreshHUD(G);
  }

  V.heat = { onCrime: onCrime, updateHeat: updateHeat, clearHeat: clearHeat, starsFor: starsFor, spawnInterceptor: spawnInterceptor };
})(window.VAD);
