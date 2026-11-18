// overlay.js — everything drawn over the 3D world: HUD (cash, rep rank,
// clock, health/armour, wanted stars, speed, ammo, radio), the objective
// banner with live distance and countdown, the BUSTED meter, the LIVE
// circular minimap, the full city map on P, dialogue boxes, shop menus,
// toasts, prompts, and the localStorage save / Continue system.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  function el(id) { return document.getElementById(id); }
  const RANKS = [
    [0, 'ROOKIE'], [120, 'RUNNER'], [300, 'WHEELMAN'], [550, 'FIXER'], [850, 'GHOST'], [1200, 'LEGEND'],
  ];
  function rankName(rep) {
    let name = RANKS[0][1];
    for (let i = 0; i < RANKS.length; i++) if (rep >= RANKS[i][0]) name = RANKS[i][1];
    return name;
  }

  let toastTimer = null;
  function toast(msg) {
    const t = el('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 3400);
  }
  function setPrompt(html) {
    const p = el('prompt');
    if (!html) { p.classList.add('hidden'); return; }
    p.innerHTML = html;
    p.classList.remove('hidden');
  }

  function fmtClock(mins) {
    const h = Math.floor(mins / 60) % 24, m = Math.floor(mins % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function fmtTimer(sec) {
    if (sec === null || sec === undefined) return '';
    sec = Math.max(0, Math.ceil(sec));
    return ' · ' + Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
  }

  function refreshHUD(G) {
    const p = G.player;
    if (!p) return;
    el('cash').textContent = '$' + p.cash.toLocaleString('en-US');
    el('rep').textContent = 'REP ' + p.rep + ' · ' + rankName(p.rep);
    el('clock').textContent = fmtClock(p.clockMin);
    const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
    el('district').textContent = G.city.districtAt(px, pz);
    let stars = '';
    for (let i = 0; i < 5; i++) stars += '<span class="' + (i < G.wanted ? 'lit' : '') + '">★</span>';
    el('stars').innerHTML = stars;
    el('healthfill').style.width = V.clamp((p.health / p.maxHealth) * 100, 0, 100) + '%';
    el('armorfill').style.width = V.clamp(p.armor, 0, 100) + '%';
    el('speedo').classList.toggle('hidden', !p.inCar);
    if (p.inCar) el('speed').textContent = String(Math.round(Math.abs(p.inCar.speed) * 3.6));
    el('ammo').classList.toggle('hidden', !!p.inCar);
    el('mag').textContent = String(p.mag);
    el('reserve').textContent = String(p.reserve);
    el('radio').classList.toggle('hidden', !p.inCar);
    if (p.inCar) el('station').textContent = V.sound.stationName();
    el('crosshair').classList.toggle('hidden', !!p.inCar || G.state !== 'play');
    const bw = el('bustedwrap');
    if (G.busted > 2 && G.wanted > 0) {
      bw.classList.remove('hidden');
      el('bustedfill').style.width = G.busted + '%';
    } else bw.classList.add('hidden');
  }

  function refreshObjective(G) {
    const box = el('objective');
    const o = G.objective;
    if (!o || G.state !== 'play') { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    el('obj-title').textContent = o.title;
    const p = G.player;
    const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
    let sub = o.sub || '';
    if (o.x !== undefined && o.z !== undefined) {
      const d = Math.round(V.dist2d(px, pz, o.x, o.z));
      sub += (sub ? ' · ' : '') + d + ' m';
    }
    sub += fmtTimer(o.timer);
    el('obj-sub').textContent = sub;
  }

  // ---- minimap -------------------------------------------------------------
  function drawMapCanvas(G, ctx, size, range, big) {
    const p = G.player;
    const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
    const scale = size / (range * 2);
    const cx = big ? size / 2 - px * scale + size / 2 - size / 2 : size / 2;
    void cx;
    function mx(x) { return big ? (x + 340) * (size / 680) : size / 2 + (x - px) * scale; }
    function mz(z) { return big ? (z + 340) * (size / 680) : size / 2 + (z - pz) * scale; }
    ctx.fillStyle = '#0a0f22';
    ctx.fillRect(0, 0, size, size);
    // Water.
    ctx.fillStyle = '#14405f';
    ctx.fillRect(mx(-340), mz(268), 680 * (big ? size / 680 : scale), 90 * (big ? size / 680 : scale));
    // Roads.
    ctx.strokeStyle = '#3d4356';
    ctx.lineWidth = Math.max(2, 22 * (big ? size / 680 : scale));
    G.city.roads.forEach(function (r) {
      ctx.beginPath(); ctx.moveTo(mx(r), mz(-330)); ctx.lineTo(mx(r), mz(330)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx(-330), mz(r)); ctx.lineTo(mx(330), mz(r)); ctx.stroke();
    });
    // Shops and safehouses.
    ctx.fillStyle = '#7dff9a';
    G.city.shops.forEach(function (s) { ctx.fillRect(mx(s.x) - 3, mz(s.z) - 3, 6, 6); });
    ctx.fillStyle = '#8fd8ff';
    G.city.safehouses.forEach(function (s) { ctx.fillRect(mx(s.x) - 3, mz(s.z) - 3, 6, 6); });
    if (big) {
      ctx.fillStyle = '#9fb2d8';
      ctx.font = 'bold 15px Arial';
      G.city.districts.forEach(function (d) {
        ctx.fillText(d.name.toUpperCase(), mx(d.x) - 40, mz(d.z));
      });
      ctx.fillStyle = '#ffd76a';
      ctx.fillText('ODILE', mx(G.city.spots.odile.x) + 6, mz(G.city.spots.odile.z));
    }
    // Traffic dots nearby.
    ctx.fillStyle = '#8a93a6';
    G.cars.forEach(function (c) {
      if (c.role === 'police' || c.dead) return;
      if (!big && V.dist2d(px, pz, c.x, c.z) > range) return;
      ctx.fillRect(mx(c.x) - 2, mz(c.z) - 2, 4, 4);
    });
    // Police blips flash blue/red.
    const phase = Math.floor(G.time * 3) % 2;
    ctx.fillStyle = phase ? '#ff4040' : '#4f8fff';
    G.police.forEach(function (c) {
      if (c.dead) return;
      ctx.beginPath(); ctx.arc(mx(c.x), mz(c.z), big ? 5 : 4, 0, Math.PI * 2); ctx.fill();
    });
    // Objective marker.
    if (G.objective && G.objective.x !== undefined) {
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(mx(G.objective.x), mz(G.objective.z), big ? 7 : 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // Player arrow.
    const heading = p.inCar ? p.inCar.heading : p.heading;
    ctx.save();
    ctx.translate(mx(px), mz(pz));
    ctx.rotate(Math.atan2(Math.sin(heading), -Math.cos(heading)) + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawMinimap(G) {
    const c = el('minimap');
    drawMapCanvas(G, c.getContext('2d'), 180, 120, false);
  }
  function drawBigmap(G) {
    const c = el('bigmap-canvas');
    drawMapCanvas(G, c.getContext('2d'), 760, 340, true);
  }

  // ---- dialogue --------------------------------------------------------------
  let dlgQueue = [], dlgDone = null, dlgActive = false;
  function showDialogue(lines, onDone) {
    dlgQueue = lines.slice();
    dlgDone = onDone || null;
    dlgActive = true;
    nextDialogueLine();
  }
  function nextDialogueLine() {
    const box = el('dialogue');
    if (!dlgQueue.length) {
      box.classList.add('hidden');
      dlgActive = false;
      const cb = dlgDone; dlgDone = null;
      if (cb) cb();
      return;
    }
    const line = dlgQueue.shift();
    el('dlg-name').textContent = line[0];
    el('dlg-text').textContent = line[1];
    box.classList.remove('hidden');
  }
  function dialogueOpen() { return dlgActive; }

  // ---- shops -------------------------------------------------------------------
  const SHOP_ITEMS = {
    arms: [
      { name: 'Pistol Ammo ×48', price: 40, can: function (G) { return true; }, buy: function (G) { G.player.reserve += 48; return 'Ammo stocked'; } },
      { name: 'Armour Vest', price: 150, can: function (G) { return G.player.armor < 100; }, buy: function (G) { G.player.armor = 100; return 'Vest fitted — armour full'; } },
    ],
    garage: [
      { name: 'Full Repair (current car)', price: 80, can: function (G) { return !!G.player.inCar && G.player.inCar.health < 100; }, buy: function (G) { G.player.inCar.health = 100; G.player.inCar.dead = false; return 'Good as new'; } },
      { name: 'Street Tune (this visit)', price: 120, can: function (G) { return !!G.player.inCar; }, buy: function (G) { G.player.inCar.cruise += 2; return 'She pulls harder now'; } },
    ],
    stitch: [
      { name: 'Tailored Outfit (+25 max health)', price: 200, can: function (G) { return G.player.maxHealth < 125; }, buy: function (G) { G.player.maxHealth = 125; G.player.health = Math.min(125, G.player.health + 25); return 'Sharp. Healthier, too'; } },
      { name: 'Rain Cap', price: 25, can: function () { return true; }, buy: function () { return 'The rain respects the cap now'; } },
    ],
    noodle: [
      { name: 'Noodle Bowl (heal 50)', price: 15, can: function (G) { return G.player.health < G.player.maxHealth; }, buy: function (G) { G.player.health = Math.min(G.player.maxHealth, G.player.health + 50); return 'Warm to the bone'; } },
      { name: 'Harbour Feast (full heal)', price: 35, can: function (G) { return G.player.health < G.player.maxHealth; }, buy: function (G) { G.player.health = G.player.maxHealth; return 'Fully restored'; } },
    ],
    pawn: [
      { name: 'Sell All Loot', price: 0, dynamic: function (G) { return '$' + (G.player.loot * 45); }, can: function (G) { return G.player.loot > 0; }, buy: function (G) { const v = G.player.loot * 45; G.player.loot = 0; G.player.cash += v; return 'Sold for $' + v; } },
      { name: 'Sell Spare Watch', price: -30, can: function () { return true; }, buy: function (G) { G.player.cash += 30; return 'Watch sold for $30'; } },
    ],
    clinic: [
      { name: 'Full Treatment', price: 50, can: function (G) { return G.player.health < G.player.maxHealth || G.player.armor < 50; }, buy: function (G) { G.player.health = G.player.maxHealth; return 'Patched up, fully'; } },
      { name: 'Harbour Surgery (+10 max health)', price: 120, can: function (G) { return G.player.maxHealth < 150; }, buy: function (G) { G.player.maxHealth += 10; G.player.health = G.player.maxHealth; return 'Stronger than before'; } },
    ],
  };
  let shopState = null;
  function openShop(G, shop) {
    shopState = { shop: shop, sel: 0 };
    G.shopOpen = true;
    renderShop(G);
  }
  function closeShop(G) {
    shopState = null;
    G.shopOpen = false;
    el('shopmenu').classList.add('hidden');
  }
  function renderShop(G) {
    if (!shopState) return;
    const items = SHOP_ITEMS[shopState.shop.id] || [];
    el('shop-title').textContent = shopState.shop.name + ' — $' + G.player.cash;
    let html = '';
    items.forEach(function (it, i) {
      const can = it.can(G);
      const price = it.dynamic ? it.dynamic(G) : (it.price < 0 ? '$' + (-it.price) + ' paid to you' : '$' + it.price);
      html += '<div class="shop-row' + (i === shopState.sel ? ' sel' : '') + '">' +
        '<span class="' + (can ? '' : 'cant') + '">' + it.name + '</span>' +
        '<span class="price">' + price + '</span></div>';
    });
    el('shop-items').innerHTML = html;
    el('shopmenu').classList.remove('hidden');
  }
  function shopKey(G, key) {
    if (!shopState) return;
    const items = SHOP_ITEMS[shopState.shop.id] || [];
    if (key === 'ArrowUp') shopState.sel = (shopState.sel + items.length - 1) % items.length;
    else if (key === 'ArrowDown') shopState.sel = (shopState.sel + 1) % items.length;
    else if (key === 'Enter') {
      const it = items[shopState.sel];
      if (it && it.can(G)) {
        if (it.price > 0) {
          if (G.player.cash < it.price) { toast('Not enough cash'); renderShop(G); return; }
          G.player.cash -= it.price;
        }
        toast(it.buy(G));
        V.sound.chime();
      } else toast('Not available right now');
    }
    renderShop(G);
    refreshHUD(G);
  }
  function shopOpenNow() { return !!shopState; }

  // ---- save / load ---------------------------------------------------------------
  const SAVE_KEY = 'velmara-after-dark-save-v1';
  function saveGame(G) {
    try {
      const p = G.player;
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: p.cash, rep: p.rep, missionIndex: p.missionIndex,
        maxHealth: p.maxHealth, x: p.x, z: p.z, clockMin: p.clockMin,
        reserve: p.reserve, loot: p.loot,
      }));
    } catch (e) { /* private mode: saving is best-effort */ }
  }
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function applySave(G, s) {
    const p = G.player;
    p.cash = s.cash; p.rep = s.rep; p.missionIndex = s.missionIndex;
    p.maxHealth = s.maxHealth || 100; p.health = p.maxHealth;
    p.x = s.x; p.z = s.z; p.clockMin = s.clockMin || 21 * 60;
    p.reserve = s.reserve || 60; p.loot = s.loot || 0;
    p.mesh.position.set(p.x, 0, p.z);
  }

  function showEnd(G, title, sub, busted) {
    el('end-title').textContent = title;
    el('end-sub').textContent = sub;
    el('endcard').classList.toggle('busted', !!busted);
    el('endcard').classList.remove('hidden');
  }
  function hideEnd() { el('endcard').classList.add('hidden'); }

  V.overlay = {
    toast: toast, setPrompt: setPrompt, refreshHUD: refreshHUD,
    refreshObjective: refreshObjective, drawMinimap: drawMinimap, drawBigmap: drawBigmap,
    showDialogue: showDialogue, nextDialogueLine: nextDialogueLine, dialogueOpen: dialogueOpen,
    openShop: openShop, closeShop: closeShop, shopKey: shopKey, shopOpenNow: shopOpenNow,
    saveGame: saveGame, loadSave: loadSave, applySave: applySave,
    showEnd: showEnd, hideEnd: hideEnd, rankName: rankName, el: el,
  };
})(window.VAD);
