// darkrun.js — boot, states and the main loop for Velmara After Dark.
// States: title -> play <-> pause / shop / dialogue / bigmap -> endcard.
// The frame dt is clamped BOTH ways (min 1/240, max 0.05) so a stalled tab
// can never teleport the world, and headless captures stay stable.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed') || 7) || 7;
  const shotName = V.shotrig.getShot();

  const city = V.buildCity(seed);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('stage').appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(6, 4, -120);

  const G = {
    city: city, renderer: renderer, camera: camera,
    rng: V.mulberry32(seed * 7919 + 13),
    time: 0, state: 'title',
    cars: [], peds: [], thugs: [], police: [], lootDrops: [], tracers: null,
    heatPts: 0, wanted: 0, busted: 0, lastCrimeAt: -99, lastSpawnAt: 0,
    lastShotAt: -99, lastShotX: 0, lastShotZ: 0,
    objective: null, campaign: null, player: null, odile: null, smoke: null,
    camYaw: Math.PI, camPitch: 0.32, camDir: { x: 0, z: -1 },
    shopOpen: false, mapOpen: false, shotMode: false, shotCam: null,
    endAt: 0, hudAt: 0, mapAt: 0,
    onCrime: null, onWasted: null, onBusted: null,
  };
  G.onCrime = function (pts, x, z) { V.heat.onCrime(G, pts, x, z); };
  G.campaign = V.campaign.makeRuntime();
  G.player = V.jax.makePlayer(G);
  G.odile = V.jax.makeOdile(G);
  V.motors.seedTraffic(G);
  // A starter sedan always waits by the Neon Mile kerb (deterministic spawn).
  V.motors.spawnCar(G, 'sedan', 8.6, -118, 0, { role: 'parked', paint: 0x8a93a6 });
  V.crowd.spawnPeds(G, 30);
  G.smoke = V.motors.makeSmoke(G);
  window.__game = G;
  window.__counts = {
    buildings: city.buildings.length, streetlights: city.lights.length,
    missions: V.campaign.MISSIONS.length, shops: city.shops.length,
    safehouses: city.safehouses.length, stations: V.sound.STATIONS.length,
    districts: city.districts.length,
    vehicles: 0, pedestrians: 0, drawObjects: 0,
  };

  // Objective world marker: a light beam + ground ring at the target.
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.5, depthWrite: false });
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 26, 10, 1, true), markerMat);
  marker.visible = false;
  city.scene.add(marker);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.9, 28), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  city.scene.add(ring);

  // Side-earner beacons: race start (east avenue) and courier desk (market).
  const RACE_SPOT = { x: 126, z: -6 };
  const COURIER_SPOT = { x: -150, z: 100 };

  // ---- input -----------------------------------------------------------------
  const keys = {};
  let mouseDown = false;
  const input = {
    get up() { return !!(keys.KeyW || keys.ArrowUp); },
    get down() { return !!(keys.KeyS || keys.ArrowDown); },
    get left() { return !!(keys.KeyA || keys.ArrowLeft); },
    get right() { return !!(keys.KeyD || keys.ArrowRight); },
    get sprint() { return !!(keys.ShiftLeft || keys.ShiftRight); },
    get handbrake() { return !!keys.Space; },
  };
  G.input = input;

  function startPlay(fromSave) {
    V.sound.ensure();
    V.sound.click();
    if (fromSave) {
      const s = V.overlay.loadSave();
      if (s) V.overlay.applySave(G, s);
    }
    G.state = 'play';
    document.getElementById('title').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    V.overlay.refreshHUD(G);
  }

  function respawn(kind) {
    const p = G.player;
    const fee = kind === 'wasted' ? Math.min(p.cash, 150) : Math.min(p.cash, 200);
    p.cash -= fee;
    if (p.inCar) { p.inCar = null; }
    p.mesh.visible = true;
    p.dead = false;
    p.health = p.maxHealth;
    p.armor = 0;
    p.x = G.city.spots.hospital.x; p.z = G.city.spots.hospital.z;
    p.mesh.position.set(p.x, 0, p.z);
    V.heat.clearHeat(G);
    if (G.campaign.phase === 'run') V.campaign.failMission(G, kind === 'wasted' ? 'you were wasted' : 'you were busted');
    V.overlay.hideEnd();
    G.state = 'play';
    V.overlay.toast((kind === 'wasted' ? 'St. Mirella patched you up' : 'Released from the precinct') + ' — fee $' + fee);
    V.overlay.refreshHUD(G);
  }
  G.onWasted = function () {
    if (G.state !== 'play') return;
    G.state = 'endcard';
    G.endAt = G.time + 3.4;
    G.player.dead = true;
    V.sound.fail();
    V.overlay.showEnd(G, 'WASTED', 'St. Mirella Hospital is on its way…', false);
  };
  G.onBusted = function () {
    if (G.state !== 'play') return;
    G.state = 'endcard';
    G.endAt = G.time + 3.4;
    V.sound.fail();
    V.overlay.showEnd(G, 'BUSTED', 'The VPD thanks you for your cooperation…', true);
  };

  function enterCar(car) {
    const p = G.player;
    if (car.role === 'traffic') {
      car.role = 'player';
      car.speed = 0;
      if (G.onCrime) G.onCrime(20, car.x, car.z); // dragged the driver out
      V.overlay.toast('Driver dragged out — that\'s a crime, and it was seen');
    } else if (car.role === 'police') {
      if (G.onCrime) G.onCrime(24, car.x, car.z);
    } else {
      car.role = 'player';
    }
    p.inCar = car;
    p.mesh.visible = false;
    V.sound.engineStart();
    V.sound.setRadio(true);
    V.overlay.refreshHUD(G);
  }
  function exitCar() {
    const p = G.player;
    const car = p.inCar;
    if (!car) return;
    car.role = car.dead ? 'parked' : 'parked';
    if (car.speed !== 0) car.speed = 0;
    p.inCar = null;
    const side = car.heading + Math.PI / 2;
    const fx = G.city.collide(car.x + Math.sin(side) * 2.6, car.z + Math.cos(side) * 2.6, 0.7);
    p.x = fx[0]; p.z = fx[1];
    p.mesh.visible = true;
    p.mesh.position.set(p.x, 0, p.z);
    V.sound.engineStop();
    V.sound.setRadio(false);
    V.overlay.refreshHUD(G);
  }
  G.enterCar = enterCar; G.exitCar = exitCar;

  function nearestOf(list, x, z, maxD) {
    let best = null, bd = maxD;
    for (let i = 0; i < list.length; i++) {
      const d = V.dist2d(x, z, list[i].x, list[i].z);
      if (d < bd) { bd = d; best = list[i]; }
    }
    return best;
  }

  // Context prompt + E interactions, in priority order.
  function interactScan() {
    const p = G.player;
    if (G.state !== 'play') { V.overlay.setPrompt(null); return null; }
    if (p.inCar) {
      V.overlay.setPrompt('<b>E</b> exit car · <b>R</b> radio · <b>Space</b> handbrake');
      return { kind: 'incar' };
    }
    const odile = G.city.spots.odile;
    if (V.dist2d(p.x, p.z, odile.x, odile.z) < 4.6) {
      V.overlay.setPrompt('<b>E</b> talk to Odile Vane');
      return { kind: 'odile' };
    }
    const shop = nearestOf(G.city.shops, p.x, p.z, 10.5);
    if (shop) { V.overlay.setPrompt('<b>E</b> enter ' + shop.name); return { kind: 'shop', shop: shop }; }
    const safe = nearestOf(G.city.safehouses, p.x, p.z, 8.5);
    if (safe) { V.overlay.setPrompt('<b>E</b> rest at ' + safe.name + ' (save · heal · shed a star)'); return { kind: 'safe', safe: safe }; }
    if (V.dist2d(p.x, p.z, COURIER_SPOT.x, COURIER_SPOT.z) < 5) {
      V.overlay.setPrompt('<b>E</b> start a Courier Run (3 drops, timed)');
      return { kind: 'courier' };
    }
    const car = V.motors.nearestCar(G, p.x, p.z, 4.8);
    if (car) {
      V.overlay.setPrompt('<b>E</b> steal the ' + car.spec.name);
      return { kind: 'car', car: car };
    }
    let pedNear = false;
    for (let i = 0; i < G.peds.length; i++) {
      const ped = G.peds[i];
      if (!ped.dead && !ped.isThug && V.dist2d(p.x, p.z, ped.x, ped.z) < 4.2) { pedNear = true; break; }
    }
    if (pedNear) { V.overlay.setPrompt('<b>E</b> rob at gunpoint · <b>Q</b> melee · <b>Click</b> shoot'); return { kind: 'ped' }; }
    if (V.dist2d(p.x, p.z, RACE_SPOT.x, RACE_SPOT.z) < 6) {
      V.overlay.setPrompt('Drive through the beacon to start the Checkpoint Race');
      return { kind: 'race' };
    }
    V.overlay.setPrompt(null);
    return null;
  }

  function doInteract() {
    if (V.overlay.dialogueOpen()) { V.overlay.nextDialogueLine(); return; }
    if (G.shopOpen) { V.overlay.closeShop(G); return; }
    const p = G.player;
    if (p.inCar) { exitCar(); return; }
    const found = interactScan();
    if (!found) return;
    if (found.kind === 'odile') V.campaign.tryOdile(G);
    else if (found.kind === 'shop') V.overlay.openShop(G, found.shop);
    else if (found.kind === 'safe') {
      V.overlay.saveGame(G);
      p.health = p.maxHealth;
      G.heatPts = Math.max(0, G.heatPts - 75);
      G.wanted = V.heat.starsFor(G.heatPts);
      V.sound.chime();
      V.overlay.toast(found.safe.name + ' — saved, healed, one star quieter');
      V.overlay.refreshHUD(G);
    } else if (found.kind === 'courier') V.campaign.startCourier(G);
    else if (found.kind === 'car') enterCar(found.car);
    else if (found.kind === 'ped') V.crowd.robNearest(G);
  }

  window.addEventListener('keydown', function (ev) {
    keys[ev.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(ev.code)) ev.preventDefault();
    if (G.state === 'title') {
      if (ev.code === 'Enter' || ev.code === 'Space') startPlay(false);
      return;
    }
    if (ev.code === 'KeyM') {
      const muted = V.sound.toggleMute();
      V.overlay.toast(muted ? 'Sound muted' : 'Sound on');
      return;
    }
    if (G.shopOpen) {
      if (ev.code === 'KeyE' || ev.code === 'Escape') V.overlay.closeShop(G);
      else V.overlay.shopKey(G, ev.code);
      return;
    }
    if (ev.code === 'KeyP' || (ev.code === 'Escape' && G.mapOpen)) {
      G.mapOpen = !G.mapOpen;
      document.getElementById('bigmap').classList.toggle('hidden', !G.mapOpen);
      if (G.mapOpen) V.overlay.drawBigmap(G);
      return;
    }
    if (ev.code === 'Escape') {
      if (V.overlay.dialogueOpen()) return;
      if (G.state === 'play') {
        G.state = 'pause';
        document.getElementById('pause').classList.remove('hidden');
        document.getElementById('pause-stats').innerHTML =
          'Cash $' + G.player.cash + ' · Rep ' + G.player.rep + ' (' + V.overlay.rankName(G.player.rep) + ')<br>' +
          'Missions done: ' + G.player.missionIndex + ' / ' + V.campaign.MISSIONS.length;
      } else if (G.state === 'pause') {
        G.state = 'play';
        document.getElementById('pause').classList.add('hidden');
      }
      return;
    }
    if (G.state !== 'play') return;
    if (ev.code === 'KeyE' || ev.code === 'KeyF') doInteract();
    else if (ev.code === 'KeyR') {
      if (G.player.inCar) {
        const name = V.sound.cycleStation();
        V.overlay.toast('♪ ' + name);
        V.overlay.refreshHUD(G);
      } else V.combat.reload(G);
    } else if (ev.code === 'KeyQ') V.combat.melee(G);
  });
  window.addEventListener('keyup', function (ev) { keys[ev.code] = false; });

  let dragging = false, lastMX = 0, lastMY = 0;
  renderer.domElement.addEventListener('mousedown', function (ev) {
    dragging = true; lastMX = ev.clientX; lastMY = ev.clientY;
    mouseDown = true;
    if (G.state === 'play' && !V.overlay.dialogueOpen() && !G.shopOpen && !G.mapOpen) {
      if (!G.player.inCar) V.combat.playerShoot(G);
    }
  });
  window.addEventListener('mouseup', function () { dragging = false; mouseDown = false; });
  window.addEventListener('mousemove', function (ev) {
    if (!dragging || G.state !== 'play') return;
    const dx = ev.clientX - lastMX, dy = ev.clientY - lastMY;
    lastMX = ev.clientX; lastMY = ev.clientY;
    G.camYaw -= dx * 0.0052;
    G.camPitch = V.clamp(G.camPitch + dy * 0.003, 0.08, 1.1);
  });
  document.getElementById('dialogue').addEventListener('click', function () {
    if (V.overlay.dialogueOpen()) V.overlay.nextDialogueLine();
  });
  document.getElementById('btn-new').addEventListener('click', function () { startPlay(false); });
  document.getElementById('btn-resume').addEventListener('click', function () {
    G.state = 'play';
    document.getElementById('pause').classList.add('hidden');
  });
  document.getElementById('btn-save').addEventListener('click', function () {
    V.overlay.saveGame(G);
    V.overlay.toast('Game saved');
  });
  document.getElementById('btn-quit').addEventListener('click', function () { location.reload(); });
  const continueBtn = document.getElementById('btn-continue');
  if (V.overlay.loadSave()) {
    continueBtn.classList.remove('hidden');
    continueBtn.addEventListener('click', function () { startPlay(true); });
  }
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- per-frame update ---------------------------------------------------------
  function update(dt) {
    G.time += dt;
    const p = G.player;
    p.clockMin = (p.clockMin + dt * 1.5) % (24 * 60);
    city.updateRain(dt, p.inCar ? p.inCar.x : p.x, p.inCar ? p.inCar.z : p.z);
    city.water.material.opacity = 0.88 + Math.sin(G.time * 0.7) * 0.05;

    if (G.state === 'endcard') {
      if (G.time >= G.endAt) respawn(p.health <= 0 ? 'wasted' : 'busted');
      return;
    }
    if (G.state !== 'play' || G.mapOpen) return;

    const frozen = V.overlay.dialogueOpen() || G.shopOpen;
    if (!frozen) {
      if (p.inCar) {
        V.motors.drivePlayer(G, p.inCar, input, dt);
        p.x = p.inCar.x; p.z = p.inCar.z;
        V.sound.engineUpdate(p.inCar.speed / p.inCar.spec.top);
        // Race beacon trigger.
        if (!G.campaign.side && G.campaign.phase !== 'run' &&
            V.dist2d(p.inCar.x, p.inCar.z, RACE_SPOT.x, RACE_SPOT.z) < 7) {
          V.campaign.startRace(G);
        }
      } else {
        V.jax.updateOnFoot(G, dt, input, G.camYaw);
      }
      for (let i = 0; i < G.cars.length; i++) {
        if (G.cars[i].role === 'traffic') V.motors.updateTraffic(G, G.cars[i], dt);
        else if (G.cars[i].role === 'parked' || G.cars[i].role === 'police') V.motors.syncMesh(G.cars[i]);
      }
      V.crowd.updatePeds(G, dt);
      V.combat.updateFighters(G, dt);
      V.heat.updateHeat(G, dt);
      V.campaign.update(G, dt);
      V.motors.updateSmoke(G, dt);
    }
    V.combat.updateTracers(G, dt);
    V.sound.update();
    interactScan();

    // Objective marker visuals.
    if (G.objective && G.objective.x !== undefined) {
      marker.visible = true; ring.visible = true;
      marker.position.set(G.objective.x, 13, G.objective.z);
      ring.position.set(G.objective.x, 0.15 + Math.sin(G.time * 3) * 0.05, G.objective.z);
      const col = G.objective.color || 0xffd76a;
      markerMat.color.setHex(col); ringMat.color.setHex(col);
      const s = 1 + Math.sin(G.time * 3) * 0.12;
      ring.scale.set(s, s, s);
    } else { marker.visible = false; ring.visible = false; }

    // Camera: orbit behind the hero or the car.
    const target = p.inCar ? p.inCar : p;
    const tx = p.inCar ? p.inCar.x : p.x, tz = p.inCar ? p.inCar.z : p.z;
    if (p.inCar) {
      const desired = p.inCar.heading;
      let d = desired - G.camYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(p.inCar.speed) > 2) G.camYaw += d * Math.min(1, dt * 2.6);
    }
    G.camDir = { x: Math.sin(G.camYaw), z: Math.cos(G.camYaw) };
    const dist = p.inCar ? 11 : 7.5;
    const height = p.inCar ? 3.4 + G.camPitch * 2 : 2.2 + G.camPitch * 2.4;
    const cx = tx - G.camDir.x * dist;
    const cz = tz - G.camDir.z * dist;
    camera.position.x = V.lerp(camera.position.x, cx, Math.min(1, dt * 7));
    camera.position.z = V.lerp(camera.position.z, cz, Math.min(1, dt * 7));
    camera.position.y = V.lerp(camera.position.y, height, Math.min(1, dt * 7));
    camera.lookAt(tx, 1.5, tz);
    void target; void mouseDown;

    // HUD + minimap throttled.
    if (G.time - G.hudAt > 0.12) {
      G.hudAt = G.time;
      V.overlay.refreshHUD(G);
      V.overlay.refreshObjective(G);
    }
    if (G.time - G.mapAt > 0.15) {
      G.mapAt = G.time;
      V.overlay.drawMinimap(G);
    }
  }

  function countDrawObjects() {
    let n = 0;
    city.scene.traverse(function (o) { if (o.isMesh || o.isLine || o.isPoints) n++; });
    return n;
  }

  // ---- shot mode ------------------------------------------------------------------
  if (shotName) {
    G.shotMode = true;
    G.state = 'play';
    document.getElementById('title').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    V.shotrig.applyShot(G, shotName);
  }

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    dt = V.clamp(dt, 1 / 240, 0.05); // clamp both ways
    if (G.shotMode) {
      G.time += dt;
      city.updateRain(dt, G.player.x, G.player.z);
      if (G.shotCam) {
        camera.position.set(G.shotCam.x, G.shotCam.y, G.shotCam.z);
        camera.lookAt(G.shotCam.lx, G.shotCam.ly, G.shotCam.lz);
      }
      // Flash police light bars in posed scenes.
      for (let i = 0; i < G.police.length; i++) {
        const c = G.police[i];
        if (c.barMesh) c.barMesh.material.color.setHex(Math.floor(G.time * 5 + c.id) % 2 ? 0xff8888 : 0x88aaff);
      }
      if (G.objective && G.objective.x !== undefined) {
        marker.visible = true; ring.visible = true;
        marker.position.set(G.objective.x, 13, G.objective.z);
        ring.position.set(G.objective.x, 0.15, G.objective.z);
      }
      V.overlay.refreshHUD(G);
      V.overlay.refreshObjective(G);
      V.overlay.drawMinimap(G);
    } else {
      update(dt);
      if (G.state === 'title') {
        // Slow title orbit over the Neon Mile.
        const t = now / 1000;
        camera.position.set(Math.sin(t * 0.07) * 60, 16 + Math.sin(t * 0.11) * 3, -180 + Math.cos(t * 0.07) * 60);
        camera.lookAt(0, 6, -180);
      }
    }
    renderer.render(city.scene, camera);
    window.__counts.vehicles = G.cars.length;
    window.__counts.pedestrians = G.peds.length;
    window.__counts.drawObjects = countDrawObjects();
  }
  requestAnimationFrame(frame);
})(window.VAD);
