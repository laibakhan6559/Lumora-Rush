/* Lumora Rush — worlds and procedural level builder (deterministic per level number) */
(function () {
  'use strict';
  const TW = 3.4;      // half width of the track
  const N = 50;        // total levels (5 worlds x 10)

  const WORLDS = [
    { name: 'Violet Drift', sky: ['#0d0626', '#32187f', '#c35bd6'], glow: '#ff8fe6', g1: '#f4efff', g2: '#d8ceff', edge: '#56f0ff',
      voidA: '#2b1366', voidB: '#07031a', pil1: '#9b7bff', pil2: '#e0d6ff', haz: '#ff3d8b', hazL: '#ffb3d0', planet: ['#ffa0dc', '#7a4bff'], ring: true },
    { name: 'Frost Comet', sky: ['#021433', '#0a4f9c', '#7fe7ff'], glow: '#b5f6ff', g1: '#effcff', g2: '#cdeefb', edge: '#8cf8ff',
      voidA: '#0b3a73', voidB: '#020a1f', pil1: '#58c8ff', pil2: '#e3fbff', haz: '#ff6a3d', hazL: '#ffc7b0', planet: ['#e8fbff', '#4fa7ff'], ring: false },
    { name: 'Ember Nebula', sky: ['#260713', '#9a2142', '#ffb25e'], glow: '#ffd08a', g1: '#fff2e4', g2: '#ffdcc2', edge: '#ffd45e',
      voidA: '#5c1230', voidB: '#14030a', pil1: '#ff7a45', pil2: '#ffe0b8', haz: '#5b3dff', hazL: '#c9bcff', planet: ['#ffd88a', '#d6402a'], ring: true },
    { name: 'Jade Void', sky: ['#021a18', '#0a7060', '#9bffd0'], glow: '#c8ffe6', g1: '#ecfff6', g2: '#c9f5e0', edge: '#7dffc2',
      voidA: '#06453b', voidB: '#01100d', pil1: '#2ee6a6', pil2: '#d4fff0', haz: '#ff3f7f', hazL: '#ffb8d0', planet: ['#c8ffe6', '#13a37f'], ring: false },
    { name: 'Candy Cosmos', sky: ['#33094a', '#d04aaf', '#ffd36b'], glow: '#ffe9a8', g1: '#fff1fb', g2: '#ffd6f1', edge: '#ff9fe0',
      voidA: '#6a1a78', voidB: '#16041f', pil1: '#ff6fcf', pil2: '#fff0c0', haz: '#3a2bd9', hazL: '#bdb6ff', planet: ['#fff0a8', '#ff58b5'], ring: true }
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // minimum level at which each segment type may appear, and its base weight
  const SEGS = [
    ['line', 1, 4], ['wave', 1, 2.4], ['gems', 1, 1.6], ['wall', 1, 3], ['lowbar', 2, 2.2], ['power', 3, 1.0],
    ['field', 4, 2.2], ['ast', 6, 2.2], ['gap', 8, 2.4], ['spin', 12, 2.2], ['wall2', 14, 1.6],
    ['hole', 17, 2.2], ['laser', 23, 2.2], ['mix', 30, 2.2]
  ];
  const FILLER = { line: 1, wave: 1, gems: 1 };

  function build(n) {
    const rng = mulberry32(n * 9301 + 49297);
    const R = (a, b) => a + (b - a) * rng();
    const RI = (a, b) => Math.floor(R(a, b + 1));
    const diff = (n - 1) / (N - 1);
    const boss = n % 10 === 0;
    let len = Math.round((320 + n * 16) / 2) * 2;
    const L = {
      n, world: Math.floor((n - 1) / 10), len,
      speed: 10.5 + 8.5 * diff + (boss ? 0.8 : 0),
      ents: [], gaps: [], shards: 0, gems: 0
    };
    const E = L.ents;
    const add = (e) => { if (e.zs === undefined) e.zs = e.z; E.push(e); return e; };
    const pickX = (m) => R(-TW + m, TW - m);
    const shard = (x, y, z) => { add({ t: 'shard', x, y, z }); L.shards++; };
    const gem = (x, y, z) => { add({ t: 'gem', x, y, z }); L.gems++; };
    const block = (x0, x1, h, z, d, kind) => add({ t: 'block', x0, x1, h, z, d, zs: z + d / 2, kind });

    const seg = {
      line(s) { const x = pickX(1.2), c = RI(8, 12); for (let i = 0; i < c; i++) shard(x, 0.55, s + i * 1.5); return c * 1.5; },
      wave(s) { const a = R(1.4, 2.3), c = 14, ph = R(0, 6); for (let i = 0; i < c; i++) shard(clamp(a * Math.sin(i * 0.55 + ph), -TW + 0.8, TW - 0.8), 0.55, s + i * 1.4); return c * 1.4; },
      gems(s) { const x = pickX(1.4); const pts = [[0, 0], [-0.9, 1.4], [0.9, 1.4], [0, 2.8], [-0.9, 4.2], [0.9, 4.2], [0, 5.6]]; pts.forEach(p => gem(clamp(x + p[0], -TW + .7, TW - .7), 0.7, s + p[1])); return 7; },
      wall(s) {
        const gw = Math.max(2.6, 3.0 - diff * 0.5), gx = pickX(gw / 2 + 0.2), zw = s + 7, d = 1.4, h = 2.7;
        if (gx - gw / 2 > -TW + 0.15) block(-TW, gx - gw / 2, h, zw, d, 'tall');
        if (gx + gw / 2 < TW - 0.15) block(gx + gw / 2, TW, h, zw, d, 'tall');
        for (let i = 0; i < 9; i++) shard(gx, 0.55, s + i * 1.6);
        return 15;
      },
      lowbar(s) {
        const zb = s + 8; block(-TW, TW, 0.8, zb, 1.0, 'low');
        for (let i = -3; i <= 3; i++) shard(0, 0.55 + (1 - (i / 3) * (i / 3)) * 2.0, zb + 0.5 + i * 1.3);
        return 18;
      },
      field(s) {
        const rows = 2 + Math.floor(diff * 2.2); const cols = [-2.27, 0, 2.27];
        for (let r = 0; r < rows; r++) {
          const open = RI(0, 2), z = s + 6 + r * 8;
          cols.forEach((cx, i) => { if (i === open) { for (let k = 0; k < 4; k++) shard(cx, 0.55, z - 1.5 + k * 1.5); } else block(cx - 1.05, cx + 1.05, rng() < 0.55 ? 1.0 : 2.4, z, 1.3, 'box'); });
        }
        return rows * 8 + 8;
      },
      ast(s) {
        const cnt = diff > 0.4 ? 2 : 1; const sp = R(1.3, 1.9) + diff * 0.9, ph = R(0, 6.28);
        for (let i = 0; i < cnt; i++) add({ t: 'ast', cx: 0, amp: 2.2, sp, ph: ph + i * Math.PI, z: s + 7 + i * 10, r: 0.62 });
        gem(-TW + 0.7, 0.7, s + 6); gem(TW - 0.7, 0.7, s + 12);
        return 14 + cnt * 10;
      },
      gap(s) {
        let gl = 3.5 + diff * 3.2; gl = Math.round(gl / 2) * 2;
        const z0 = Math.ceil((s + 8) / 2) * 2, z1 = z0 + gl;
        L.gaps.push({ z0, z1 });
        for (let i = -3; i <= 3; i++) shard(0, 0.55 + (1 - (i / 3) * (i / 3)) * 2.2, (z0 + z1) / 2 + i * 1.4);
        return gl + 18;
      },
      spin(s) {
        const cnt = diff > 0.55 ? 2 : 1;
        for (let i = 0; i < cnt; i++) add({ t: 'spin', x: R(-0.9, 0.9), z: s + 8 + i * 15, L: 2.7 + diff * 0.4, w: (rng() < 0.5 ? -1 : 1) * R(1.5, 2.3), ph: R(0, 6.28) });
        for (let i = 0; i < 6; i++) shard(i % 2 ? -TW + .8 : TW - .8, 0.55, s + 2 + i * 2.2);
        return 16 + cnt * 10;
      },
      wall2(s) {
        const g1 = pickX(2.0), g2 = clamp(-g1 + R(-0.6, 0.6), -TW + 1.8, TW - 1.8), gw = 2.7, h = 2.7;
        [[g1, s + 6], [g2, s + 18]].forEach(([gx, zw]) => {
          if (gx - gw / 2 > -TW + 0.15) block(-TW, gx - gw / 2, h, zw, 1.4, 'tall');
          if (gx + gw / 2 < TW - 0.15) block(gx + gw / 2, TW, h, zw, 1.4, 'tall');
          shard(gx, 0.55, zw - 2); shard(gx, 0.55, zw + 0.7); shard(gx, 0.55, zw + 3.4);
        });
        return 28;
      },
      hole(s) {
        const cnt = diff > 0.6 ? 2 : 1;
        for (let i = 0; i < cnt; i++) {
          const R_ = 1.3 + diff * 0.5, x = i ? -Math.sign(E[E.length - 1].x || 1) * R(0.8, 1.6) : pickX(R_ + 0.9), z = s + 8 + i * 13;
          add({ t: 'hole', x, z, R: R_ });
          for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; shard(clamp(x + Math.cos(a) * (R_ + 1.1), -TW + .6, TW - .6), 0.55, z + Math.sin(a) * (R_ + 1.1)); }
        }
        return 14 + cnt * 12;
      },
      laser(s) {
        const cnt = 1 + (diff > 0.55 ? 1 : 0);
        for (let i = 0; i < cnt; i++) { const z = s + 8 + i * 12; add({ t: 'laser', z, off: R(0, 2.4) }); for (let k = 0; k < 4; k++) shard(0, 0.55 + (k === 1 || k === 2 ? 1.4 : 0), z - 3 + k * 2); }
        return 14 + cnt * 10;
      },
      power(s) {
        add({ t: rng() < 0.5 ? 'shield' : 'magnet', x: pickX(1.2), y: 0.8, z: s + 3 });
        for (let i = 0; i < 6; i++) shard(0, 0.55, s + 6 + i * 1.5);
        return 16;
      },
      mix(s) { // two different hurdles back to back
        const a = ['wall', 'lowbar', 'ast', 'gap', 'spin'];
        const k1 = a[RI(0, 4)]; let k2 = a[RI(0, 4)]; if (k2 === k1) k2 = 'field';
        const l1 = seg[k1](s); const l2 = seg[k2](s + l1 - 4);
        return l1 + l2 - 4;
      }
    };
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    const pool = SEGS.filter(x => n >= x[1]).map(x => [x[0], x[2] * (FILLER[x[0]] ? (1 - diff * 0.6) : (1 + diff * 0.4))]);
    const total = pool.reduce((a, b) => a + b[1], 0);
    let z = 36, last = '';
    while (z < L.len - 34) {
      let r = rng() * total, pick = pool[0][0];
      for (const p of pool) { r -= p[1]; if (r <= 0) { pick = p[0]; break; } }
      if (pick === last && pick !== 'line') pick = 'line';
      last = pick;
      const used = seg[pick](z);
      z += used + Math.max(4, R(7, 13) * (1 - diff * 0.45));
    }
    E.sort((a, b) => a.zs - b.zs);
    L.name = WORLDS[L.world].name + ' ' + (L.world + 1) + '-' + (((n - 1) % 10) + 1);
    return L;
  }

  window.LumoraLevels = { TW, N, WORLDS, build };
})();
