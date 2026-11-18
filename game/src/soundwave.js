// soundwave.js — all of Velmara's sound is synthesised WebAudio: engine,
// sirens, gunshots, rain hiss, crashes, till chimes, and four radio stations
// (Bassline FM's synth bass loop, Neon Wave's synthwave arps, Rain FM's
// ambient pads, Harbor Talk's low blip chatter). M mutes everything.
window.VAD = window.VAD || {};
(function (V) {
  'use strict';

  const STATIONS = ['Bassline FM', 'Neon Wave', 'Rain FM', 'Harbor Talk'];

  const S = {
    ctx: null, master: null, muted: false,
    station: 0, radioOn: false, step: 0, nextNoteAt: 0,
    engineOsc: null, engineGain: null, engineFilter: null,
    sirenOsc: null, sirenGain: null, sirenFlip: 0,
    rainGain: null,
  };

  function ensure() {
    if (S.ctx) { if (S.ctx.state === 'suspended') S.ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      S.ctx = new AC();
      S.master = S.ctx.createGain();
      S.master.gain.value = S.muted ? 0 : 0.5;
      S.master.connect(S.ctx.destination);
      startRain();
      return true;
    } catch (e) { return false; }
  }

  function startRain() {
    const ctx = S.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 900;
    S.rainGain = ctx.createGain(); S.rainGain.gain.value = 0.035;
    src.connect(filt); filt.connect(S.rainGain); S.rainGain.connect(S.master);
    src.start();
  }

  function blip(freq, dur, type, vol, when) {
    if (!S.ctx) return;
    const t = when || S.ctx.currentTime;
    const o = S.ctx.createOscillator();
    const g = S.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(S.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, freq) {
    if (!S.ctx) return;
    const ctx = S.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = freq || 1800;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(filt); filt.connect(g); g.connect(S.master);
    src.start();
  }

  // Radio sequencer: 8th-note steps at 112 BPM, one pattern per station.
  const BASS = [55, 0, 55, 55, 0, 65.4, 0, 55, 49, 0, 49, 49, 0, 73.4, 0, 82.4];
  const ARP = [220, 261.6, 329.6, 440, 329.6, 261.6, 293.7, 392, 220, 261.6, 329.6, 440, 523.3, 440, 329.6, 261.6];
  const PADS = [110, 130.8, 164.8, 196];
  function scheduleRadio() {
    if (!S.ctx || !S.radioOn) return;
    const stepDur = 60 / 112 / 2;
    while (S.nextNoteAt < S.ctx.currentTime + 0.12) {
      const s = S.step % 16;
      const t = S.nextNoteAt;
      if (S.station === 0) {
        if (BASS[s]) blip(BASS[s], stepDur * 1.8, 'square', 0.16, t);
        if (s % 4 === 0) noiseBurstAt(0.05, 0.05, 6000, t);
      } else if (S.station === 1) {
        blip(ARP[s], stepDur * 1.1, 'sawtooth', 0.05, t);
        if (s % 8 === 0 && BASS[s]) blip(BASS[s] * 2, stepDur * 3, 'triangle', 0.1, t);
      } else if (S.station === 2) {
        if (s === 0) {
          const root = PADS[Math.floor(S.step / 16) % 4];
          blip(root, stepDur * 14, 'triangle', 0.07, t);
          blip(root * 1.5, stepDur * 14, 'sine', 0.05, t);
        }
      } else {
        if (Math.random() < 0.3) blip(300 + Math.random() * 500, 0.05, 'sine', 0.06, t);
        if (s === 12) blip(180, 0.16, 'sine', 0.07, t);
      }
      S.step++;
      S.nextNoteAt += stepDur;
    }
  }
  function noiseBurstAt(dur, vol, freq, when) {
    if (!S.ctx) return;
    const ctx = S.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(filt); filt.connect(g); g.connect(S.master);
    src.start(when);
  }

  function engineStart() {
    if (!ensure() || S.engineOsc) return;
    const ctx = S.ctx;
    S.engineOsc = ctx.createOscillator();
    S.engineOsc.type = 'sawtooth'; S.engineOsc.frequency.value = 55;
    S.engineFilter = ctx.createBiquadFilter();
    S.engineFilter.type = 'lowpass'; S.engineFilter.frequency.value = 320;
    S.engineGain = ctx.createGain(); S.engineGain.gain.value = 0.05;
    S.engineOsc.connect(S.engineFilter); S.engineFilter.connect(S.engineGain); S.engineGain.connect(S.master);
    S.engineOsc.start();
  }
  function engineStop() {
    if (S.engineOsc) { try { S.engineOsc.stop(); } catch (e) {} S.engineOsc = null; }
  }
  function engineUpdate(speedRatio) {
    if (S.engineOsc && S.ctx) {
      S.engineOsc.frequency.value = 50 + Math.abs(speedRatio) * 130;
      S.engineFilter.frequency.value = 300 + Math.abs(speedRatio) * 700;
    }
  }
  function sirenUpdate(active) {
    if (!S.ctx) return;
    if (active && !S.sirenOsc) {
      S.sirenOsc = S.ctx.createOscillator();
      S.sirenOsc.type = 'triangle'; S.sirenOsc.frequency.value = 700;
      S.sirenGain = S.ctx.createGain(); S.sirenGain.gain.value = 0.028;
      S.sirenOsc.connect(S.sirenGain); S.sirenGain.connect(S.master);
      S.sirenOsc.start();
    } else if (!active && S.sirenOsc) {
      try { S.sirenOsc.stop(); } catch (e) {} S.sirenOsc = null;
    }
    if (S.sirenOsc) {
      S.sirenFlip += 0.05;
      S.sirenOsc.frequency.value = (Math.sin(S.sirenFlip * 6) > 0) ? 950 : 650;
    }
  }

  V.sound = {
    STATIONS: STATIONS,
    ensure: ensure,
    get muted() { return S.muted; },
    toggleMute: function () {
      S.muted = !S.muted;
      if (S.master && S.ctx) S.master.gain.value = S.muted ? 0 : 0.5;
      return S.muted;
    },
    shot: function () { noiseBurst(0.14, 0.30, 1500); blip(160, 0.08, 'square', 0.1); },
    enemyShot: function () { noiseBurst(0.1, 0.12, 1200); },
    crash: function () { noiseBurst(0.25, 0.3, 400); },
    chime: function () { if (ensure()) { blip(880, 0.12, 'sine', 0.12); setTimeout(function () { blip(1320, 0.16, 'sine', 0.12); }, 90); } },
    fail: function () { if (ensure()) blip(140, 0.4, 'sawtooth', 0.12); },
    click: function () { if (ensure()) blip(660, 0.05, 'square', 0.06); },
    engineStart: engineStart, engineStop: engineStop, engineUpdate: engineUpdate,
    sirenUpdate: sirenUpdate,
    setRadio: function (on) {
      S.radioOn = on;
      if (on && ensure()) { S.nextNoteAt = S.ctx.currentTime + 0.05; }
      if (!on) engineStopRadioOnly();
    },
    cycleStation: function () {
      S.station = (S.station + 1) % STATIONS.length;
      S.step = 0;
      if (S.ctx) S.nextNoteAt = S.ctx.currentTime + 0.05;
      return STATIONS[S.station];
    },
    stationName: function () { return STATIONS[S.station]; },
    update: function () { scheduleRadio(); },
  };
  function engineStopRadioOnly() { /* radio off leaves engine hum alone */ }
})(window.VAD);
