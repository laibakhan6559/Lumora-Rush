/* Lumora Rush — game engine, rendering, UI. Pure canvas, no dependencies, fully offline. */
(function () {
  'use strict';
  const LV = window.LumoraLevels, Snd = window.LumoraAudio;
  const TW = LV.TW, WORLDS = LV.WORLDS, NLV = LV.N;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;

  /* ---------------- save data ---------------- */
  const KEY = 'lumora-rush-save-v1';
  const DEF = { unlocked: 1, stars: {}, best: {}, crystals: 0, skin: 'aqua', owned: ['aqua'], sfx: true, music: true, vib: true };
  let save = loadSave();
  function loadSave() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* storage blocked */ }
    return Object.assign(JSON.parse(JSON.stringify(DEF)), o && typeof o === 'object' ? o : {});
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }
  if (/[?&]unlock=1/.test(location.search)) save.unlocked = NLV;

  /* ---------------- colour helpers ---------------- */
  const rgbCache = {};
  function rgb(h) {
    if (rgbCache[h]) return rgbCache[h];
    let s = h.replace('#', ''); if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    return (rgbCache[h] = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]);
  }
  const mixCache = {};
  function mix(a, b, t) {
    const k = a + b + (t * 100 | 0); if (mixCache[k]) return mixCache[k];
    const x = rgb(a), y = rgb(b);
    return (mixCache[k] = 'rgb(' + Math.round(lerp(x[0], y[0], t)) + ',' + Math.round(lerp(x[1], y[1], t)) + ',' + Math.round(lerp(x[2], y[2], t)) + ')');
  }
  function rgba(h, a) { const c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------------- skins ---------------- */
  const SKINS = [
    { id: 'aqua', name: 'Aqua Spark', price: 0, c: ['#d6fbff', '#38c9ff', '#1764d8'], trail: '#6ef0ff' },
    { id: 'sun', name: 'Sunny Sprout', price: 25, c: ['#fff8b8', '#ffc93d', '#ff8a1f'], trail: '#ffe27a' },
    { id: 'rose', name: 'Rose Quartz', price: 50, c: ['#ffe0f3', '#ff6fb5', '#c2218a'], trail: '#ff9ed2' },
    { id: 'mint', name: 'Mint Comet', price: 80, c: ['#e0fff0', '#4dffb0', '#0b9a68'], trail: '#8bffd0' },
    { id: 'plum', name: 'Plum Eclipse', price: 120, c: ['#eadcff', '#9b6bff', '#4a1fa8'], trail: '#c2a3ff' },
    { id: 'lava', name: 'Lava Pop', price: 160, c: ['#ffe2b8', '#ff6a3d', '#b3151f'], trail: '#ffa05e' },
    { id: 'pearl', name: 'Ghost Pearl', price: 220, c: ['#ffffff', '#dbe5ff', '#8ea3d8'], trail: '#ffffff' },
    { id: 'prism', name: 'Prism', price: 300, c: ['#fff', '#fff', '#fff'], rainbow: true, trail: '#ffffff' }
  ];
  const skinById = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
  function skinCols(sk, t) {
    if (sk.rainbow) { const h = (t * 70) % 360; return { c0: 'hsl(' + h + ',100%,90%)', c1: 'hsl(' + h + ',95%,62%)', c2: 'hsl(' + ((h + 50) % 360) + ',85%,38%)', glow: (a) => 'hsla(' + h + ',100%,62%,' + a + ')' }; }
    return { c0: sk.c[0], c1: sk.c[1], c2: sk.c[2], glow: (a) => rgba(sk.c[1], a) };
  }

  /* draw Lumi (used in-game, title mascot and shop previews) */
  function drawOrb(c, x, y, R, sk, o) {
    o = o || {};
    const col = skinCols(sk, o.t || 0), t = o.t || 0;
    c.save(); c.translate(x, y); c.scale(o.sx || 1, o.sy || 1);
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    // halo
    const hr = o.halo || 2.0;
    let g = c.createRadialGradient(0, 0, R * 0.5, 0, 0, R * hr);
    g.addColorStop(0, col.glow(0.42)); g.addColorStop(1, col.glow(0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * hr, 0, TAU); c.fill();
    // antenna
    const sway = Math.sin(t * 5) * 0.12 * R;
    c.strokeStyle = col.c2; c.lineWidth = R * 0.08; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -R * 0.92); c.quadraticCurveTo(R * 0.05 + sway, -R * 1.2, R * 0.16 + sway * 1.6, -R * 1.42); c.stroke();
    star4(c, R * 0.16 + sway * 1.6, -R * 1.5, R * 0.22, '#fff6b0', '#ffd45e', t * 2);
    // body
    g = c.createRadialGradient(-R * 0.35, -R * 0.42, R * 0.08, 0, 0, R * 1.02);
    g.addColorStop(0, col.c0); g.addColorStop(0.5, col.c1); g.addColorStop(1, col.c2);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = R * 0.05;
    c.beginPath(); c.arc(0, 0, R * 0.93, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(-R * 0.45, -R * 0.55, R * 0.16, R * 0.09, -0.7, 0, TAU); c.fill();
    // eyes
    const bl = o.blink || 0, er = R * 0.27, look = clamp(o.look || 0, -1, 1);
    for (let s = -1; s <= 1; s += 2) {
      const ex = s * R * 0.34, ey = -R * 0.06;
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, er, er * (1 - bl * 0.92), 0, 0, TAU); c.fill();
      if (bl < 0.7) {
        c.fillStyle = '#1b1040'; c.beginPath(); c.arc(ex + look * er * 0.38, ey + er * 0.05, er * 0.52, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + look * er * 0.38 - er * 0.17, ey - er * 0.14, er * 0.17, 0, TAU); c.fill();
      }
      c.fillStyle = 'rgba(255,110,170,.38)'; c.beginPath(); c.arc(s * R * 0.56, R * 0.22, R * 0.12, 0, TAU); c.fill();
    }
    // mouth
    if ((o.mouth || 0) > 0.3) {
      c.fillStyle = '#4a0f2c'; c.beginPath(); c.ellipse(0, R * 0.33, R * 0.17, R * 0.2 * o.mouth, 0, 0, TAU); c.fill();
      c.fillStyle = '#ff6f9c'; c.beginPath(); c.ellipse(0, R * 0.4, R * 0.1, R * 0.07, 0, 0, TAU); c.fill();
    } else {
      c.strokeStyle = '#2a0f47'; c.lineWidth = R * 0.065; c.lineCap = 'round';
      c.beginPath(); c.arc(0, R * 0.16, R * 0.3, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
    }
    if (o.shield) {
      const sg = c.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.45);
      sg.addColorStop(0, 'rgba(110,243,255,.05)'); sg.addColorStop(1, 'rgba(110,243,255,.38)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, R * 1.45, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(200,255,255,.9)'; c.lineWidth = R * 0.05; c.stroke();
    }
    c.restore();
  }
  function star4(c, x, y, r, f1, f2, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    c.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.38 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); const g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, f1); g.addColorStop(1, f2); c.fillStyle = g; c.fill(); c.restore();
  }

  /* ---------------- canvas & camera ---------------- */
  const cv = $('#game'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, F = 1, HY = 0, CX = 0, CAMH = 5;
  const D = 6.6; let DRAW = 70;
  let camZ = -D, camX = 0, shx = 0, shy = 0;
  let quality = 1;            // adaptive render scale (1 = best). Drops automatically on slow devices.
  const MAX_PIXELS = 1.15e6;  // keeps fill-rate low on high-DPI phones
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 1.75, Math.sqrt(MAX_PIXELS / (W * H))) * quality;
    DPR = Math.max(DPR, 0.55);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2;
    const portrait = H > W * 1.05;
    HY = H * (portrait ? 0.38 : 0.3);
    const half = Math.min(W * 0.46, H * 0.56);
    F = half * D / TW;
    CAMH = Math.max(2.4, (H * 0.8 - HY) / (F / D));
    initStars();
  }
  // adaptive quality: if frames are consistently slow, lower the render resolution a step
  let fAcc = 0, fN = 0;
  function watchPerf(dt) {
    if (S.mode === 'paused' || document.hidden) { fAcc = fN = 0; return; }
    fAcc += dt; fN++;
    if (fN >= 40) {
      const avg = fAcc / fN; fAcc = fN = 0;
      if (avg > 0.024 && quality > 0.55) { quality = Math.max(0.55, quality - 0.15); if (quality < 0.8) DRAW = 56; resize(); }
    }
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));
  const PP = []; for (let i = 0; i < 6000; i++) PP.push([0, 0, 0]); let ppi = 0;
  function proj(x, y, z) { const s = F / Math.max(0.35, z - camZ), o = PP[ppi = (ppi + 1) % 6000]; o[0] = CX + (x - camX) * s + shx; o[1] = HY + (CAMH - y) * s + shy; o[2] = s; return o; }

  /* ---------------- game state ---------------- */
  const S = {
    mode: 'menu', L: null, t: 0, pz: 0, px: 0, py: 0, vy: 0, tx: 0, v: 0, size: 5, gems: 0, got: 0, combo: 0, comboT: 0,
    inv: 0, shield: false, magnet: 0, shake: 0, falling: false, jumpBuf: 0, air: 0, countT: 0, endT: 0, god: false,
    kl: false, kr: false, blink: 0, blinkT: 2, squash: 0, lookX: 0, menuWorld: 0
  };
  const parts = [], floats = [];
  let stars = [], streaks = [], planets = [];
  const items = [], pool = []; let ni = 0;
  function mkItem(z, k, i, e) { const o = pool[ni] || (pool[ni] = {}); ni++; o.z = z; o.k = k; o.i = i; o.e = e; items.push(o); }
  let curLevel = 1, lastScreen = 'title', hintT = 0;

  function rad() { return 0.44 + Math.min(S.size, 36) * 0.019; }
  function world() { return WORLDS[S.mode === 'menu' || !S.L ? S.menuWorld : S.L.world]; }

  function initStars() {
    stars = []; for (let i = 0; i < 60; i++) stars.push({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.4, p: Math.random() * 6 });
    streaks = []; for (let i = 0; i < 40; i++) streaks.push({ a: 0.12 + Math.random() * 0.76, r: Math.random() });
    planets = [{ ax: -0.62, ay: 0.55, r: 0.11 }, { ax: 0.55, ay: 0.3, r: 0.065 }];
  }

  /* ---------------- level control ---------------- */
  function startLevel(n) {
    n = clamp(n | 0, 1, NLV); curLevel = n;
    const L = LV.build(n); S.L = L;
    Object.assign(S, { mode: 'ready', pz: 0, px: 0, py: 0, vy: 0, tx: 0, v: 0, size: 5, gems: 0, got: 0, combo: 0, comboT: 0, inv: 0, shield: false, magnet: 0,
      shake: 0, falling: false, jumpBuf: 0, air: 0, countT: 0, endT: 0, squash: 0, lookX: 0 });
    parts.length = 0; floats.length = 0;
    camZ = -D; camX = 0;
    L.ents.forEach((e) => { e.got = false; });
    Snd.setWorld(L.world);
    hideAllScreens(); $('#hud').classList.remove('hidden'); document.body.classList.add('playing');
    $('#hud-level').textContent = 'Level ' + n;
    $('#hud-size').textContent = S.size; $('#hud-gems').textContent = 0; $('#hud-bar').style.width = '0';
    $('#buffs').innerHTML = '';
    const cnt = $('#count'); cnt.classList.remove('hidden'); cnt.textContent = '3'; cnt.style.animation = 'none'; void cnt.offsetWidth; cnt.style.animation = '';
    Snd.tick();
    const hint = $('#hint');
    if (n <= 2) { hint.textContent = ('ontouchstart' in window ? 'Drag to steer · Swipe up or tap to jump' : 'Arrow keys / drag to steer · Space to jump'); hint.classList.add('show'); hintT = 5.5; } else { hint.classList.remove('show'); hintT = 0; }
  }
  function hideAllScreens() { $$('.screen').forEach((s) => s.classList.remove('show')); }
  function showScreen(id) { hideAllScreens(); $('#' + id).classList.add('show'); }
  function toMenu(id) {
    S.mode = 'menu'; S.L = null; $('#hud').classList.add('hidden'); $('#count').classList.add('hidden'); document.body.classList.remove('playing');
    S.menuWorld = Math.floor((Math.min(save.unlocked, NLV) - 1) / 10); Snd.setWorld(S.menuWorld);
    parts.length = 0; floats.length = 0;
    refreshMenus(); showScreen(id || 's-title');
  }

  function hit(force) {
    if (S.inv > 0 || S.god) return;
    if (S.shield && !force) { S.shield = false; S.inv = 1.0; burst(S.px, S.py + rad(), S.pz, '#6ef3ff', 22, 5); addFloat('Aegis!', '#6ef3ff'); Snd.hit(); renderBuffs(); return; }
    S.size -= 3; S.inv = 1.4; S.shake = 0.45; S.combo = 0; Snd.hit(); vib(60);
    burst(S.px, S.py + rad(), S.pz, '#ff5c8a', 26, 6); addFloat('-3', '#ff5c8a');
    bumpSize();
    if (S.size <= 0) { S.size = 0; lose(); }
  }
  function lose() {
    if (S.mode !== 'play') return;
    S.mode = 'lose'; S.endT = 0; burst(S.px, S.py + rad(), S.pz, skinById(save.skin).trail, 60, 8); Snd.lose(); vib([80, 40, 120]);
  }
  function win() {
    S.mode = 'finish'; S.endT = 0; Snd.win(); vib([40, 30, 40]);
    for (let i = 0; i < 70; i++) {
      const hue = Math.floor(Math.random() * 360);
      parts.push({ x: S.px + (Math.random() - .5) * 4, y: 1 + Math.random() * 3, z: S.pz + 4 + Math.random() * 3, vx: (Math.random() - .5) * 5, vy: 3 + Math.random() * 5, vz: (Math.random() - .5) * 3, life: 1.8, max: 1.8, sz: 0.1 + Math.random() * 0.12, col: 'hsl(' + hue + ',100%,70%)', g: 7 });
    }
  }
  function finishResult() {
    const L = S.L, ratio = L.shards ? S.got / L.shards : 1;
    const stars = ratio >= 0.85 ? 3 : ratio >= 0.55 ? 2 : 1;
    const score = S.got * 10 + S.gems * 25 + S.size * 5;
    const oldStars = save.stars[L.n] || 0, oldBest = save.best[L.n] || 0;
    save.stars[L.n] = Math.max(oldStars, stars); save.best[L.n] = Math.max(oldBest, score);
    save.unlocked = Math.max(save.unlocked, Math.min(NLV, L.n + 1));
    const bonus = stars * 5; save.crystals += S.gems + bonus; persist();
    $('#r-title').textContent = L.n >= NLV ? 'Galaxy Cleared!' : 'Level Complete!';
    $('#r-sub').textContent = L.name;
    const st = $('#r-stars'); st.style.display = ''; Array.from(st.children).forEach((el, i) => { el.className = ''; void el.offsetWidth; if (i < stars) el.className = 'on'; });
    $('#r-stats').innerHTML = '<div>Star shards<b>' + S.got + ' / ' + L.shards + '</b></div><div>Crystals<b>+' + (S.gems + bonus) + '</b></div><div>Score<b>' + score + '</b></div><div>Best<b>' + Math.max(oldBest, score) + '</b></div>';
    $('#r-next').style.display = L.n >= NLV ? 'none' : ''; $('#r-next').textContent = 'Next Level';
    showScreen('s-result'); $('#hud').classList.add('hidden'); document.body.classList.remove('playing');
  }
  function loseResult() {
    $('#r-title').textContent = 'Lumi Faded…'; $('#r-sub').textContent = 'Shine again — ' + S.L.name;
    $('#r-stars').style.display = 'none';
    const pct = Math.round(clamp(S.pz / S.L.len, 0, 1) * 100);
    $('#r-stats').innerHTML = '<div>Distance<b>' + pct + '%</b></div><div>Star shards<b>' + S.got + '</b></div>';
    $('#r-next').style.display = 'none';
    showScreen('s-result'); $('#hud').classList.add('hidden'); document.body.classList.remove('playing');
  }
  function pause() {
    if (S.mode !== 'play' && S.mode !== 'ready') return;
    S.prev = S.mode; S.mode = 'paused'; showScreen('s-pause'); Snd.click();
  }
  function resume() { if (S.mode === 'paused') { S.mode = S.prev || 'play'; hideAllScreens(); Snd.click(); } }

  /* ---------------- effects ---------------- */
  function vib(p) { if (save.vib && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } }
  function burst(x, y, z, col, n, sp) {
    for (let i = 0; i < n && parts.length < 220; i++) {
      const a = Math.random() * TAU, e = (Math.random() - 0.3) * sp;
      parts.push({ x, y, z, vx: Math.cos(a) * sp * Math.random(), vy: Math.random() * sp * 0.9 + 1, vz: Math.sin(a) * sp * Math.random() * 0.6 + 1, life: 0.6 + Math.random() * 0.4, max: 1, sz: 0.07 + Math.random() * 0.1, col, g: 9 });
    }
  }
  function addFloat(txt, col) { floats.push({ txt, col: col || '#fff', x: S.px, y: S.py + rad() * 2.1, z: S.pz, life: 0.9 }); }
  function bumpSize() { const c = $('#chip-size') || $('.hud-top .chip'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); $('#hud-size').textContent = S.size; }
  function renderBuffs() {
    const b = $('#buffs'); let h = '';
    if (S.shield) h += '<div class="buff" style="--c:#6ef3ff"><svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#6ef3ff" stroke="#fff" stroke-width="1.5"/></svg></div>';
    if (S.magnet > 0) h += '<div class="buff" style="--c:#ff5d73"><svg viewBox="0 0 24 24"><path d="M5 3v9a7 7 0 0014 0V3h-4v9a3 3 0 01-6 0V3z" fill="#ff5d73" stroke="#fff" stroke-width="1.2"/><path d="M5 3h4v4H5zM15 3h4v4h-4z" fill="#fff"/></svg></div>';
    b.innerHTML = h;
  }

  /* ---------------- input ---------------- */
  let ptr = null;
  function jumpReq() { S.jumpBuf = 0.14; }
  cv.addEventListener('pointerdown', (e) => {
    Snd.init(); if (S.mode !== 'play' && S.mode !== 'ready') return;
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0, jumped: false };
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.x; ptr.x = e.clientX; ptr.moved += Math.abs(dx) + Math.abs(e.clientY - ptr.y); ptr.y = e.clientY;
    S.tx = clamp(S.tx + dx / (F / D) * 1.25, -TW, TW);
    if (!ptr.jumped && ptr.sy - e.clientY > 46 && performance.now() - ptr.t < 380) { ptr.jumped = true; jumpReq(); }
  });
  const endPtr = (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    if (ptr.moved < 12 && performance.now() - ptr.t < 260) jumpReq();
    ptr = null;
  };
  cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', () => { ptr = null; });
  $('#btn-jump').addEventListener('pointerdown', (e) => { e.stopPropagation(); Snd.init(); jumpReq(); });
  window.addEventListener('keydown', (e) => {
    Snd.init();
    const k = e.code;
    if (k === 'ArrowLeft' || k === 'KeyA') S.kl = true;
    else if (k === 'ArrowRight' || k === 'KeyD') S.kr = true;
    else if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW') { if (S.mode === 'play' || S.mode === 'ready') { jumpReq(); } e.preventDefault(); }
    else if (k === 'Escape' || k === 'KeyP') { S.mode === 'paused' ? resume() : pause(); }
    if (k.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') S.kl = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') S.kr = false;
  });
  window.addEventListener('blur', () => { S.kl = S.kr = false; pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); Snd.suspend(); } else Snd.resume(); });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  /* ---------------- update ---------------- */
  function inGap(z) { const g = S.L.gaps; for (let i = 0; i < g.length; i++) if (z > g[i].z0 && z < g[i].z1) return g[i]; return null; }

  function update(dt) {
    S.t += dt;
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 1.6);
    S.blinkT -= dt; if (S.blinkT < 0) { S.blink = 1; S.blinkT = 1.5 + Math.random() * 3; }
    if (S.blink > 0) S.blink = Math.max(0, S.blink - dt * 7);
    if (S.squash > 0) S.squash = Math.max(0, S.squash - dt * 4);
    if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('#hint').classList.remove('show'); }
    updateParts(dt);

    if (S.mode === 'menu') { camZ += dt * 9; camX = lerp(camX, Math.sin(S.t * 0.4) * 0.8, dt * 2); return; }
    const L = S.L; if (!L) return;

    if (S.mode === 'ready') {
      S.countT += dt;
      const n = 3 - Math.floor(S.countT / 0.65);
      const cnt = $('#count');
      if (n >= 1) { if (cnt.textContent !== String(n)) { cnt.textContent = n; cnt.style.animation = 'none'; void cnt.offsetWidth; cnt.style.animation = ''; Snd.tick(); } }
      else { cnt.textContent = 'GO!'; cnt.style.animation = 'none'; void cnt.offsetWidth; cnt.style.animation = ''; Snd.go(); S.jumpBuf = 0; S.mode = 'play'; setTimeout(() => cnt.classList.add('hidden'), 500); }
      steer(dt); camFollow(dt); return;
    }
    if (S.mode === 'lose') { S.endT += dt; S.v = lerp(S.v, 0, dt * 4); S.pz += S.v * dt; camFollow(dt); if (S.endT > 1.0) { S.mode = 'resultwait'; loseResult(); } return; }
    if (S.mode === 'resultwait') { camFollow(dt); return; }
    if (S.mode === 'finish') {
      S.endT += dt; S.v = lerp(S.v, L.speed * 1.4, dt * 2); S.pz += S.v * dt; S.px = lerp(S.px, 0, dt * 3); S.tx = S.px;
      physics(dt, true); camFollow(dt); trail(dt);
      if (S.endT > 1.7) { S.mode = 'resultwait'; finishResult(); }
      return;
    }
    if (S.mode !== 'play') return;

    // forward motion
    S.v = lerp(S.v, L.speed, Math.min(1, dt * 3.2));
    S.pz += S.v * dt;
    steer(dt);
    physics(dt, false);
    if (S.inv > 0) S.inv -= dt;
    if (S.magnet > 0) { S.magnet -= dt; if (S.magnet <= 0) renderBuffs(); }
    if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }

    // interactions
    const r = rad(), cr = r * 0.8, cy = S.py + r, ents = L.ents;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (e.zs < S.pz - 6) continue;
      if (e.zs > S.pz + 10) break;
      if (e.got) continue;
      switch (e.t) {
        case 'shard': case 'gem': case 'shield': case 'magnet': {
          if (S.magnet > 0 && (e.t === 'shard' || e.t === 'gem')) {
            const dx = S.px - e.x, dy = cy - e.y, dz = S.pz - e.z, d = Math.hypot(dx, dy, dz);
            if (d < 6 && d > 0.01) { const k = Math.min(1, dt * 12); e.x += dx * k; e.y += dy * k; e.z += dz * k; e.zs = e.z; }
          }
          const d = Math.hypot(S.px - e.x, cy - e.y, S.pz - e.z);
          if (d < r + 0.5) {
            e.got = true;
            if (e.t === 'shard') { S.size++; S.got++; S.combo++; S.comboT = 0.7; Snd.collect(S.combo); burst(e.x, e.y, e.z, '#ffe27a', 7, 3); addFloat('+1', '#fff2a0'); bumpSize(); vib(8); }
            else if (e.t === 'gem') { S.gems++; Snd.gem(); burst(e.x, e.y, e.z, '#ff7ac8', 12, 4); addFloat('+1', '#ff9fdc'); $('#hud-gems').textContent = S.gems; vib(12); }
            else if (e.t === 'shield') { S.shield = true; Snd.power(); burst(e.x, e.y, e.z, '#6ef3ff', 22, 4); addFloat('Aegis!', '#6ef3ff'); renderBuffs(); }
            else { S.magnet = 8; Snd.power(); burst(e.x, e.y, e.z, '#ff5d73', 22, 4); addFloat('Magnet!', '#ff9aa8'); renderBuffs(); }
          }
          break;
        }
        case 'block':
          if (S.pz + 0.3 > e.z && S.pz - 0.3 < e.z + e.d && S.px + cr > e.x0 && S.px - cr < e.x1 && S.py < e.h - 0.12) hit();
          break;
        case 'ast': {
          const ax = e.cx + e.amp * Math.sin(S.t * e.sp + e.ph), ay = e.r + 0.1;
          if (Math.hypot(S.px - ax, cy - ay, S.pz - e.z) < cr + e.r * 0.85) hit();
          break;
        }
        case 'spin': {
          if (S.py < 0.85 && Math.abs(S.pz - e.z) < e.L + 1) {
            const th = S.t * e.w + e.ph, ux = Math.cos(th), uz = Math.sin(th);
            const rx = S.px - e.x, rz = S.pz - e.z, proj_ = clamp(rx * ux + rz * uz, -e.L, e.L);
            if (Math.hypot(rx - ux * proj_, rz - uz * proj_) < cr + 0.2) hit();
          }
          break;
        }
        case 'hole': {
          const d = Math.hypot(S.px - e.x, S.pz - e.z);
          if (S.py < 0.2 && d < e.R * 2.3 && d > 0.05) { const pull = 2.6 * dt * (1 - d / (e.R * 2.3)) * 3; const k = clamp(pull / d, 0, 0.3); S.px += (e.x - S.px) * k; S.tx += (e.x - S.tx) * k * 0.7; }
          if (S.py < 0.45 && d < e.R * 0.82) hit();
          break;
        }
        case 'laser': {
          if (laserState(e) === 2 && Math.abs(S.pz - e.z) < 0.4 && S.py < 0.95) hit();
          break;
        }
      }
    }

    // falling into a gap
    if (!S.falling && S.py <= 0.001) { const g = inGap(S.pz); if (g && S.pz > g.z0 + 0.35 && S.pz < g.z1 - 0.2) { S.falling = true; S.vy = -2; S.fallGap = g; Snd.hit(); } }
    if (S.falling && S.py < -7) {
      S.falling = false; S.py = 0; S.vy = 0; S.pz = S.fallGap.z0 - 4; S.px = 0; S.tx = 0; S.inv = 0; hit(true); S.inv = 1.6;
    }

    trail(dt);
    const pw = Math.round(clamp(S.pz / L.len, 0, 1) * 1000) / 10; if (pw !== S._bar) { S._bar = pw; $('#hud-bar').style.width = pw + '%'; }
    camFollow(dt);
    if (S.pz >= L.len) win();
  }
  function laserState(e) { const ph = (S.t + e.off) % 2.4; return ph < 1.0 ? 0 : ph < 1.5 ? 1 : 2; }

  function steer(dt) {
    const dir = (S.kr ? 1 : 0) - (S.kl ? 1 : 0);
    if (dir) S.tx = clamp(S.tx + dir * dt * 9.5, -TW, TW);
    const lim = TW - rad() * 0.55;
    S.tx = clamp(S.tx, -lim, lim);
    const old = S.px; S.px += (S.tx - S.px) * Math.min(1, dt * 15); S.px = clamp(S.px, -lim, lim);
    S.lookX = lerp(S.lookX, clamp((S.px - old) / Math.max(dt, 0.001) / 6, -1, 1), dt * 10);
  }
  function physics(dt, finish) {
    if (S.jumpBuf > 0) S.jumpBuf -= dt;
    const onGround = S.py <= 0.001 && !S.falling;
    if (S.jumpBuf > 0 && onGround && !finish) { S.vy = 14.4; S.jumpBuf = 0; S.py = 0.002; Snd.jump(); burst(S.px, 0.1, S.pz, '#ffffff', 6, 2); vib(10); S.squash = 0; }
    if (S.py > 0 || S.vy > 0 || S.falling) {
      S.vy -= 38 * dt; S.py += S.vy * dt;
      if (!S.falling && S.py <= 0) { if (S.vy < -4) { Snd.land(); S.squash = 1; burst(S.px, 0.05, S.pz, '#ffffff', 5, 2); } S.py = 0; S.vy = 0; }
    }
  }
  function trail(dt) {
    const sk = skinById(save.skin);
    S._tt = (S._tt || 0) + dt; if (S._tt > 0.03 && !S.falling) {
      S._tt = 0;
      parts.push({ x: S.px + (Math.random() - .5) * 0.5, y: S.py + 0.15 + Math.random() * 0.4, z: S.pz - 0.5, vx: (Math.random() - .5) * 0.6, vy: Math.random() * 0.6, vz: -1 - Math.random(), life: 0.5, max: 0.5, sz: 0.06 + Math.random() * 0.08, col: sk.rainbow ? 'hsl(' + ((S.t * 90) % 360) + ',100%,70%)' : sk.trail, g: 0 });
    }
  }
  function camFollow(dt) {
    camZ = S.pz - D; camX = lerp(camX, S.px * 0.55, Math.min(1, dt * 6));
    shx = shy = 0; if (S.shake > 0) { shx = (Math.random() - .5) * S.shake * 20; shy = (Math.random() - .5) * S.shake * 20; }
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= p.g * dt; if (p.y < 0.02 && p.g) { p.y = 0.02; p.vy *= -0.3; }
    }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.y += dt * 1.6; if (f.life <= 0) floats.splice(i, 1); }
    // warp dust
    const sp = S.mode === 'menu' ? 9 : S.v || 6;
    for (const s of streaks) { s.r += dt * (sp / 14) * (0.25 + s.r * 1.1); if (s.r > 1) { s.r = Math.random() * 0.05; s.a = 0.1 + Math.random() * 0.8; } }
  }

  /* ---------------- rendering ---------------- */
  let bgSky = null, bgVoid = null, bgKey = '';
  function buildBG(w) {
    const key = w.name + '|' + cv.width + 'x' + cv.height + '|' + HY;
    if (key === bgKey) return; bgKey = key;
    const k = cv.width / W;
    const mk = () => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d'); x.setTransform(k, 0, 0, k, 0, 0); return [c, x]; };
    const a = mk(), b = mk();
    let g = a[1].createLinearGradient(0, 0, 0, HY + 2);
    g.addColorStop(0, w.sky[0]); g.addColorStop(0.55, w.sky[1]); g.addColorStop(1, w.sky[2]);
    a[1].fillStyle = g; a[1].fillRect(0, 0, W, HY + 2);
    g = b[1].createLinearGradient(0, HY, 0, H); g.addColorStop(0, w.voidA); g.addColorStop(1, w.voidB);
    b[1].fillStyle = g; b[1].fillRect(0, HY, W, H - HY);
    g = b[1].createLinearGradient(0, HY - H * 0.1, 0, HY + H * 0.14);
    g.addColorStop(0, rgba(w.glow, 0)); g.addColorStop(0.42, rgba(w.glow, 0.55)); g.addColorStop(1, rgba(w.glow, 0));
    b[1].fillStyle = g; b[1].fillRect(0, HY - H * 0.1, W, H * 0.24);
    bgSky = a[0]; bgVoid = b[0];
  }
  function drawSky(w) {
    buildBG(w);
    ctx.drawImage(bgSky, 0, 0, W, H);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < stars.length; i += 2) { const s = stars[i]; ctx.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin(S.t * 1.3 + s.p))) * (1 - s.y * 0.7); ctx.fillRect(s.x * W, s.y * HY * 0.95, s.r, s.r); }
    ctx.globalAlpha = 1;
    planets.forEach((p, i) => {
      const x = CX + p.ax * W * 0.5 - camX * 3, y = HY * p.ay, r = Math.min(W, H) * p.r * (i ? 1 : 1.3);
      const g2 = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g2.addColorStop(0, w.planet[0]); g2.addColorStop(1, w.planet[1]);
      if (w.ring || i === 0) { ctx.strokeStyle = rgba(w.planet[0], 0.55); ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.ellipse(x, y, r * 1.7, r * 0.42, -0.35, Math.PI, TAU); ctx.stroke(); }
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      if (w.ring || i === 0) { ctx.beginPath(); ctx.ellipse(x, y, r * 1.7, r * 0.42, -0.35, 0, Math.PI); ctx.stroke(); }
    });
    ctx.drawImage(bgVoid, 0, 0, W, H);
    const maxD = Math.hypot(W, H) * 0.8; ctx.lineCap = 'round'; ctx.strokeStyle = w.glow;
    for (let i = 0; i < streaks.length; i += 2) {
      const s = streaks[i], d = s.r * s.r * maxD, d2 = d * (0.9 - s.r * 0.1), a = Math.PI * s.a, ca = Math.cos(a), sa = Math.sin(a);
      ctx.globalAlpha = s.r * 0.75; ctx.lineWidth = 0.6 + s.r * 2.6;
      ctx.beginPath(); ctx.moveTo(CX + ca * d2, HY + sa * d2); ctx.lineTo(CX + ca * d, HY + sa * d); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function quad(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); }

  function drawGround(w) {
    const L = S.L, SZ = 2, kStart = Math.floor(camZ / SZ) * SZ, len = L ? L.len : 1e9;
    for (let k = kStart + DRAW; k >= kStart; k -= SZ) {
      let za = k, zb = k + SZ;
      if (zb < camZ + 0.7) continue; if (za < camZ + 0.7) za = camZ + 0.7;
      const zc = k - camZ, fade = clamp(1 - Math.pow(Math.max(0, zc) / DRAW, 2.2), 0, 1);
      if (fade <= 0.01) continue;
      const gap = L ? inGap(k + 1) : null;
      ctx.globalAlpha = fade;
      if (gap) {
        if (k === gap.z0) { const a = proj(-TW, 0, zb), b = proj(TW, 0, zb), c = proj(TW, 0, zb - 0.0001); ctx.strokeStyle = w.haz; ctx.lineWidth = Math.max(2, a[2] * 0.14); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
        continue;
      }
      const a = proj(-TW, 0, za), b = proj(TW, 0, za), c = proj(TW, 0, zb), d = proj(-TW, 0, zb);
      if (L && k >= len && k < len + SZ) {
        for (let i = 0; i < 8; i++) { const x0 = -TW + i * TW * 2 / 8, x1 = x0 + TW * 2 / 8; quad(proj(x0, 0, za), proj(x1, 0, za), proj(x1, 0, zb), proj(x0, 0, zb)); ctx.fillStyle = i % 2 ? '#1b1040' : '#ffffff'; ctx.fill(); }
      } else {
        ctx.fillStyle = (Math.floor(k / SZ) & 1) ? w.g1 : w.g2; quad(a, b, c, d); ctx.fill();
        if (L && k > len) { ctx.fillStyle = rgba(w.edge, 0.18); quad(a, b, c, d); ctx.fill(); }
      }
      // neon rails
      const ew = 0.3; ctx.fillStyle = w.edge; ctx.beginPath();
      let q = proj(-TW - ew, 0, za); ctx.moveTo(q[0], q[1]); q = proj(-TW, 0, za); ctx.lineTo(q[0], q[1]); q = proj(-TW, 0, zb); ctx.lineTo(q[0], q[1]); q = proj(-TW - ew, 0, zb); ctx.lineTo(q[0], q[1]); ctx.closePath();
      q = proj(TW, 0, za); ctx.moveTo(q[0], q[1]); q = proj(TW + ew, 0, za); ctx.lineTo(q[0], q[1]); q = proj(TW + ew, 0, zb); ctx.lineTo(q[0], q[1]); q = proj(TW, 0, zb); ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
      if (gap === null && L && inGap(k - 1)) { // landing edge
        ctx.strokeStyle = w.haz; ctx.lineWidth = Math.max(2, a[2] * 0.12); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawDecor(i, w) {
    const z = i * 7;
    for (let side = -1; side <= 1; side += 2) {
      const h1 = hash(i, side * 3), h2 = hash(i + 50, side), h3 = hash(i + 9, side * 7);
      if (h1 < 0.2) continue;
      const x = side * (TW + 1.6 + h2 * 5.5), ht = 2.2 + h3 * 4.2, bw = 0.55 + h1 * 0.5;
      const bl = proj(x - bw, 0, z), br = proj(x + bw, 0, z), ml = proj(x - bw * 0.8, ht * 0.68, z), mr = proj(x + bw * 0.8, ht * 0.68, z), tip = proj(x + bw * 0.1, ht, z);
      const mid = proj(x, 0, z), midT = proj(x, ht * 0.68, z);
      ctx.fillStyle = w._pd || (w._pd = mix(w.pil1, '#000000', 0.45));
      ctx.beginPath(); ctx.moveTo(bl[0], bl[1]); ctx.lineTo(mid[0], mid[1]); ctx.lineTo(midT[0], midT[1]); ctx.lineTo(ml[0], ml[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(midT[0], midT[1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = w.pil1;
      ctx.beginPath(); ctx.moveTo(mid[0], mid[1]); ctx.lineTo(br[0], br[1]); ctx.lineTo(mr[0], mr[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(midT[0], midT[1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = w._p55 || (w._p55 = rgba(w.pil2, 0.55)); ctx.beginPath(); ctx.moveTo(midT[0], midT[1]); ctx.lineTo(mr[0], mr[1]); ctx.lineTo(tip[0], tip[1]); ctx.closePath(); ctx.fill();
      // floating orb above
      const fo = proj(x + side * 0.4, ht + 1.1 + Math.sin(S.t * 1.5 + i) * 0.25, z);
      ctx.fillStyle = rgba(w.pil2, 0.16); ctx.beginPath(); ctx.arc(fo[0], fo[1], Math.max(2, fo[2] * 0.4), 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(w.pil2, 0.8); ctx.beginPath(); ctx.arc(fo[0], fo[1], Math.max(1, fo[2] * 0.14), 0, TAU); ctx.fill();
    }
  }

  function drawShadow(x, z, r, a) {
    const l = proj(x - r, 0, z), rr = proj(x + r, 0, z), f = proj(x, 0, z - r * 0.8), b = proj(x, 0, z + r * 0.8);
    ctx.fillStyle = 'rgba(8,2,30,' + a + ')'; ctx.beginPath(); ctx.ellipse((l[0] + rr[0]) / 2, (f[1] + b[1]) / 2, Math.abs(rr[0] - l[0]) / 2, Math.abs(f[1] - b[1]) / 2, 0, 0, TAU); ctx.fill();
  }

  function drawBlock(e, w) {
    const z0 = e.z, z1 = e.z + e.d, h = e.h;
    const col = e.kind === 'low' ? mix(w.haz, '#ffffff', 0.15) : w.haz;
    const dark = mix(w.haz, '#000000', 0.45), midc = mix(w.haz, '#000000', 0.2), top = w.hazL;
    ctx.lineJoin = 'round';
    if (camX < e.x0) { quad(proj(e.x0, 0, z0), proj(e.x0, 0, z1), proj(e.x0, h, z1), proj(e.x0, h, z0)); ctx.fillStyle = dark; ctx.fill(); }
    if (camX > e.x1) { quad(proj(e.x1, 0, z0), proj(e.x1, 0, z1), proj(e.x1, h, z1), proj(e.x1, h, z0)); ctx.fillStyle = dark; ctx.fill(); }
    const fa = proj(e.x0, 0, z0), fb = proj(e.x1, 0, z0), fc = proj(e.x1, h, z0), fd = proj(e.x0, h, z0);
    quad(fa, fb, fc, fd); ctx.fillStyle = col; ctx.fill();
    // crystal glare
    ctx.save(); ctx.clip(); const wd = fb[0] - fa[0]; ctx.fillStyle = 'rgba(255,255,255,.16)';
    for (let k = 0; k < 6; k++) { const sx = fa[0] + (k * 0.22 + 0.04) * wd; ctx.beginPath(); ctx.moveTo(sx, fd[1]); ctx.lineTo(sx + wd * 0.07, fd[1]); ctx.lineTo(sx - wd * 0.06, fa[1]); ctx.lineTo(sx - wd * 0.13, fa[1]); ctx.fill(); }
    ctx.restore();
    if (h < CAMH - 0.2) { quad(proj(e.x0, h, z0), proj(e.x1, h, z0), proj(e.x1, h, z1), proj(e.x0, h, z1)); ctx.fillStyle = top; ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(1.2, fa[2] * 0.05);
    ctx.beginPath(); ctx.moveTo(fd[0], fd[1]); ctx.lineTo(fc[0], fc[1]); ctx.stroke();
    if (e.kind === 'low') { // hazard stripes hint
      ctx.fillStyle = 'rgba(255,255,255,.55)'; const n = 9, sw = (fb[0] - fa[0]) / n;
      for (let k = 0; k < n; k += 2) { const x0 = fa[0] + k * sw; ctx.fillRect(x0, fd[1] + (fa[1] - fd[1]) * 0.35, sw, (fa[1] - fd[1]) * 0.3); }
    }
  }
  function drawShardE(e) {
    const p = proj(e.x, e.y + Math.sin(S.t * 3 + e.z) * 0.07, e.z), r = 0.4 * p[2], x = p[0], y = p[1], sx = Math.cos(S.t * 2.6 + e.z * 0.7);
    ctx.fillStyle = 'rgba(255,200,70,.22)'; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, TAU); ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.38 : r; ctx.lineTo(x + Math.cos(a) * rr * sx, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = '#ffd44a'; ctx.fill();
    ctx.strokeStyle = 'rgba(190,100,0,.95)'; ctx.lineWidth = Math.max(1, r * 0.09); ctx.stroke();
  }
  function drawGemE(e) {
    const p = proj(e.x, e.y + Math.sin(S.t * 2.4 + e.z) * 0.1, e.z), r = 0.46 * p[2], x = p[0], y = p[1];
    ctx.fillStyle = 'rgba(255,100,200,.26)'; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.2); ctx.lineTo(x - r * 0.5, y - r * 0.8); ctx.lineTo(x + r * 0.5, y - r * 0.8); ctx.lineTo(x + r, y - r * 0.2); ctx.lineTo(x, y + r); ctx.closePath();
    ctx.fillStyle = '#ff6fc0'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.2); ctx.lineTo(x - r * 0.5, y - r * 0.8); ctx.lineTo(x + r * 0.5, y - r * 0.8); ctx.lineTo(x + r, y - r * 0.2); ctx.closePath(); ctx.fillStyle = '#ffc2e8'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.2); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.25, y - r * 0.2); ctx.closePath(); ctx.fillStyle = '#c2268f'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.2); ctx.lineTo(x - r * 0.5, y - r * 0.8); ctx.lineTo(x + r * 0.5, y - r * 0.8); ctx.lineTo(x + r, y - r * 0.2); ctx.lineTo(x, y + r); ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1, r * 0.07); ctx.stroke();
  }
  function drawPowerE(e) {
    const p = proj(e.x, e.y + Math.sin(S.t * 2.2) * 0.15, e.z), r = 0.62 * p[2], c = e.t === 'shield' ? '#6ef3ff' : '#ff5d73';
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(c, 0.3); ctx.beginPath(); ctx.arc(p[0], p[1], r * 1.8, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(p[0] - r * .3, p[1] - r * .3, r * .1, p[0], p[1], r); g.addColorStop(0, '#fff'); g.addColorStop(1, c);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = mix(c, '#000000', 0.45); ctx.lineWidth = Math.max(1, r * 0.1);
    if (e.t === 'shield') { ctx.beginPath(); ctx.moveTo(p[0], p[1] - r * .55); ctx.lineTo(p[0] + r * .45, p[1] - r * .3); ctx.lineTo(p[0] + r * .4, p[1] + r * .15); ctx.quadraticCurveTo(p[0] + r * .3, p[1] + r * .45, p[0], p[1] + r * .6); ctx.quadraticCurveTo(p[0] - r * .3, p[1] + r * .45, p[0] - r * .4, p[1] + r * .15); ctx.lineTo(p[0] - r * .45, p[1] - r * .3); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.lineWidth = r * 0.24; ctx.lineCap = 'butt'; ctx.strokeStyle = '#c4122f'; ctx.beginPath(); ctx.arc(p[0], p[1] - r * 0.02, r * 0.38, Math.PI, 0); ctx.lineTo(p[0] + r * 0.38, p[1] + r * 0.42); ctx.moveTo(p[0] - r * 0.38, p[1] - r * 0.02); ctx.lineTo(p[0] - r * 0.38, p[1] + r * 0.42); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(p[0] - r * 0.38, p[1] + r * 0.28); ctx.lineTo(p[0] - r * 0.38, p[1] + r * 0.45); ctx.moveTo(p[0] + r * 0.38, p[1] + r * 0.28); ctx.lineTo(p[0] + r * 0.38, p[1] + r * 0.45); ctx.stroke(); }
  }
  function drawAst(e, w) {
    const ax = e.cx + e.amp * Math.sin(S.t * e.sp + e.ph), p = proj(ax, e.r + 0.1, e.z), r = e.r * p[2];
    drawShadow(ax, e.z, e.r * 0.9, 0.3);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(w.haz, 0.32); ctx.beginPath(); ctx.arc(p[0], p[1], r * 1.5, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(p[0] - r * .35, p[1] - r * .4, r * .1, p[0], p[1], r); g.addColorStop(0, '#d9cdf2'); g.addColorStop(0.55, '#7b6aa8'); g.addColorStop(1, '#2b2150');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(30,20,70,.4)'; const rot = S.t * 1.5 + e.ph;
    for (let i = 0; i < 3; i++) { const a = rot + i * 2.1, d = r * (0.25 + 0.2 * i), cs = Math.cos(a); if (cs > -0.2) { ctx.beginPath(); ctx.ellipse(p[0] + Math.sin(a) * d, p[1] + (i - 1) * r * 0.3, r * 0.16 * (0.5 + cs * .5), r * 0.16, 0, 0, TAU); ctx.fill(); } }
    ctx.strokeStyle = w.haz; ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.stroke();
  }
  function drawSpin(e, w) {
    const th = S.t * e.w + e.ph, ux = Math.cos(th), uz = Math.sin(th), y = 0.55;
    // swept ring
    ctx.strokeStyle = rgba(w.haz, 0.3); ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath();
    for (let i = 0; i <= 32; i++) { const a = i / 32 * TAU, p = proj(e.x + Math.cos(a) * e.L, 0, e.z + Math.sin(a) * e.L); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); ctx.setLineDash([]);
    const a0 = proj(e.x - ux * e.L, 0, e.z - uz * e.L), b0 = proj(e.x + ux * e.L, 0, e.z + uz * e.L);
    ctx.strokeStyle = 'rgba(8,2,30,.3)'; ctx.lineWidth = Math.max(2, a0[2] * 0.3); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(b0[0], b0[1]); ctx.stroke();
    const c0 = proj(e.x, 0, e.z), c1 = proj(e.x, y, e.z);
    ctx.strokeStyle = '#3a2a70'; ctx.lineWidth = Math.max(2, c0[2] * 0.3); ctx.beginPath(); ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.stroke();
    const a = proj(e.x - ux * e.L, y, e.z - uz * e.L), b = proj(e.x + ux * e.L, y, e.z + uz * e.L);
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(w.haz, 0.35); ctx.lineWidth = Math.max(4, c1[2] * 0.6); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = w.haz; ctx.lineWidth = Math.max(3, c1[2] * 0.34); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, c1[2] * 0.1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    [a, b].forEach((q) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(2, q[2] * 0.26), 0, TAU); ctx.fill(); ctx.fillStyle = w.haz; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.5, q[2] * 0.17), 0, TAU); ctx.fill(); });
    ctx.fillStyle = '#ffd45e'; ctx.beginPath(); ctx.arc(c1[0], c1[1], Math.max(2, c1[2] * 0.3), 0, TAU); ctx.fill();
  }
  function drawHole(e, w) {
    const ring = (rr, a0) => { ctx.beginPath(); for (let i = 0; i <= 28; i++) { const a = a0 + i / 28 * TAU, p = proj(e.x + Math.cos(a) * rr, 0, e.z + Math.sin(a) * rr); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.closePath(); };
    ring(e.R * 2.3, 0); ctx.fillStyle = rgba(w.haz, 0.1); ctx.fill();
    ring(e.R, 0); ctx.fillStyle = '#05010f'; ctx.fill();
    ctx.lineCap = 'round';
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) { const q = i / 14, a = j * TAU / 3 + q * 2.4 - S.t * 2.4, rr = e.R * (0.15 + q * 0.85), p = proj(e.x + Math.cos(a) * rr, 0, e.z + Math.sin(a) * rr); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
      const p0 = proj(e.x, 0, e.z); ctx.strokeStyle = rgba(w.haz, 0.85); ctx.lineWidth = Math.max(1.5, p0[2] * 0.1); ctx.stroke();
    }
    const p0 = proj(e.x, 0, e.z); ring(e.R, 0); ctx.strokeStyle = w.haz; ctx.lineWidth = Math.max(2, p0[2] * 0.16); ctx.stroke();
    ring(e.R * 1.06, 0); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(w.haz, 0.35); ctx.lineWidth = Math.max(3, p0[2] * 0.3); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
  }
  function drawLaser(e, w) {
    const st = laserState(e), xL = -TW - 0.35, xR = TW + 0.35, ph = 1.35;
    const pl = proj(xL, 0, e.z), pl2 = proj(xL, ph, e.z), pr = proj(xR, 0, e.z), pr2 = proj(xR, ph, e.z), bl = proj(xL, 0.45, e.z), br = proj(xR, 0.45, e.z);
    ctx.lineCap = 'round'; ctx.strokeStyle = '#3a2a70'; ctx.lineWidth = Math.max(3, pl[2] * 0.3);
    ctx.beginPath(); ctx.moveTo(pl[0], pl[1]); ctx.lineTo(pl2[0], pl2[1]); ctx.moveTo(pr[0], pr[1]); ctx.lineTo(pr2[0], pr2[1]); ctx.stroke();
    const lamp = st === 2 ? w.haz : st === 1 ? '#ffd45e' : '#5a4a90';
    [pl2, pr2].forEach((q) => { ctx.fillStyle = lamp; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(3, q[2] * 0.26), 0, TAU); ctx.fill(); });
    if (st === 2) {
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(w.haz, 0.4); ctx.lineWidth = Math.max(6, bl[2] * 0.7); ctx.beginPath(); ctx.moveTo(bl[0], bl[1]); ctx.lineTo(br[0], br[1]); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = w.haz; ctx.lineWidth = Math.max(3, bl[2] * 0.2); ctx.beginPath(); ctx.moveTo(bl[0], bl[1]); ctx.lineTo(br[0], br[1]); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, bl[2] * 0.07); ctx.stroke();
    } else if (st === 1) {
      ctx.setLineDash([8, 10]); ctx.strokeStyle = 'rgba(255,212,94,' + (0.5 + 0.5 * Math.sin(S.t * 30)) + ')'; ctx.lineWidth = Math.max(2, bl[2] * 0.08); ctx.beginPath(); ctx.moveTo(bl[0], bl[1]); ctx.lineTo(br[0], br[1]); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function drawGate(w) {
    const z = S.L.len, th = 5.2, xL = -TW - 0.3, xR = TW + 0.3;
    const g = ctx.createLinearGradient(0, proj(0, th, z)[1], 0, proj(0, 0, z)[1]); g.addColorStop(0, rgba(w.edge, 0.55)); g.addColorStop(1, rgba(w.edge, 0.05));
    quad(proj(xL, 0, z), proj(xR, 0, z), proj(xR, th, z), proj(xL, th, z)); ctx.fillStyle = g; ctx.fill();
    ctx.lineCap = 'round';
    const a = proj(xL, 0, z), a2 = proj(xL, th, z), b = proj(xR, 0, z), b2 = proj(xR, th, z);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(4, a[2] * 0.4);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(w.edge, 0.55); ctx.lineWidth = Math.max(8, a[2] * 0.9); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    const t = proj(0, th - 0.1, z); ctx.fillStyle = '#fff'; ctx.font = '400 ' + Math.max(10, t[2] * 0.75) + 'px "Lilita One",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('WARP GATE', t[0], t[1] - t[2] * 0.15); ctx.textBaseline = 'alphabetic';
  }

  function drawPlayerE(w) {
    const sk = skinById(save.skin), r = rad();
    const showShadow = !S.falling && S.mode !== 'lose' && S.mode !== 'resultwait';
    if (showShadow) drawShadow(S.px, S.pz, r * (1 - Math.min(S.py, 3) * 0.1), 0.38 - Math.min(S.py, 3) * 0.05);
    if (S.mode === 'lose' || S.mode === 'resultwait') return;
    if (S.inv > 0 && S.mode === 'play' && Math.floor(S.t * 18) % 2) return;
    const p = proj(S.px, S.py + r, S.pz), R = r * p[2];
    const air = clamp(S.vy / 16, -1, 1);
    let sy = 1 + air * 0.12 - S.squash * 0.18, sx = 1 / sy;
    drawOrb(ctx, p[0], p[1], R, sk, { t: S.t, look: S.lookX, blink: S.blink, mouth: S.py > 0.3 ? 1 : (S.combo > 0 ? 0.6 : 0), sx, sy, shield: S.shield });
  }

  function drawParts() {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const zc = p.z - camZ; if (zc < 0.8) continue;
      const q = proj(p.x, p.y, p.z), a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(0.8, p.sz * q[2]), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function drawFloats() {
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (const f of floats) {
      const p = proj(f.x, f.y, f.z), a = clamp(f.life / 0.5, 0, 1); if (f.z - camZ < 0.8) continue;
      const size = clamp(p[2] * 0.5, 16, 40);
      ctx.globalAlpha = a; ctx.font = '700 ' + size + 'px Fredoka,sans-serif'; ctx.lineWidth = size * 0.2; ctx.strokeStyle = 'rgba(20,8,60,.85)'; ctx.strokeText(f.txt, p[0], p[1]); ctx.fillStyle = f.col; ctx.fillText(f.txt, p[0], p[1]);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    const w = world();
    drawSky(w);
    drawGround(w);
    const zN = camZ + 0.9, zF = camZ + DRAW;
    items.length = 0; ni = 0;
    for (let i = Math.ceil(zN / 7); i * 7 < zF; i++) mkItem(i * 7, 0, i, null);
    const L = S.L;
    if (L && S.mode !== 'menu') {
      const ents = L.ents;
      for (let i = 0; i < ents.length; i++) { const e = ents[i]; if (e.got) continue; if (e.zs < zN + (e.d || 0)) continue; if (e.zs > zF) break; mkItem(e.zs, 1, 0, e); }
      if (L.len > zN - 1 && L.len < zF) mkItem(L.len, 2, 0, null);
      mkItem(S.pz, 3, 0, null);
    }
    items.sort((a, b) => b.z - a.z);
    drawParts();
    for (const it of items) {
      const zc = it.z - camZ; ctx.globalAlpha = zc > DRAW * 0.7 ? clamp(1 - (zc - DRAW * 0.7) / (DRAW * 0.3), 0, 1) : (it.k === 3 ? 1 : clamp((zc - 1) / 3.5, 0, 1));
      if (it.k === 0) drawDecor(it.i, w);
      else if (it.k === 2) drawGate(w);
      else if (it.k === 3) drawPlayerE(w);
      else {
        const e = it.e;
        if (e.t === 'shard' || e.t === 'gem' || e.t === 'shield' || e.t === 'magnet') { ctx.globalAlpha *= clamp(1 - (S.pz - e.zs) / 1.2, 0, 1); if (ctx.globalAlpha <= 0.01) continue; }
        switch (e.t) {
          case 'shard': drawShardE(e); break; case 'gem': drawGemE(e); break; case 'shield': case 'magnet': drawPowerE(e); break;
          case 'block': drawBlock(e, w); break; case 'ast': drawAst(e, w); break; case 'spin': drawSpin(e, w); break;
          case 'hole': drawHole(e, w); break; case 'laser': drawLaser(e, w); break;
        }
      }
    }
    ctx.globalAlpha = 1;
    drawFloats();
  }

  /* ---------------- menus / UI ---------------- */
  const STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 1.5l3 7.3 7.5.7-5.7 5 1.8 7.5L12 18l-6.6 4 1.8-7.5-5.7-5 7.5-.7z" fill="#ffd45e" stroke="#fff3b8" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  const STAR_OFF = '<svg viewBox="0 0 24 24"><path d="M12 1.5l3 7.3 7.5.7-5.7 5 1.8 7.5L12 18l-6.6 4 1.8-7.5-5.7-5 7.5-.7z" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.35)" stroke-width="1" stroke-linejoin="round"/></svg>';
  const LOCK = '<svg class="lk" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="3" fill="#fff"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="#fff" stroke-width="2.4"/></svg>';
  const TILE_COL = [['#9a7bff', '#4a2bc9'], ['#52d4ff', '#1a62c9'], ['#ff9b5e', '#c92a4a'], ['#3be8b0', '#0c7d68'], ['#ff7ad0', '#a92bb3']];

  function buildLevels() {
    const g = $('#level-grid'); let h = '';
    for (let w = 0; w < 5; w++) {
      let total = 0; for (let i = 1; i <= 10; i++) total += save.stars[w * 10 + i] || 0;
      h += '<h4>' + (w + 1) + '. ' + WORLDS[w].name + ' <small>' + total + '/30 stars</small></h4><div class="grid">';
      for (let i = 1; i <= 10; i++) {
        const n = w * 10 + i, locked = n > save.unlocked, st = save.stars[n] || 0, c = TILE_COL[w];
        h += '<button class="tile' + (locked ? ' locked' : '') + (n === Math.min(save.unlocked, NLV) ? ' cur' : '') + '" style="--t1:' + c[0] + ';--t2:' + c[1] + '" data-lv="' + n + '" ' + (locked ? 'aria-disabled="true"' : '') + '>' +
          (locked ? LOCK : n + '<span class="st">' + (st > 0 ? (STAR_SVG.repeat(st) + STAR_OFF.repeat(3 - st)) : '') + '</span>') + '</button>';
      }
      h += '</div>';
    }
    g.innerHTML = h;
  }
  $('#level-grid').addEventListener('click', (e) => {
    const t = e.target.closest('.tile'); if (!t) return; Snd.init();
    if (t.classList.contains('locked')) { Snd.hit(); return; }
    Snd.click(); startLevel(+t.dataset.lv);
  });

  const shopCanvases = [];
  function buildShop() {
    const g = $('#skin-grid'); g.innerHTML = ''; shopCanvases.length = 0;
    SKINS.forEach((sk) => {
      const owned = save.owned.includes(sk.id), on = save.skin === sk.id;
      const d = document.createElement('div'); d.className = 'skin' + (on ? ' on' : '');
      d.innerHTML = '<canvas width="176" height="176"></canvas><b>' + sk.name + '</b>';
      const b = document.createElement('button'); b.className = 'btn small' + (owned && !on ? '' : on ? ' ghost' : ' primary');
      if (on) { b.textContent = 'Equipped'; b.disabled = true; }
      else if (owned) b.textContent = 'Equip';
      else b.innerHTML = '<span class="price">' + sk.price + ' <svg viewBox="0 0 24 24"><path d="M3 9l4-5h10l4 5-9 11z" fill="#ff7ac8" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg></span>';
      b.addEventListener('click', () => {
        Snd.init();
        if (owned) { save.skin = sk.id; persist(); Snd.click(); buildShop(); }
        else if (save.crystals >= sk.price) { save.crystals -= sk.price; save.owned.push(sk.id); save.skin = sk.id; persist(); Snd.buy(); refreshMenus(); buildShop(); }
        else { Snd.hit(); b.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 220 }); }
      });
      d.appendChild(b); g.appendChild(d); shopCanvases.push({ c: d.querySelector('canvas'), sk });
    });
  }
  function drawShop() {
    shopCanvases.forEach((o, i) => { const c = o.c.getContext('2d'); c.clearRect(0, 0, 176, 176); drawOrb(c, 88, 100, 42, o.sk, { halo: 2.0, t: S.t + i, look: Math.sin(S.t + i), blink: 0, mouth: 0 }); });
  }
  const mascot = $('#mascot'), mctx = mascot.getContext('2d');
  function drawMascot() {
    const s = mascot.clientWidth || 140; if (mascot.width !== Math.round(s * DPR)) { mascot.width = mascot.height = Math.round(s * DPR); }
    mctx.setTransform(DPR, 0, 0, DPR, 0, 0); mctx.clearRect(0, 0, s, s);
    const by = Math.sin(S.t * 2.2) * s * 0.03, jump = Math.max(0, Math.sin(S.t * 1.6)) * s * 0.05;
    drawOrb(mctx, s / 2, s * 0.58 - by - jump, s * 0.24, skinById(save.skin), { halo: 1.9, t: S.t, look: Math.sin(S.t * 0.8), blink: S.blink, mouth: jump > s * 0.03 ? 1 : 0 });
  }
  function refreshMenus() {
    $$('.crystal-count').forEach((el) => { el.textContent = save.crystals; });
    const nxt = Math.min(save.unlocked, NLV); $('#play-lv').textContent = save.unlocked > NLV ? 'Replay Level ' + NLV : 'Level ' + nxt;
    $('#t-sfx').checked = save.sfx; $('#t-music').checked = save.music; $('#t-vib').checked = save.vib;
  }

  const stack = [];
  function go(id) { const cur = $$('.screen.show')[0]; if (cur) stack.push(cur.id); if (id === 's-levels') buildLevels(); if (id === 's-shop') buildShop(); showScreen(id); Snd.click(); const cell = $('#level-grid .cur'); if (id === 's-levels' && cell) setTimeout(() => cell.scrollIntoView({ block: 'center' }), 30); }
  $('#b-play').addEventListener('click', () => { Snd.init(); Snd.click(); startLevel(Math.min(save.unlocked, NLV)); });
  $('#b-levels').addEventListener('click', () => { Snd.init(); go('s-levels'); });
  $('#b-shop').addEventListener('click', () => { Snd.init(); go('s-shop'); });
  $('#b-how').addEventListener('click', () => { Snd.init(); go('s-how'); });
  $('#b-set').addEventListener('click', () => { Snd.init(); go('s-set'); });
  $$('[data-back]').forEach((b) => b.addEventListener('click', () => { Snd.click(); const prev = stack.pop() || 's-title'; if (prev === 's-title') refreshMenus(); showScreen(prev); }));
  $('#btn-pause').addEventListener('click', pause);
  $('#p-resume').addEventListener('click', resume);
  $('#p-restart').addEventListener('click', () => { Snd.click(); startLevel(curLevel); });
  $('#p-levels').addEventListener('click', () => { Snd.click(); stack.length = 0; toMenu('s-title'); stack.push('s-title'); buildLevels(); showScreen('s-levels'); });
  $('#p-home').addEventListener('click', () => { Snd.click(); stack.length = 0; toMenu('s-title'); });
  $('#r-next').addEventListener('click', () => { Snd.click(); startLevel(curLevel + 1); });
  $('#r-retry').addEventListener('click', () => { Snd.click(); startLevel(curLevel); });
  $('#r-menu').addEventListener('click', () => { Snd.click(); stack.length = 0; toMenu('s-title'); stack.push('s-title'); buildLevels(); showScreen('s-levels'); });
  $('#t-sfx').addEventListener('change', (e) => { save.sfx = e.target.checked; Snd.setSfx(save.sfx); persist(); Snd.click(); });
  $('#t-music').addEventListener('change', (e) => { save.music = e.target.checked; Snd.init(); Snd.setMusic(save.music); persist(); });
  $('#t-vib').addEventListener('change', (e) => { save.vib = e.target.checked; persist(); vib(30); });
  $('#b-full').addEventListener('click', () => {
    try { if (document.fullscreenElement) document.exitFullscreen(); else (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || function () {}).call(document.documentElement); } catch (e) { /* unsupported */ }
  });
  $('#b-reset').addEventListener('click', () => { Snd.click(); $('#confirm').classList.add('show'); });
  $('#c-no').addEventListener('click', () => { Snd.click(); $('#confirm').classList.remove('show'); });
  $('#c-yes').addEventListener('click', () => { save = JSON.parse(JSON.stringify(DEF)); persist(); $('#confirm').classList.remove('show'); Snd.buy(); stack.length = 0; toMenu('s-title'); });

  /* ---------------- main loop ---------------- */
  let last = performance.now(), acc = 0, skip = false;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
    watchPerf(dt);
    // menus/background don't need 60fps: render every other frame to save battery and avoid jank under blur
    const inGame = S.mode === 'play' || S.mode === 'ready' || S.mode === 'finish' || S.mode === 'lose';
    if (!inGame) { skip = !skip; if (skip) { requestAnimationFrame(frame); return; } }
    acc = 0; const sdt = Math.min(dt, 0.05);
    if (S.mode !== 'paused') { if (sdt > 0.021) { update(sdt / 2); update(sdt / 2); } else update(sdt); }
    render();
    if ($('#s-title').classList.contains('show')) drawMascot();
    if ($('#s-shop').classList.contains('show')) drawShop();
    requestAnimationFrame(frame);
  }

  /* ---------------- boot ---------------- */
  Snd.setSfx(save.sfx); Snd.setMusic(save.music);
  resize();
  S.menuWorld = Math.floor((Math.min(save.unlocked, NLV) - 1) / 10); Snd.setWorld(S.menuWorld);
  refreshMenus(); showScreen('s-title');
  requestAnimationFrame(frame);

  // offline support
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ }); });
  }
  window.__LR = { S, startLevel, hit, lose, finishResult, save: () => save, LV, toMenu };
})();