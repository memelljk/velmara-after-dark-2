// campaign.js — the story of Velmara After Dark: TWELVE story missions in
// one chain, from a first parcel run to a five-star escape past the city
// limits, plus a repeatable checkpoint race and courier run as side earners.
// Mission steps are data: goto / steal / deliver / clear / hold / collect /
// gates / lose / escape, with optional countdowns. Dialogue opens and closes
// every job through Odile Vane, the fixer at the Neon Mile booth.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  const ODILE = 'Odile Vane';
  const JAX = 'Jax Rook';

  const MISSIONS = [
    {
      title: 'First Parcel', pay: 150, rep: 20,
      intro: [
        [ODILE, 'Jax Rook. You drive, you don\'t ask, you don\'t open. That\'s the whole contract.'],
        [ODILE, 'A parcel waits at the Old Market, stall row, red awnings. Bring it back to the Neon Mile drop. Simple money.'],
        [JAX, 'Simple money is my favourite kind of trouble.'],
      ],
      outro: [[ODILE, 'Clean. The city might learn your name yet, rook.']],
      steps: [
        { type: 'goto', x: -180, z: 88, r: 5, label: 'Pick up the parcel at the Old Market stalls' },
        { type: 'goto', x: 26, z: -120, r: 6, label: 'Deliver the parcel to the Neon Mile drop' },
      ],
    },
    {
      title: 'Nine Minutes to Dock Nine', pay: 220, rep: 25,
      intro: [
        [ODILE, 'A Dockmaster Pickup is loaded with machine parts on South Row. The harbour crew counts nine minutes, not ten.'],
        [JAX, 'Then I\'d better not stop for coffee.'],
      ],
      outro: [[ODILE, 'Dock Nine sends its regards. And its cash.']],
      steps: [
        { type: 'steal', spawn: { type: 'pickup', x: 5, z: -66, heading: 0, paint: 0xd9a441 }, label: 'Take the loaded Dockmaster Pickup' },
        { type: 'deliver', x: 150, z: 255, r: 7, timer: 540, label: 'Deliver to Dock Nine on the harbour apron' },
      ],
    },
    {
      title: 'Indigo Heart', pay: 300, rep: 35,
      intro: [
        [ODILE, 'A collector in The Heights keeps an indigo Orphee GT he doesn\'t deserve. My buyer at the Dockyards disagrees with his ownership.'],
        [JAX, 'Consider the car repossessed.'],
      ],
      outro: [[ODILE, 'The buyer wept. Then he paid. Both good signs.']],
      steps: [
        { type: 'steal', spawn: { type: 'orphee', x: 186, z: -58, heading: Math.PI, paint: 0x3b2d8f }, label: 'Steal the indigo Orphee GT in The Heights', crime: 14 },
        { type: 'deliver', x: 252, z: 120, r: 7, sameCar: true, label: 'Deliver the Orphee GT to the Dockyards buyer' },
      ],
    },
    {
      title: 'Dock Crew', pay: 260, rep: 30,
      intro: [
        [ODILE, 'A dock crew is shaking down my harbour runners. Four of them, near the container stacks. Introduce yourself. Loudly.'],
        [JAX, 'Loud is the only language I speak before midnight.'],
      ],
      outro: [[ODILE, 'The docks are quiet again. My runners thank you.']],
      steps: [
        { type: 'goto', x: 258, z: 150, r: 9, label: 'Reach the container yard in the Dockyards' },
        { type: 'clear', x: 268, z: 168, n: 4, label: 'Clear out the dock crew (0/4)' },
      ],
    },
    {
      title: 'The Vault Run', pay: 380, rep: 45,
      intro: [
        [ODILE, 'The harbour vault pays out tonight. Stand in the light by the warehouse, keep the point for one minute, then make the police forget your face.'],
        [JAX, 'One minute standing still. In this city that\'s the dangerous part.'],
      ],
      outro: [[ODILE, 'The vault remembers who held it. So do I.']],
      steps: [
        { type: 'goto', x: 150, z: 240, r: 6, label: 'Reach the harbour vault point' },
        { type: 'hold', x: 150, z: 240, r: 7, secs: 60, setWanted: 2, label: 'Hold the vault point' },
        { type: 'lose', label: 'Lose the police' },
      ],
    },
    {
      title: 'Market Shakedown', pay: 240, rep: 30,
      intro: [
        [ODILE, 'Three stalls in the Old Market owe protection money. Walk up, be polite, be obvious. On foot, rook — this is theatre.'],
        [JAX, 'Polite. Obvious. Got it.'],
      ],
      outro: [[ODILE, 'The market pays on time now. Theatre works.']],
      steps: [
        { type: 'collect', points: 'stalls', label: 'Collect protection money from 3 stalls (0/3)' },
      ],
    },
    {
      title: 'Night Courier', pay: 320, rep: 35,
      intro: [
        [ODILE, 'Three drops, one night, no questions: the east crossing, the north Heights road, then the harbour gate. The clock is already rude.'],
        [JAX, 'Four minutes. Plenty. Probably.'],
      ],
      outro: [[ODILE, 'Every drop landed. You\'re becoming reliable — don\'t let it go to your head.']],
      steps: [
        { type: 'goto', x: 120, z: 60, r: 7, timer: 240, sharedTimer: true, label: 'Courier drop 1 of 3 — the east crossing' },
        { type: 'goto', x: -120, z: -180, r: 7, sharedTimer: true, label: 'Courier drop 2 of 3 — the Heights road' },
        { type: 'goto', x: 60, z: 182, r: 7, sharedTimer: true, label: 'Courier drop 3 of 3 — the harbour gate' },
      ],
    },
    {
      title: 'Siren Song', pay: 340, rep: 40,
      intro: [
        [ODILE, 'The VPD parks a fresh interceptor by the west precinct yard. My garage crew wants to study it. Bring it to the Fixer Garage — sirens off, preferably.'],
        [JAX, 'Stealing a police car. Quietly. Sure.'],
      ],
      outro: [[ODILE, 'The crew is drooling over it. The city will bill someone else.']],
      steps: [
        { type: 'steal', spawn: { type: 'interceptor', x: -228, z: 126, heading: Math.PI / 2, paint: 0x23242e }, label: 'Steal the police interceptor', crime: 22 },
        { type: 'deliver', x: 96, z: 182, r: 8, sameCar: true, label: 'Deliver the interceptor to the Fixer Garage' },
      ],
    },
    {
      title: 'Rooftop Cover', pay: 360, rep: 40,
      intro: [
        [ODILE, 'Three gunmen are sitting on the Old Market awnings, watching my stalls. Take the high ground away from them.'],
        [JAX, 'Rooftop service. Coming right up.'],
      ],
      outro: [[ODILE, 'The awnings are ours again. Mind the drop next time.']],
      steps: [
        { type: 'goto', x: -180, z: 92, r: 8, label: 'Reach the Old Market rooftops' },
        { type: 'clear', x: -180, z: 58, n: 3, rooftop: true, label: 'Clear the rooftop gunmen (0/3)' },
      ],
    },
    {
      title: 'The Ledger', pay: 400, rep: 45,
      intro: [
        [ODILE, 'My ledger sleeps in the Harbor Bunk safehouse. Carry it to me personally — and Jax, the whole city will want a look. Three stars of want.'],
        [JAX, 'A book worth a manhunt. My favourite genre.'],
      ],
      outro: [[ODILE, 'Every name in this book owes me. Now they owe you a little too.']],
      steps: [
        { type: 'goto', x: 118, z: 188, r: 5, label: 'Pick up the ledger at the Harbor Bunk', setWantedOnDone: 3 },
        { type: 'goto', x: 15, z: -140, r: 6, label: 'Bring the ledger to Odile at the Neon Mile booth' },
      ],
    },
    {
      title: 'Harbor Blockade', pay: 460, rep: 50,
      intro: [
        [ODILE, 'The VPD is sealing the harbour with checkpoints tonight. Smash the line, rook — three checkpoints, then the city-limits sign. Don\'t stop to apologise.'],
        [JAX, 'Apologies were never in the budget.'],
      ],
      outro: [[ODILE, 'You went through their line like weather. Beautiful.']],
      steps: [
        { type: 'gates', setWanted: 3, points: [
          { x: 60, z: 120, label: 'Smash checkpoint 1' },
          { x: 0, z: 0, label: 'Smash checkpoint 2' },
          { x: -60, z: -120, label: 'Smash checkpoint 3' },
        ], label: 'Run the blockade' },
        { type: 'goto', x: 0, z: -306, r: 8, label: 'Reach the city-limits sign' },
      ],
    },
    {
      title: 'Velmara Goodbye', pay: 900, rep: 100,
      intro: [
        [ODILE, 'Last job, rook. The vault cash, the whole take, is yours if you can carry it past the city limits. Every star in the sky will be lit. Five of them, Jax.'],
        [JAX, 'Then I\'ll drive fast enough to outrun the sky.'],
      ],
      outro: [
        [ODILE, 'You\'re past the limits, rook. Velmara is yours whenever you come back for it.'],
        [JAX, 'Tell the rain I\'ll miss it. Tell the police nothing.'],
      ],
      steps: [
        { type: 'goto', x: 150, z: 240, r: 6, label: 'Take the vault cash at the harbour', setWantedOnDone: 5 },
        { type: 'escape', x: 0, z: -306, r: 9, label: 'Escape past the city limits — Velmara Goodbye' },
      ],
    },
  ];

  const RACE = {
    title: 'Neon Mile Checkpoint Race', pay: 180,
    points: [
      { x: 120, z: -120 }, { x: 120, z: -240 }, { x: 0, z: -240 },
      { x: -120, z: -120 }, { x: -120, z: 0 }, { x: 5, z: -100 },
    ],
    time: 150,
  };
  const COURIER = { title: 'Courier Run', payPerDrop: 45, drops: 3, time: 180 };

  function makeRuntime() {
    return {
      phase: 'meet',           // meet Odile -> run mission -> meet ...
      mission: null, stepIndex: 0, step: null,
      timer: null, holdProgress: 0, collected: 0, clearedBase: 0,
      missionCarId: null, gatesIndex: 0, side: null,
    };
  }

  function currentStepTarget(rt) {
    const s = rt.step;
    if (!s) return null;
    if (s.type === 'collect') {
      const pts = rt.collectPoints || [];
      return pts[rt.collected] || null;
    }
    if (s.type === 'gates') {
      return s.points[rt.gatesIndex] || null;
    }
    if (s.type === 'clear' || s.type === 'hold') return { x: s.x, z: s.z };
    if (s.type === 'lose') return null;
    return { x: s.x, z: s.z };
  }

  function startMission(G, idx) {
    const rt = G.campaign;
    rt.mission = MISSIONS[idx];
    rt.stepIndex = 0;
    rt.phase = 'intro';
    V.overlay.showDialogue(rt.mission.intro, function () {
      rt.phase = 'run';
      setupStep(G);
    });
  }

  function setupStep(G) {
    const rt = G.campaign;
    const s = rt.mission.steps[rt.stepIndex];
    rt.step = s;
    rt.holdProgress = 0;
    rt.collected = 0;
    rt.gatesIndex = 0;
    if (s.timer && !s.sharedTimer) rt.timer = s.timer;
    if (s.sharedTimer && rt.timer === null) rt.timer = s.timer;
    if (s.setWanted) setWanted(G, s.setWanted);
    if (s.type === 'steal' && s.spawn) {
      const car = V.motors.spawnCar(G, s.spawn.type, s.spawn.x, s.spawn.z, s.spawn.heading, {
        role: 'parked', paint: s.spawn.paint, cones: true,
      });
      rt.missionCarId = car.id;
    }
    if (s.type === 'clear') {
      rt.clearedBase = G.thugs.filter(function (t) { return !t.dead; }).length;
      const spots = s.rooftop
        ? [{ x: -196, z: 44, y: 3.2 }, { x: -164, z: 44, y: 3.2 }, { x: -180, z: 78, y: 3.2 }]
        : [{ x: s.x - 6, z: s.z - 4 }, { x: s.x + 6, z: s.z + 5 }, { x: s.x + 2, z: s.z - 8 }, { x: s.x - 3, z: s.z + 9 }];
      for (let i = 0; i < s.n; i++) {
        V.combat.spawnFighter(G, spots[i].x, spots[i].z, { y: spots[i].y || 0, static: !!spots[i].y });
      }
    }
    if (s.type === 'collect') {
      const stalls = G.city.stalls;
      rt.collectPoints = [stalls[1], stalls[6], stalls[10]].map(function (st) {
        return { x: st.x, z: st.z + 6 };
      });
    }
    if (s.type === 'hold') {
      V.combat.spawnFighter(G, s.x - 14, s.z - 8, {});
      V.combat.spawnFighter(G, s.x + 15, s.z + 6, {});
    }
  }

  function setWanted(G, stars) {
    G.heatPts = Math.max(G.heatPts, stars <= 0 ? 0 : (stars - 1) * 55 + 20);
    G.wanted = V.heat.starsFor(G.heatPts);
    G.lastCrimeAt = G.time;
    V.overlay.refreshHUD(G);
  }

  function stepDone(G) {
    const rt = G.campaign;
    const s = rt.step;
    if (s && s.setWantedOnDone) setWanted(G, s.setWantedOnDone);
    if (s && !s.sharedTimer) rt.timer = null;
    rt.stepIndex++;
    if (rt.stepIndex >= rt.mission.steps.length) {
      completeMission(G);
    } else {
      setupStep(G);
    }
  }

  function completeMission(G) {
    const rt = G.campaign;
    const m = rt.mission;
    const p = G.player;
    p.cash += m.pay;
    p.rep += m.rep;
    p.missionIndex++;
    rt.timer = null;
    rt.step = null;
    rt.phase = 'outro';
    V.sound.chime();
    V.overlay.toast('MISSION COMPLETE — ' + m.title + ' · +$' + m.pay);
    V.overlay.showDialogue(m.outro, function () {
      rt.phase = 'meet';
      V.overlay.saveGame(G);
    });
    V.overlay.refreshHUD(G);
  }

  function failMission(G, why) {
    const rt = G.campaign;
    if (!rt.mission) return;
    V.sound.fail();
    V.overlay.toast('MISSION FAILED — ' + why + '. Odile is waiting.');
    // Clean up mission-spawned fighters and the mission car lock.
    for (let i = G.thugs.length - 1; i >= 0; i--) {
      if (!G.thugs[i].isOfficer) {
        G.city.scene.remove(G.thugs[i].mesh);
        G.thugs.splice(i, 1);
      }
    }
    rt.step = null; rt.timer = null; rt.phase = 'meet'; rt.mission = null;
  }

  // Side earners ------------------------------------------------------------
  function startRace(G) {
    const rt = G.campaign;
    if (rt.side || rt.phase === 'run') return false;
    rt.side = { kind: 'race', idx: 0, timer: RACE.time };
    V.overlay.toast('RACE STARTED — hit every checkpoint before the clock dies');
    return true;
  }
  function startCourier(G) {
    const rt = G.campaign;
    if (rt.side || rt.phase === 'run') return false;
    const spots = [
      { x: 120, z: -60 }, { x: -60, z: 120 }, { x: 200, z: 60 },
      { x: -200, z: -120 }, { x: 40, z: -220 }, { x: -120, z: 200 },
    ];
    const drops = [];
    for (let i = 0; i < COURIER.drops; i++) drops.push(spots[Math.floor(G.rng() * spots.length)]);
    rt.side = { kind: 'courier', idx: 0, drops: drops, timer: COURIER.time };
    V.overlay.toast('COURIER RUN — 3 drops, $45 each, clock is running');
    return true;
  }
  function updateSide(G, dt) {
    const rt = G.campaign;
    const side = rt.side;
    if (!side) return;
    side.timer -= dt;
    if (side.timer <= 0) {
      V.overlay.toast(side.kind === 'race' ? 'Race lost — out of time' : 'Courier run expired');
      V.sound.fail();
      rt.side = null;
      return;
    }
    const p = G.player;
    const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
    if (side.kind === 'race') {
      const pt = RACE.points[side.idx];
      G.objective = { x: pt.x, z: pt.z, title: RACE.title, sub: 'Checkpoint ' + (side.idx + 1) + '/' + RACE.points.length, timer: side.timer, color: 0x7dff9a };
      if (p.inCar && V.dist2d(px, pz, pt.x, pt.z) < 9) {
        side.idx++;
        V.sound.click();
        if (side.idx >= RACE.points.length) {
          p.cash += RACE.pay; p.rep += 15;
          V.sound.chime();
          V.overlay.toast('RACE WON — +$' + RACE.pay);
          rt.side = null;
        }
      }
    } else {
      const pt = side.drops[side.idx];
      G.objective = { x: pt.x, z: pt.z, title: COURIER.title, sub: 'Drop ' + (side.idx + 1) + '/' + side.drops.length, timer: side.timer, color: 0x7dff9a };
      if (V.dist2d(px, pz, pt.x, pt.z) < 7) {
        side.idx++;
        p.cash += COURIER.payPerDrop;
        V.sound.chime();
        if (side.idx >= side.drops.length) {
          V.overlay.toast('Courier run complete');
          rt.side = null;
        } else {
          V.overlay.toast('Drop made — +$' + COURIER.payPerDrop);
        }
      }
    }
  }

  // Per-frame campaign logic --------------------------------------------------
  function update(G, dt) {
    const rt = G.campaign;
    if (G.shotMode) return;
    if (rt.phase === 'meet') {
      if (G.player.missionIndex >= MISSIONS.length) {
        G.objective = { x: G.city.spots.odile.x, z: G.city.spots.odile.z, title: 'Free Roam', sub: 'Campaign complete — races & courier runs pay at the beacons', color: 0x8fd8ff };
      } else {
        G.objective = { x: G.city.spots.odile.x, z: G.city.spots.odile.z, title: 'Meet Odile Vane', sub: 'Next job: ' + MISSIONS[G.player.missionIndex].title, color: 0x8fd8ff };
      }
      updateSide(G, dt);
      return;
    }
    if (rt.phase !== 'run' || !rt.step) { G.objective = null; return; }
    const s = rt.step;
    const p = G.player;
    const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
    // Countdowns.
    if (rt.timer !== null && rt.timer !== undefined) {
      rt.timer -= dt;
      if (rt.timer <= 0) { failMission(G, 'out of time'); return; }
    }
    const target = currentStepTarget(rt);
    let label = s.label;
    if (s.type === 'clear') {
      const alive = G.thugs.filter(function (t) { return t.isThug && !t.dead; }).length;
      const done = s.n - alive;
      label = s.label.replace(/\(\d+\/\d+\)/, '(' + done + '/' + s.n + ')');
      if (alive === 0) { stepDone(G); return; }
    }
    if (s.type === 'collect') {
      label = s.label.replace(/\(\d+\/\d+\)/, '(' + rt.collected + '/3)');
      if (target && V.dist2d(p.x, p.z, target.x, target.z) < 3 && !p.inCar) {
        rt.collected++;
        p.cash += 30;
        if (G.onCrime) G.onCrime(8, target.x, target.z);
        V.sound.chime();
        V.overlay.toast('Collected protection money (' + rt.collected + '/3)');
        if (rt.collected >= 3) { stepDone(G); return; }
      }
    }
    if (s.type === 'hold' && target) {
      if (V.dist2d(px, pz, s.x, s.z) < s.r) {
        rt.holdProgress += dt;
        label = 'Hold the vault point — ' + Math.ceil(s.secs - rt.holdProgress) + 's';
        if (rt.holdProgress >= s.secs) { stepDone(G); return; }
      } else {
        rt.holdProgress = Math.max(0, rt.holdProgress - dt * 0.5);
        label = 'Return to the vault point!';
      }
    }
    if (s.type === 'gates' && target) {
      label = target.label + ' (' + (rt.gatesIndex + 1) + '/3)';
      if (p.inCar && V.dist2d(px, pz, target.x, target.z) < 10) {
        rt.gatesIndex++;
        V.sound.crash();
        if (G.onCrime) G.onCrime(10, target.x, target.z);
        if (rt.gatesIndex >= s.points.length) { stepDone(G); return; }
        target = currentStepTarget(rt);
      }
    }
    if (s.type === 'lose') {
      G.objective = { title: rt.mission.title, sub: 'Lose the police — break line of sight and let the heat cool', color: 0xff5d5d };
      if (G.wanted === 0) { stepDone(G); return; }
      return;
    }
    if (!target) { G.objective = null; return; }
    G.objective = {
      x: target.x, z: target.z, title: rt.mission.title, sub: label,
      timer: rt.timer, color: s.type === 'escape' ? 0xff5d5d : 0xffd76a,
    };
    // Arrival checks.
    const d = V.dist2d(px, pz, target.x, target.z);
    if (s.type === 'goto' || s.type === 'escape') {
      if (d < s.r) { stepDone(G); return; }
    } else if (s.type === 'steal') {
      if (p.inCar && p.inCar.id === rt.missionCarId) {
        if (s.crime && G.onCrime) G.onCrime(s.crime, p.inCar.x, p.inCar.z);
        stepDone(G); return;
      }
    } else if (s.type === 'deliver') {
      if (p.inCar && d < s.r && (!s.sameCar || p.inCar.id === rt.missionCarId)) {
        stepDone(G); return;
      }
    }
  }

  function tryOdile(G) {
    const rt = G.campaign;
    if (rt.phase !== 'meet') return false;
    if (G.player.missionIndex >= MISSIONS.length) {
      V.overlay.showDialogue([
        [ODILE, 'The book is closed, rook, and your name is on the cover. The city is yours — race it, run it, rob it politely.'],
        [JAX, 'Polite as always, Odile.'],
      ], function () {});
      return true;
    }
    startMission(G, G.player.missionIndex);
    return true;
  }

  V.campaign = {
    MISSIONS: MISSIONS, RACE: RACE, COURIER: COURIER,
    makeRuntime: makeRuntime, update: update, tryOdile: tryOdile,
    startRace: startRace, startCourier: startCourier,
    failMission: failMission, setWanted: setWanted,
  };
})(window.VAD);
