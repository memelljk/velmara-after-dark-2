// motors.js — every vehicle in Velmara: merged-shell car factory (one body
// mesh + one lamp mesh per car), arcade driving with handbrake drift and
// damage smoke, traffic AI that cruises the road grid, brakes for obstacles
// and flees gunfire, plus the parked cars waiting to be stolen.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  const TYPES = {
    orphee: { name: 'Orphee GT', len: 4.6, wid: 2.0, top: 46, accel: 26, grip: 3.4, price: 0 },
    coupe: { name: 'Velmara Coupe', len: 4.4, wid: 1.9, top: 40, accel: 22, grip: 3.1, price: 0 },
    sedan: { name: 'Harborline Sedan', len: 4.7, wid: 1.95, top: 36, accel: 19, grip: 2.9, price: 0 },
    pickup: { name: 'Dockmaster Pickup', len: 5.1, wid: 2.1, top: 34, accel: 18, grip: 2.7, price: 0 },
    van: { name: 'Market Van', len: 5.3, wid: 2.1, top: 31, accel: 16, grip: 2.5, price: 0 },
    interceptor: { name: 'VPD Interceptor', len: 4.8, wid: 2.0, top: 48, accel: 27, grip: 3.3, price: 0 },
  };
  const PAINTS = [0xc2255c, 0x2255c2, 0x22a06b, 0xd9a441, 0x8a93a6, 0x5c2d91, 0xb03a2e, 0x2e86ab, 0xe8e8f0, 0x1c1e26];

  // One car = one vertex-coloured body mesh (shell, cabin, wheels, trim all
  // baked together) + one unlit lamp mesh (headlights, tail lights, and the
  // police light bar when fitted). Headlight cones, when fitted, use the
  // proven recipe: fog:false, opacity 0.04, FrontSide, no depth write — as a
  // plain material they render as opaque grey blobs.
  function buildCarMesh(typeKey, paint, isPolice) {
    const t = TYPES[typeKey];
    const body = new V.GeoBatch();
    const lamp = new V.GeoBatch();
    const L = t.len, W = t.wid;
    body.box(0, 0.55, 0, W, 0.62, L, paint, 0);                              // shell
    body.box(0, 0.32, L * 0.30, W * 0.94, 0.28, L * 0.22, V.shade(paint, 0.8), 0); // nose
    if (typeKey === 'pickup') {
      body.box(0, 1.05, -L * 0.18, W * 0.92, 0.55, L * 0.34, V.shade(paint, 0.92), 0); // cab
      body.box(0, 0.86, L * 0.22, W * 0.94, 0.3, L * 0.4, V.shade(paint, 0.7), 0);     // bed walls
    } else if (typeKey === 'van') {
      body.box(0, 1.12, L * 0.05, W * 0.96, 1.05, L * 0.78, V.shade(paint, 0.95), 0);
    } else {
      body.box(0, 1.02, -L * 0.04, W * 0.78, 0.5, L * 0.44, 0x14161f, 0);     // glasshouse
      body.box(0, 1.06, -L * 0.04, W * 0.8, 0.1, L * 0.46, V.shade(paint, 0.9), 0); // roof skin
    }
    if (typeKey === 'orphee') body.box(0, 0.95, -L * 0.48, W * 0.9, 0.14, 0.3, 0x14161f, 0); // spoiler
    if (isPolice) {
      body.box(0, 0.56, 0, W * 1.01, 0.4, L * 0.5, 0xf2f4f8, 0);              // white doors band
    }
    const wz = L * 0.32, wx = W * 0.48;
    [[-wx, wz], [wx, wz], [-wx, -wz], [wx, -wz]].forEach(function (p) {
      body.box(p[0], 0.36, p[1], 0.28, 0.72, 0.72, 0x0c0d12, 0);              // wheels
    });
    lamp.box(-W * 0.32, 0.62, L / 2 + 0.02, 0.42, 0.2, 0.06, 0xfff2b0, 0);    // headlights
    lamp.box(W * 0.32, 0.62, L / 2 + 0.02, 0.42, 0.2, 0.06, 0xfff2b0, 0);
    lamp.box(-W * 0.32, 0.62, -L / 2 - 0.02, 0.42, 0.18, 0.06, 0xff3040, 0);  // tail lights
    lamp.box(W * 0.32, 0.62, -L / 2 - 0.02, 0.42, 0.18, 0.06, 0xff3040, 0);
    if (isPolice) {
      // Light bar halves ride in their own small batch so heat.js can flash
      // them by swapping the mesh's material colour.
      const bar = new V.GeoBatch();
      bar.box(-0.3, 1.36, -L * 0.04, 0.55, 0.18, 0.8, 0xff2d2d, 0);
      bar.box(0.3, 1.36, -L * 0.04, 0.55, 0.18, 0.8, 0x2d6bff, 0);
      var barMesh = bar.build(V.matBasic());
    }
    const group = new THREE.Group();
    const bodyMesh = body.build(V.matLambert());
    bodyMesh.matrixAutoUpdate = true;
    group.add(bodyMesh);
    const lampMesh = lamp.build(V.matBasic());
    lampMesh.matrixAutoUpdate = true;
    group.add(lampMesh);
    if (barMesh) group.add(barMesh);
    return { group: group, barMesh: barMesh || null };
  }

  function headlightCone() {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffeeb8, transparent: true, opacity: 0.04,
      fog: false, side: THREE.FrontSide, depthWrite: false,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 9, 12, 1, true), mat);
    cone.rotation.x = Math.PI / 2 + 0.06;
    cone.position.set(0, 0.62, 6.4);
    return cone;
  }

  let nextId = 1;
  function spawnCar(G, typeKey, x, z, heading, opts) {
    opts = opts || {};
    const isPolice = typeKey === 'interceptor';
    const paint = opts.paint !== undefined ? opts.paint : (isPolice ? 0x23242e : PAINTS[Math.floor(G.rng() * PAINTS.length)]);
    const built = buildCarMesh(typeKey, paint, isPolice);
    const group = built.group;
    if (opts.cones) { group.add(headlightCone()); }
    group.position.set(x, 0, z);
    group.rotation.y = heading;
    G.city.scene.add(group);
    const car = {
      id: nextId++, type: typeKey, spec: TYPES[typeKey], paint: paint,
      mesh: group, barMesh: built.barMesh,
      x: x, z: z, heading: heading, speed: 0, steer: 0,
      health: 100, role: opts.role || 'parked',
      axis: opts.axis || 'v', dir: opts.dir || 1, lane: opts.lane || 0, pos: opts.pos || 0,
      cruise: 9 + G.rng() * 6, honkAt: 0, dead: false, smokeRate: 0,
      driverSeat: null,
    };
    G.cars.push(car);
    return car;
  }

  // Traffic: 24 cars cruising the grid; parked: 16 cars at the kerb.
  function seedTraffic(G) {
    const typeKeys = ['sedan', 'coupe', 'orphee', 'pickup', 'van'];
    const roads = G.city.roads;
    for (let i = 0; i < 24; i++) {
      const vertical = G.rng() < 0.5;
      const road = roads[Math.floor(G.rng() * roads.length)];
      const dir = G.rng() < 0.5 ? 1 : -1;
      const laneOff = dir > 0 ? 5 : -5;
      const along = -280 + G.rng() * 560;
      const x = vertical ? road + laneOff : along;
      const z = vertical ? along : road + laneOff;
      const heading = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      const car = spawnCar(G, typeKeys[Math.floor(G.rng() * typeKeys.length)], x, z, heading, {
        role: 'traffic', axis: vertical ? 'v' : 'h', dir: dir,
        lane: road + laneOff, pos: along, cones: i % 3 === 0,
      });
      car.speed = car.cruise;
    }
    for (let i = 0; i < 16; i++) {
      const vertical = G.rng() < 0.5;
      const road = roads[Math.floor(G.rng() * roads.length)];
      const side = G.rng() < 0.5 ? -8.6 : 8.6;
      const along = -270 + G.rng() * 540;
      const x = vertical ? road + side : along;
      const z = vertical ? along : road + side;
      if (G.city.hitsCollider(x, z, 3)) continue;
      const heading = vertical ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      spawnCar(G, typeKeys[Math.floor(G.rng() * typeKeys.length)], x, z, heading, { role: 'parked' });
    }
  }

  function nearestCar(G, x, z, maxDist) {
    let best = null, bd = maxDist;
    for (let i = 0; i < G.cars.length; i++) {
      const c = G.cars[i];
      if (c.dead) continue;
      const d = V.dist2d(x, z, c.x, c.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  // Shared smoke pool: points start BELOW ground (y = -60) so unused slots
  // never pile up visibly at the origin.
  function makeSmoke(G) {
    const N = 240;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = 0; pos[i * 3 + 1] = -60; pos[i * 3 + 2] = 0; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x777d8c, size: 1.6, transparent: true, opacity: 0.5, depthWrite: false,
    }));
    G.city.scene.add(pts);
    return { pts: pts, geo: geo, vel: new Float32Array(N * 3), life: new Float32Array(N), next: 0, N: N };
  }
  function puff(G, x, y, z, spread) {
    const s = G.smoke; if (!s) return;
    const i = s.next; s.next = (s.next + 1) % s.N;
    const arr = s.geo.attributes.position.array;
    arr[i * 3] = x + (Math.random() - 0.5) * spread;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = z + (Math.random() - 0.5) * spread;
    s.vel[i * 3] = (Math.random() - 0.5) * 0.6;
    s.vel[i * 3 + 1] = 2.2 + Math.random() * 1.6;
    s.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    s.life[i] = 1.4;
  }
  function updateSmoke(G, dt) {
    const s = G.smoke; if (!s) return;
    const arr = s.geo.attributes.position.array;
    for (let i = 0; i < s.N; i++) {
      if (s.life[i] <= 0) continue;
      s.life[i] -= dt;
      if (s.life[i] <= 0) { arr[i * 3 + 1] = -60; continue; }
      arr[i * 3] += s.vel[i * 3] * dt;
      arr[i * 3 + 1] += s.vel[i * 3 + 1] * dt;
      arr[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
    }
    s.geo.attributes.position.needsUpdate = true;
  }

  function damageCar(G, car, amount, crime) {
    if (car.dead) return;
    car.health -= amount;
    if (car.health <= 0) {
      car.health = 0; car.dead = true; car.speed = 0;
      for (let i = 0; i < 8; i++) puff(G, car.x, 1, car.z, 2);
    }
    if (crime && G.onCrime) G.onCrime(6, car.x, car.z);
  }

  // Arcade driving for the player's car.
  function drivePlayer(G, car, input, dt) {
    const spec = car.spec;
    const fwd = input.up ? 1 : 0, back = input.down ? 1 : 0;
    if (fwd) car.speed += spec.accel * dt * (1 - Math.max(0, car.speed) / spec.top);
    if (back) {
      if (car.speed > 0.6) car.speed -= 34 * dt;
      else car.speed = Math.max(car.speed - 12 * dt, -11);
    }
    if (!fwd && !back) {
      car.speed -= car.speed * 0.55 * dt;
      if (Math.abs(car.speed) < 0.04) car.speed = 0;
    }
    car.speed -= car.speed * Math.abs(car.speed) * 0.006 * dt * 10; // drag
    const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    car.steer = V.lerp(car.steer, steerTarget, Math.min(1, dt * 8));
    const spd = car.speed;
    if (Math.abs(spd) > 0.2) {
      const turn = car.steer * spec.grip * dt * V.clamp(Math.abs(spd) / 9, 0.25, 1) * (spd >= 0 ? 1 : -1);
      car.heading += turn * (input.handbrake ? 1.65 : 1);
      if (input.handbrake) car.speed -= car.speed * 0.9 * dt;
    }
    const nx = car.x + Math.sin(car.heading) * spd * dt;
    const nz = car.z + Math.cos(car.heading) * spd * dt;
    const fixed = G.city.collide(nx, nz, 1.7);
    if (Math.abs(fixed[0] - nx) > 0.01 || Math.abs(fixed[1] - nz) > 0.01) {
      if (Math.abs(spd) > 9) { damageCar(G, car, Math.abs(spd) * 0.55, false); V.sound.crash(); }
      car.speed *= -0.25;
    }
    car.x = fixed[0]; car.z = fixed[1];
    // Soft car-to-car pushes.
    for (let i = 0; i < G.cars.length; i++) {
      const o = G.cars[i];
      if (o === car || o.dead) continue;
      const d = V.dist2d(car.x, car.z, o.x, o.z);
      if (d < 3.4 && d > 0.001) {
        const push = (3.4 - d) * 0.5;
        const ux = (o.x - car.x) / d, uz = (o.z - car.z) / d;
        o.x += ux * push; o.z += uz * push;
        if (Math.abs(spd) > 10) {
          damageCar(G, o, 6, true);
          damageCar(G, car, 3, false);
          V.sound.crash();
          if (o.role === 'traffic') { o.fleeUntil = G.time + 5; }
        }
      }
    }
    syncMesh(car);
    if (car.health < 45 && Math.random() < dt * 6) puff(G, car.x, 1.1, car.z, 0.7);
  }

  function syncMesh(car) {
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  }

  // Traffic update: follow the lane, brake for obstacles, turn at junctions,
  // flee when shots were recently fired nearby.
  function updateTraffic(G, car, dt) {
    if (car.role !== 'traffic' || car.dead) return;
    let target = car.cruise;
    const fx = car.x + Math.sin(car.heading) * 11, fz = car.z + Math.cos(car.heading) * 11;
    // Obstacle scan ahead.
    let blocked = false;
    for (let i = 0; i < G.cars.length; i++) {
      const o = G.cars[i];
      if (o === car) continue;
      if (V.dist2d(fx, fz, o.x, o.z) < 6.5) { blocked = true; break; }
    }
    if (!blocked && G.player && !G.player.inCar) {
      if (V.dist2d(fx, fz, G.player.x, G.player.z) < 5) blocked = true;
    }
    if (blocked) target = 0;
    if (car.fleeUntil && car.fleeUntil > G.time) target = car.cruise * 1.9;
    if (G.lastShotAt && G.time - G.lastShotAt < 2.5 && V.dist2d(car.x, car.z, G.lastShotX, G.lastShotZ) < 42) {
      target = car.cruise * 1.8;
    }
    car.speed = V.lerp(car.speed, target, Math.min(1, dt * (target < car.speed ? 5 : 1.4)));
    car.pos += car.speed * car.dir * dt;
    // Junction turns.
    const roads = G.city.roads;
    for (let i = 0; i < roads.length; i++) {
      const cross = roads[i];
      const along = car.axis === 'v' ? car.x : car.z; // perpendicular coord is the lane
      const atCross = car.axis === 'v' ? Math.abs(car.pos - cross) : Math.abs(car.pos - cross);
      if (atCross < Math.abs(car.speed * car.dir * dt) + 0.4 && Math.abs((car.axis === 'v' ? car.lane : car.lane) - cross) > 1) {
        if (G.rng() < 0.3) {
          const oldLane = car.lane;
          const newDir = G.rng() < 0.5 ? 1 : -1;
          const newAxis = car.axis === 'v' ? 'h' : 'v';
          car.axis = newAxis; car.dir = newDir;
          car.pos = oldLane;
          car.lane = cross + (newDir > 0 ? 5 : -5);
          break;
        }
      }
    }
    if (car.pos > 300) { car.pos = -300; }
    if (car.pos < -300) { car.pos = 300; }
    if (car.axis === 'v') { car.x = car.lane; car.z = car.pos; }
    else { car.x = car.pos; car.z = car.lane; }
    const targetHeading = car.axis === 'v'
      ? (car.dir > 0 ? 0 : Math.PI)
      : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    car.heading = V.turnToward(car.heading, targetHeading, dt * 3.2);
    syncMesh(car);
  }

  V.motors = {
    TYPES: TYPES, PAINTS: PAINTS,
    spawnCar: spawnCar, seedTraffic: seedTraffic, nearestCar: nearestCar,
    makeSmoke: makeSmoke, puff: puff, updateSmoke: updateSmoke,
    damageCar: damageCar, drivePlayer: drivePlayer, updateTraffic: updateTraffic,
    syncMesh: syncMesh,
  };
})(window.VAD);
