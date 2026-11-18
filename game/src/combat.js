// combat.js — pistol combat for Velmara After Dark: mouse-aimed shooting
// with tracers and reloads, Q melee, thugs and officers who shoot back, loot
// drops the Pawn Star will buy, and the damage path that ends in WASTED.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  function makeTracerPool(G, n) {
    const pool = [];
    for (let i = 0; i < n; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0xffd76a, transparent: true, opacity: 0,
      }));
      line.frustumCulled = false;
      line.visible = false;
      G.city.scene.add(line);
      pool.push({ line: line, life: 0 });
    }
    return pool;
  }
  function fireTracer(G, ax, ay, az, bx, by, bz, color) {
    if (!G.tracers) G.tracers = makeTracerPool(G, 24);
    for (let i = 0; i < G.tracers.length; i++) {
      const t = G.tracers[i];
      if (t.life > 0) continue;
      const arr = t.line.geometry.attributes.position.array;
      arr[0] = ax; arr[1] = ay; arr[2] = az; arr[3] = bx; arr[4] = by; arr[5] = bz;
      t.line.geometry.attributes.position.needsUpdate = true;
      t.line.material.color.setHex(color || 0xffd76a);
      t.line.material.opacity = 0.9;
      t.line.visible = true;
      t.life = 0.07;
      return;
    }
  }
  function updateTracers(G, dt) {
    if (!G.tracers) return;
    for (let i = 0; i < G.tracers.length; i++) {
      const t = G.tracers[i];
      if (t.life <= 0) continue;
      t.life -= dt;
      if (t.life <= 0) { t.line.visible = false; t.line.material.opacity = 0; }
    }
  }

  function hurtPlayer(G, dmg) {
    const p = G.player;
    if (p.dead || G.state !== 'play') return;
    if (p.armor > 0) {
      const absorbed = Math.min(p.armor, dmg * 0.65);
      p.armor -= absorbed;
      dmg -= absorbed;
    }
    p.health -= dmg;
    if (p.health <= 0) {
      p.health = 0;
      if (G.onWasted) G.onWasted();
    }
  }

  function killFighter(G, f) {
    f.dead = true;
    f.mesh.rotation.x = -Math.PI / 2;
    f.mesh.position.y = 0.25;
    // Loot drop: a little gold crate the Pawn Star pays for.
    const b = new V.GeoBatch();
    b.box(0, 0.25, 0, 0.55, 0.5, 0.55, 0xd9a441, 0);
    const m = b.build(V.matBasic());
    m.matrixAutoUpdate = true;
    m.position.set(f.x, 0, f.z);
    G.city.scene.add(m);
    G.lootDrops.push({ x: f.x, z: f.z, mesh: m });
    if (G.onCrime) G.onCrime(18, f.x, f.z);
  }

  function spawnFighter(G, x, z, opts) {
    opts = opts || {};
    const mesh = V.jax.makeHumanoid({
      shirt: opts.officer ? 0x22345e : 0x2b2b33,
      pants: 0x14161f,
      vest: !!opts.officer,
      badge: !!opts.officer,
    });
    mesh.position.set(x, opts.y || 0, z);
    G.city.scene.add(mesh);
    const f = {
      mesh: mesh, x: x, z: z, heading: 0, hp: opts.officer ? 80 : 100,
      dead: false, isThug: !opts.officer, isOfficer: !!opts.officer,
      shootAt: G.time + 1 + Math.random() * 1.5, strafeDir: Math.random() < 0.5 ? 1 : -1,
      walkPhase: Math.random() * 6, speed: opts.static ? 0 : (opts.officer ? 3.6 : 3.1),
      yBase: opts.y || 0,
    };
    G.thugs.push(f);
    return f;
  }

  // Shared shooter AI for thugs and foot officers: close to range, strafe,
  // fire in bursts with distance-based accuracy.
  function updateFighters(G, dt) {
    const p = G.player;
    const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
    for (let i = 0; i < G.thugs.length; i++) {
      const f = G.thugs[i];
      if (f.dead) continue;
      const d = V.dist2d(f.x, f.z, px, pz);
      const want = f.isOfficer ? 9 : 14;
      let mx = 0, mz = 0;
      if (d > want + 2) { mx = (px - f.x) / d; mz = (pz - f.z) / d; }
      else if (d < want - 3) { mx = -(px - f.x) / d; mz = -(pz - f.z) / d; }
      else { // strafe around the player
        mx = (-(pz - f.z) / d) * f.strafeDir; mz = ((px - f.x) / d) * f.strafeDir;
        if (Math.random() < dt * 0.25) f.strafeDir *= -1;
      }
      if (mx || mz) {
        const fixed = G.city.collide(f.x + mx * f.speed * dt, f.z + mz * f.speed * dt, 0.6);
        f.x = fixed[0]; f.z = fixed[1];
        f.walkPhase += dt * 9;
      }
      f.heading = V.turnToward(f.heading, Math.atan2(px - f.x, pz - f.z), dt * 10);
      f.mesh.position.set(f.x, (f.yBase || 0) + Math.abs(Math.sin(f.walkPhase)) * 0.06, f.z);
      f.mesh.rotation.y = f.heading;
      if (d < 34 && G.time >= f.shootAt && G.state === 'play') {
        f.shootAt = G.time + 0.9 + Math.random() * 1.1;
        V.sound.enemyShot();
        const spread = 1.1 + d * 0.05;
        const tx = px + (Math.random() - 0.5) * spread;
        const tz = pz + (Math.random() - 0.5) * spread;
        fireTracer(G, f.x, 1.45, f.z, tx, 1.1, tz, 0xff9d5c);
        const hitChance = Math.max(0.12, 0.62 - d * 0.013);
        if (Math.random() < hitChance) {
          if (p.inCar) V.motors.damageCar(G, p.inCar, 2.5, false);
          hurtPlayer(G, 3 + Math.random() * 4);
        }
      }
    }
    // Loot pickup on foot.
    if (!p.inCar) {
      for (let i = G.lootDrops.length - 1; i >= 0; i--) {
        const drop = G.lootDrops[i];
        drop.mesh.rotation.y += dt * 2;
        if (V.dist2d(p.x, p.z, drop.x, drop.z) < 1.6) {
          p.loot += 1;
          p.cash += 10;
          G.city.scene.remove(drop.mesh);
          G.lootDrops.splice(i, 1);
          V.overlay.toast('Picked up loot — Pawn Star pays cash for it');
        }
      }
    }
  }

  // The player's pistol. Aim follows the camera; the closest fighter, officer
  // or civilian inside the aim cone takes the hit.
  function playerShoot(G) {
    const p = G.player;
    if (p.inCar || p.dead || !p.hasGun) return false;
    if (G.reloadUntil && G.time < G.reloadUntil) return false;
    if (p.mag <= 0) { reload(G); return false; }
    p.mag -= 1;
    V.sound.shot();
    G.lastShotAt = G.time; G.lastShotX = p.x; G.lastShotZ = p.z;
    const dir = G.camDir || { x: Math.sin(p.heading), z: Math.cos(p.heading) };
    const ox = p.x, oz = p.z;
    let best = null, bestScore = 0.94; // cos of the aim cone
    const candidates = G.thugs.concat(G.peds);
    for (let i = 0; i < candidates.length; i++) {
      const t = candidates[i];
      if (t.dead) continue;
      const dx = t.x - ox, dz = t.z - oz;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > 58 || d < 0.5) continue;
      const dot = (dx * dir.x + dz * dir.z) / d;
      if (dot > bestScore) { bestScore = dot; best = t; }
    }
    let hx = ox + dir.x * 46, hz = oz + dir.z * 46;
    if (best) {
      hx = best.x; hz = best.z;
      best.hp -= 34;
      if (best.isThug || best.isOfficer) {
        if (best.hp <= 0) killFighter(G, best);
        if (G.onCrime) G.onCrime(best.isOfficer ? 26 : 10, best.x, best.z);
      } else {
        if (best.hp <= 0) { best.dead = true; best.mesh.rotation.x = -Math.PI / 2; best.mesh.position.y = 0.25; }
        else { best.state = 'flee'; best.fleeUntil = G.time + 4; }
        if (G.onCrime) G.onCrime(30, best.x, best.z);
      }
    } else if (G.onCrime) {
      G.onCrime(4, ox, oz); // shots fired still draw attention
    }
    fireTracer(G, ox - dir.z * 0.3, 1.42, oz + dir.x * 0.3, hx, 1.15, hz, 0xffe28a);
    if (p.mag <= 0) reload(G);
    V.overlay.refreshHUD(G);
    return true;
  }

  function reload(G) {
    const p = G.player;
    if (p.mag >= 12 || G.reloadUntil && G.time < G.reloadUntil) return;
    const need = 12 - p.mag;
    const take = Math.min(need, p.reserve);
    if (take <= 0 && p.reserve <= 0) {
      // Bottomless street supply keeps the game moving; shops sell speed.
      p.reserve = 48;
    }
    G.reloadUntil = G.time + 0.9;
    setTimeout(function () {
      const takeNow = Math.min(12 - p.mag, p.reserve);
      p.mag += takeNow; p.reserve -= takeNow;
      V.overlay.refreshHUD(G);
    }, 900);
  }

  function melee(G) {
    const p = G.player;
    if (p.inCar || p.dead) return false;
    const all = G.thugs.concat(G.peds);
    for (let i = 0; i < all.length; i++) {
      const t = all[i];
      if (t.dead) continue;
      if (V.dist2d(p.x, p.z, t.x, t.z) < 2.4) {
        t.hp -= 55;
        t.x += (t.x - p.x) * 0.4; t.z += (t.z - p.z) * 0.4;
        V.sound.crash();
        if (t.hp <= 0) {
          if (t.isThug || t.isOfficer) killFighter(G, t);
          else { t.dead = true; t.mesh.rotation.x = -Math.PI / 2; t.mesh.position.y = 0.25; }
          if (G.onCrime) G.onCrime(22, t.x, t.z);
        } else if (!t.isThug && !t.isOfficer) {
          t.state = 'flee'; t.fleeUntil = G.time + 4;
          if (G.onCrime) G.onCrime(16, t.x, t.z);
        }
        return true;
      }
    }
    return false;
  }

  V.combat = {
    hurtPlayer: hurtPlayer, spawnFighter: spawnFighter, updateFighters: updateFighters,
    playerShoot: playerShoot, reload: reload, melee: melee,
    fireTracer: fireTracer, updateTracers: updateTracers, killFighter: killFighter,
  };
})(window.VAD);
