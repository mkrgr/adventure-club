// Adventure Club – synthetische Soundeffekte (Web Audio, keine Dateien nötig)
var AC = globalThis.AC = globalThis.AC || {};
AC.Audio = (function () {
  'use strict';
  let ctx = null, master = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('adventureClub.muted') === '1'; } catch (e) { /* ignore */ }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.45;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }

  function tone(f, d, type, v, f2, delay) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v || 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, v, freq, ftype, delay, freq2) {
    const t = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = ftype || 'lowpass';
    f.frequency.setValueAtTime(freq || 1000, t);
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(v || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.5, d + 0.05);
  }
  const arp = (notes, step, type, v) => notes.forEach((n, i) => tone(n, step * 2.2, type || 'triangle', v || 0.12, null, i * step));

  const SFX = {
    step: () => noise(0.05, 0.035, 700),
    crack: () => { noise(0.08, 0.08, 1800, 'bandpass'); },
    push: () => { noise(0.32, 0.22, 260); tone(70, 0.3, 'sine', 0.12, 45); },
    thud: () => { tone(90, 0.5, 'sine', 0.35, 30); noise(0.5, 0.3, 400, 'lowpass', 0, 80); },
    smash: () => { noise(0.45, 0.4, 1600, 'lowpass', 0, 200); tone(120, 0.25, 'square', 0.08, 50); },
    lever: () => { tone(420, 0.05, 'square', 0.08); tone(260, 0.08, 'square', 0.08, null, 0.06); noise(0.1, 0.08, 2500, 'highpass'); },
    dial: () => { noise(0.12, 0.12, 900, 'bandpass'); tone(200, 0.08, 'triangle', 0.08, 160); },
    plate: () => { tone(160, 0.12, 'square', 0.06, 110); noise(0.08, 0.08, 600); },
    door: () => { noise(0.9, 0.2, 300, 'lowpass', 0, 120); tone(55, 0.9, 'sawtooth', 0.05, 40); },
    bridge: () => { for (let i = 0; i < 5; i++) noise(0.06, 0.12, 1200, 'bandpass', i * 0.08); },
    read: () => arp([523, 659, 784, 1047], 0.09, 'sine', 0.1),
    gem: () => arp([1047, 1319, 1568, 2093], 0.06, 'triangle', 0.1),
    item: () => arp([659, 880, 1175], 0.08, 'triangle', 0.12),
    whip: () => { noise(0.12, 0.35, 3000, 'highpass', 0.05); tone(1800, 0.05, 'square', 0.05, 600); },
    swing: () => { noise(0.7, 0.12, 400, 'bandpass', 0, 1600); arp([392, 523, 659], 0.12, 'triangle', 0.08); },
    jump: () => tone(300, 0.25, 'square', 0.08, 700),
    hurt: () => { tone(400, 0.3, 'sawtooth', 0.12, 120); },
    spikesUp: () => { noise(0.1, 0.12, 4000, 'highpass'); tone(900, 0.05, 'square', 0.04); },
    spikesDown: () => noise(0.12, 0.05, 900, 'lowpass'),
    switch: () => tone(660, 0.07, 'triangle', 0.08, 880),
    sprint: () => tone(500, 0.18, 'square', 0.07, 1200),
    click: () => tone(800, 0.04, 'square', 0.05),
    arrow: () => { for (let i = 0; i < 3; i++) noise(0.15, 0.2, 3500, 'highpass', i * 0.07, 800); },
    rumble: () => { noise(1.6, 0.35, 160, 'lowpass', 0, 60); tone(45, 1.6, 'sawtooth', 0.08, 30); },
    win: () => arp([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 'square', 0.07),
    fail: () => arp([440, 392, 349, 262], 0.18, 'sawtooth', 0.08),
    chapter: () => arp([392, 523, 659, 784], 0.14, 'triangle', 0.1),
  };

  return {
    init,
    play(name) {
      if (!ctx || muted) return;
      if (ctx.state === 'suspended') ctx.resume();
      const f = SFX[name];
      if (f) try { f(); } catch (e) { /* ignore */ }
    },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('adventureClub.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      return muted;
    },
    get muted() { return muted; },
  };
})();
