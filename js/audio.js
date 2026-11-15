/* Lumora Rush — tiny WebAudio synth (no audio files, works fully offline) */
(function () {
  'use strict';
  let ac = null, master, sfxG, musG, sfxOn = true, musOn = true, timer = null, nextT = 0, step = 0, shift = 0;
  const PENT = [0, 2, 4, 7, 9];
  const CHORDS = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]];
  const hz = (base, semi) => base * Math.pow(2, semi / 12);

  function blip(f, d, type, vol, delay, to, dest) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || sfxG);
    o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, vol, delay) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0), n = Math.floor(ac.sampleRate * d);
    const b = ac.createBuffer(1, n, ac.sampleRate), data = b.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900; s.buffer = b; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(sfxG); s.start(t);
  }
  function sched() {
    if (!ac || !musOn) return;
    while (nextT < ac.currentTime + 0.3) {
      const bar = Math.floor(step / 8) % 4, i = step % 8, ch = CHORDS[bar];
      const notes = [ch[0], ch[1], ch[2], ch[0] + 12];
      const base = 220 * Math.pow(2, shift / 12), idx = [0, 1, 2, 3, 2, 1, 3, 2][i];
      const delay = nextT - ac.currentTime;
      blip(hz(base, notes[idx]), 0.32, 'triangle', 0.5, delay, 0, musG);
      if (i === 0) blip(hz(base, ch[0] - 12), 0.9, 'sine', 0.8, delay, 0, musG);
      if (i === 4) blip(hz(base, ch[2]), 0.5, 'sine', 0.25, delay, 0, musG);
      nextT += 0.27; step++;
    }
  }
  const A = {
    init() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      try {
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        ac = new C(); master = ac.createGain(); master.gain.value = 0.85; master.connect(ac.destination);
        sfxG = ac.createGain(); sfxG.gain.value = 0.55; sfxG.connect(master);
        musG = ac.createGain(); musG.gain.value = 0.13; musG.connect(master);
        if (musOn) A.startMusic();
      } catch (e) { ac = null; }
    },
    setSfx(v) { sfxOn = v; }, setMusic(v) { musOn = v; if (ac) v ? A.startMusic() : A.stopMusic(); },
    setWorld(w) { shift = [0, 2, -2, 5, -4][w % 5]; },
    startMusic() { if (!ac || timer) return; nextT = ac.currentTime + 0.1; timer = setInterval(sched, 60); },
    stopMusic() { clearInterval(timer); timer = null; },
    suspend() { if (ac && ac.state === 'running') ac.suspend(); }, resume() { if (ac && ac.state === 'suspended') ac.resume(); },
    collect(combo) { if (!sfxOn) return; const c = Math.min(combo, 14); blip(hz(523.25, PENT[c % 5] + 12 * Math.floor(c / 5)), 0.16, 'triangle', 0.35); },
    gem() { if (!sfxOn) return; blip(880, 0.12, 'sine', 0.3); blip(1318, 0.22, 'sine', 0.28, 0.07); },
    jump() { if (sfxOn) blip(280, 0.18, 'sine', 0.3, 0, 640); },
    land() { if (sfxOn) blip(130, 0.14, 'sine', 0.35, 0, 55); },
    hit() { if (!sfxOn) return; blip(220, 0.35, 'sawtooth', 0.28, 0, 45); noise(0.3, 0.5); },
    power() { if (!sfxOn) return; [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.15, 'square', 0.14, i * 0.06)); },
    click() { if (sfxOn) blip(520, 0.07, 'triangle', 0.25, 0, 700); },
    tick() { if (sfxOn) blip(440, 0.12, 'sine', 0.3); },
    go() { if (sfxOn) blip(880, 0.3, 'sine', 0.35); },
    win() { if (!sfxOn) return; [523, 659, 784, 1046, 1318].forEach((f, i) => blip(f, 0.3, 'triangle', 0.3, i * 0.11)); },
    lose() { if (!sfxOn) return; [392, 330, 262, 196].forEach((f, i) => blip(f, 0.3, 'sawtooth', 0.16, i * 0.16, f * 0.9)); },
    buy() { if (!sfxOn) return; [660, 880, 1320].forEach((f, i) => blip(f, 0.14, 'square', 0.14, i * 0.07)); }
  };
  window.LumoraAudio = A;
})();
