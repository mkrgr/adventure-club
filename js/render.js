// Adventure Club – isometrischer Canvas-Renderer (alle Grafiken werden prozedural gezeichnet)
var AC = globalThis.AC = globalThis.AC || {};
(function () {
  'use strict';
  const HW = 32, HH = 16, WALLH = 46;
  const TAU = Math.PI * 2;
  const iso = (x, y) => [(x - y) * HW, (x + y) * HH];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function hash(x, y, k) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((k | 0) + 1, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shade(hex, f) {
    const [r, g, b] = hexToRgb(hex);
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    const m = (c) => Math.round(c + (t - c) * p);
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  }
  function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

  // ---------------------------------------------------------------- Themen
  const THEMES = {
    jungle: { bg: '#08110a', floor: '#75715a', wall: ['#8a9370', '#646d53', '#49523f'], pit: '#030503', pitWall: ['#3b3a2b', '#29281e'],
      block: ['#b4a67a', '#8c805e', '#6e6449'], stone: ['#a0a090', '#76766c', '#59594f'], rock: ['#7d7666', '#5f594d'], dark: 0.34, deco: 'jungle' },
    pyramid: { bg: '#140d05', floor: '#c6a368', wall: ['#dcb877', '#b38f53', '#8d6e3d'], pit: '#0a0602', pitWall: ['#6b5230', '#4a381f'],
      block: ['#e2c68c', '#b99c62', '#93784a'], stone: ['#d9c59d', '#ad9a74', '#857555'], rock: ['#a88d60', '#86704b'], dark: 0.5, deco: 'pyramid' },
    cave: { bg: '#04040a', floor: '#4b4762', wall: ['#5d587c', '#403b5a', '#2c2842'], pit: '#020206', pitWall: ['#2c2940', '#1b1929'],
      block: ['#7d7798', '#5b5674', '#454059'], stone: ['#7d7d9a', '#5a5a74', '#44445a'], rock: ['#5e5974', '#433f55'], dark: 0.86, deco: 'cave' },
    shrine: { bg: '#0e0604', floor: '#7c5b45', wall: ['#94704f', '#6c4e37', '#4f3827'], pit: '#060302', pitWall: ['#4a3424', '#33241a'],
      block: ['#a8845e', '#836448', '#644b36'], stone: ['#b09676', '#836d57', '#615042'], rock: ['#7a6450', '#5d4b3c'], dark: 0.62, deco: 'shrine' },
  };
  for (const k in THEMES) {
    const th = THEMES[k];
    th.floors = [-0.08, -0.04, 0, 0.04].map((f) => shade(th.floor, f));
    th.wallTops = [-0.05, 0, 0.05].map((f) => shade(th.wall[0], f));
  }

  // ---------------------------------------------------------------- Zeichen-Primitive
  function path(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
  }
  function poly(ctx, pts, fill, stroke, lw) {
    path(ctx, pts);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function diamond(ctx, x, y, hw, hh, fill, stroke, lw) { poly(ctx, [x, y - hh, x + hw, y, x, y + hh, x - hw, y], fill, stroke, lw); }
  function cube(ctx, x, y, h, hw, hh, top, left, right) {
    poly(ctx, [x - hw, y, x, y + hh, x, y + hh - h, x - hw, y - h], left);
    poly(ctx, [x, y + hh, x + hw, y, x + hw, y - h, x, y + hh - h], right);
    diamond(ctx, x, y - h, hw, hh, top);
  }
  function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
  function ellipse(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }
  function star(ctx, x, y, r, fill) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, rad = i % 2 ? r * 0.35 : r;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  // ---------------------------------------------------------------- Symbole (Steinscheiben)
  const CRYSTAL_COLORS = ['#ff4b4b', '#4bdc6a', '#4b9bff', '#ffd84b'];
  function drawSymbol(ctx, set, val, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (set === 'crystal') {
      const c = CRYSTAL_COLORS[val];
      ctx.shadowColor = c; ctx.shadowBlur = 10;
      poly(ctx, [0, -r, r * 0.6, -r * 0.2, r * 0.4, r * 0.9, -r * 0.4, r * 0.9, -r * 0.6, -r * 0.2], c);
      ctx.shadowBlur = 0;
      poly(ctx, [0, -r, r * 0.2, -r * 0.1, 0, r * 0.9, -r * 0.4, r * 0.9, -r * 0.6, -r * 0.2], 'rgba(255,255,255,0.35)');
    } else {
      ctx.strokeStyle = '#3a2a14'; ctx.fillStyle = '#3a2a14'; ctx.lineWidth = 1.8;
      if (val === 0) { // Sonne
        circle(ctx, 0, 0, r * 0.38, '#f0b83a');
        ctx.strokeStyle = '#f0b83a';
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); ctx.stroke();
        }
      } else if (val === 1) { // Mond
        ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, TAU); ctx.fillStyle = '#dfe6f0'; ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.2, r * 0.62, 0, TAU); ctx.fillStyle = '#4a4438'; ctx.fill();
      } else if (val === 2) { // Schlange
        ctx.strokeStyle = '#5fc45a'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.6);
        ctx.bezierCurveTo(-r * 0.1, r * 0.9, r * 0.6, r * 0.3, 0, 0);
        ctx.bezierCurveTo(-r * 0.6, -r * 0.3, r * 0.1, -r * 0.9, r * 0.6, -r * 0.6);
        ctx.stroke();
        circle(ctx, r * 0.62, -r * 0.62, 2.2, '#5fc45a');
      } else { // Auge
        ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(-r * 0.85, 0); ctx.quadraticCurveTo(0, -r * 0.8, r * 0.85, 0); ctx.quadraticCurveTo(0, r * 0.8, -r * 0.85, 0); ctx.closePath();
        ctx.fillStyle = '#e8e2d0'; ctx.fill();
        circle(ctx, 0, 0, r * 0.32, '#2e6fb5');
        circle(ctx, 0, 0, r * 0.14, '#111');
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- Kinder
  const KIDS = {
    mia: { shirt: '#2f8fa3', shirt2: '#1f6675', pants: '#6a5236', skin: '#f2c9a3', hair: '#3b2416', scale: 1.0 },
    ben: { shirt: '#b5472f', shirt2: '#86321f', pants: '#3f4d61', skin: '#d8a27c', hair: '#d6a245', scale: 1.12 },
    lea: { shirt: '#e8a23a', shirt2: '#b77a1e', pants: '#55703a', skin: '#f5d2b2', hair: '#8a3f18', scale: 0.94 },
  };
  function arm(ctx, x, y, sw, k) {
    const hx = x + sw * 0.5 + (x < 0 ? -2 : 2), hy = y + 10;
    ctx.strokeStyle = k.shirt2; ctx.lineWidth = 4.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hx, hy); ctx.stroke();
    circle(ctx, hx, hy + 1, 2.3, k.skin);
  }
  function ponytail(ctx, k, ph) {
    ctx.strokeStyle = k.hair; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -40);
    ctx.quadraticCurveTo(-14, -40, -13 + Math.sin(ph) * 1.5, -30);
    ctx.stroke();
  }
  function drawKid(ctx, id, o) {
    const k = KIDS[id];
    const front = o.dir === 1 || o.dir === 2;
    const flip = o.dir === 2 || o.dir === 3;
    const mv = o.moving ? 1 : 0;
    const ph = o.phase || 0;
    const sw = Math.sin(ph) * 3.2 * mv;
    const bob = Math.abs(Math.sin(ph)) * 1.6 * mv;
    ctx.save();
    ctx.scale(flip ? -k.scale : k.scale, k.scale);
    ctx.translate(0, -bob);
    // Beine
    ctx.fillStyle = k.pants;
    rr(ctx, -6 + sw * 0.7, -14, 5, 12, 2); rr(ctx, 1 - sw * 0.7, -14, 5, 12, 2);
    ctx.fillStyle = '#2a1c11';
    rr(ctx, -6.5 + sw * 0.7, -3.5, 6.5, 3.5, 1.5); rr(ctx, 0.5 - sw * 0.7, -3.5, 6.5, 3.5, 1.5);
    arm(ctx, 7, -24, -sw, k);
    if (id === 'lea' && front) ponytail(ctx, k, ph);
    // Oberkörper
    ctx.fillStyle = k.shirt; rr(ctx, -8, -28, 16, 16, 5);
    ctx.fillStyle = k.shirt2; rr(ctx, 3, -28, 5, 16, 3);
    ctx.fillStyle = '#4a3020'; ctx.fillRect(-8, -15.5, 16, 2.5);
    if (!front) {
      ctx.fillStyle = '#7a5230'; rr(ctx, -6.5, -28, 13, 14, 3);
      ctx.fillStyle = '#5e3e22'; rr(ctx, -6.5, -28, 13, 5, 2);
      if (id === 'mia') { ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -19, 4, 0, TAU); ctx.stroke(); }
    } else {
      ctx.strokeStyle = '#5e3e22'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-5, -28); ctx.lineTo(-4, -16); ctx.moveTo(5, -28); ctx.lineTo(4, -16); ctx.stroke();
    }
    arm(ctx, -7, -24, sw, k);
    // Kopf
    circle(ctx, 0, -36, 8.5, k.skin);
    if (id === 'mia') {
      ctx.fillStyle = k.hair;
      if (front) { ctx.beginPath(); ctx.arc(0, -37, 9, Math.PI * 1.0, Math.PI * 2.0); ctx.fill(); rr(ctx, -9.2, -38, 3.2, 9, 1.5); }
      else { circle(ctx, 0, -36, 8.9, k.hair); rr(ctx, -1.6, -31, 3.2, 10, 1.5); }
      ellipse(ctx, 0, -42, 12.5, 3.6, '#b39a62');
      ctx.beginPath(); ctx.arc(0, -42, 8.6, Math.PI, 0); ctx.fillStyle = '#dcc48e'; ctx.fill();
      ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-8.6, -44, 17.2, 2);
    } else if (id === 'ben') {
      ctx.fillStyle = k.hair;
      if (front) { ctx.beginPath(); ctx.arc(0, -37, 8.9, Math.PI * 1.0, Math.PI * 2.0); ctx.fill(); }
      else circle(ctx, 0, -36, 8.9, k.hair);
      ellipse(ctx, 0, -41.5, 13, 3.8, '#5b3b20');
      poly(ctx, [-7, -41.5, -6, -49, 0, -50.5, 6, -49, 7, -41.5], '#6d4827');
      ctx.fillStyle = '#2a190d'; ctx.fillRect(-7, -44.5, 14, 2.4);
    } else {
      ctx.fillStyle = k.hair;
      if (!front) circle(ctx, 0, -36, 8.9, k.hair);
      else { ctx.beginPath(); ctx.arc(0, -36.5, 9, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, -37.5, 9.2, Math.PI, 0); ctx.fillStyle = '#2f8a4a'; ctx.fill();
      poly(ctx, [-8, -39, -13, -42, -12, -36], '#2f8a4a');
      if (!front) ponytail(ctx, k, ph);
    }
    if (front) {
      circle(ctx, -1.2, -35.5, 1.25, '#1d130b'); circle(ctx, 4.2, -35.5, 1.25, '#1d130b');
      circle(ctx, -2.5, -32.5, 1.6, 'rgba(230,110,110,0.35)'); circle(ctx, 6, -32.5, 1.6, 'rgba(230,110,110,0.35)');
      ctx.strokeStyle = '#6b3020'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(1.6, -32.8, 2, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      if (id === 'mia') {
        ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(-1.2, -35.5, 2.7, 0, TAU); ctx.moveTo(6.9, -35.5); ctx.arc(4.2, -35.5, 2.7, 0, TAU);
        ctx.moveTo(1.5, -35.5); ctx.lineTo(1.5, -35.5); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- Objekte
  function drawGem(ctx, x, y, col, time) {
    const b = Math.sin(time * 3 + x * 0.1) * 2.5;
    ellipse(ctx, x, y + 2, 7, 3.2, 'rgba(0,0,0,0.3)');
    const gy = y - 16 + b;
    ctx.save();
    ctx.shadowColor = col; ctx.shadowBlur = 14;
    poly(ctx, [x, gy - 8, x + 7, gy - 2, x, gy + 9, x - 7, gy - 2], col);
    ctx.restore();
    poly(ctx, [x, gy - 8, x + 7, gy - 2, x, gy - 1, x - 7, gy - 2], 'rgba(255,255,255,0.45)');
    poly(ctx, [x, gy - 1, x + 7, gy - 2, x, gy + 9], 'rgba(0,0,0,0.18)');
    const tw = (Math.sin(time * 5 + x) + 1) / 2;
    star(ctx, x + 5, gy - 7, 3 + tw * 2, `rgba(255,255,255,${0.4 + tw * 0.5})`);
  }
  function drawKey(ctx, x, y, time) {
    const b = Math.sin(time * 3) * 2.5;
    ellipse(ctx, x, y + 2, 8, 3.2, 'rgba(0,0,0,0.3)');
    const ky = y - 18 + b;
    ctx.save();
    ctx.shadowColor = '#7fe8ff'; ctx.shadowBlur = 14;
    ctx.strokeStyle = '#9ff0ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x - 6, ky, 4.5, 0, TAU); ctx.moveTo(x - 1.5, ky); ctx.lineTo(x + 10, ky);
    ctx.moveTo(x + 7, ky); ctx.lineTo(x + 7, ky + 4); ctx.moveTo(x + 10, ky); ctx.lineTo(x + 10, ky + 5); ctx.stroke();
    ctx.restore();
  }
  function drawSack(ctx, x, y) {
    ellipse(ctx, x, y + 1, 10, 4, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = '#a07a4a';
    ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.quadraticCurveTo(x - 12, y - 14, x - 3, y - 17); ctx.lineTo(x + 3, y - 17);
    ctx.quadraticCurveTo(x + 12, y - 14, x + 9, y); ctx.quadraticCurveTo(x, y + 3, x - 9, y); ctx.fill();
    ctx.fillStyle = '#7d5c34'; ctx.fillRect(x - 3.5, y - 19, 7, 3);
    poly(ctx, [x - 3, y - 20, x - 6, y - 24, x, y - 21, x + 6, y - 24, x + 3, y - 20], '#a07a4a');
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 4, y - 12); ctx.lineTo(x + 4, y - 8); ctx.stroke();
  }
  function drawIdol(ctx, x, y, time) {
    ctx.save();
    ctx.shadowColor = '#ffd25a'; ctx.shadowBlur = 16 + Math.sin(time * 3) * 5;
    poly(ctx, [x - 7, y, x + 7, y, x + 5, y - 14, x - 5, y - 14], '#e8b432');
    circle(ctx, x, y - 19, 6.5, '#f2c447');
    ctx.restore();
    poly(ctx, [x + 1, y, x + 7, y, x + 5, y - 14, x + 1, y - 14], 'rgba(150,90,10,0.35)');
    ctx.fillStyle = '#7a4a10'; ctx.fillRect(x - 3.5, y - 20.5, 2, 2); ctx.fillRect(x + 1.5, y - 20.5, 2, 2);
    ctx.fillRect(x - 6.5, y - 27, 13, 2.5);
    ctx.fillStyle = '#c02a2a'; circle(ctx, x, y - 8, 2.2, '#d33');
  }

  const OBJ = {
    block(ctx, o, sx, sy, th) {
      cube(ctx, sx, sy, 32, HW - 5, HH - 2.5, th.block[0], th.block[1], th.block[2]);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.2;
      // eingeritztes Spiralsymbol auf der linken Seite
      const cx = sx - 13, cy = sy - 10;
      ctx.beginPath(); ctx.moveTo(cx - 5, cy - 2); ctx.lineTo(cx + 5, cy + 3); ctx.lineTo(cx + 5, cy - 6); ctx.lineTo(cx - 2, cy - 9.5); ctx.lineTo(cx - 2, cy - 4); ctx.lineTo(cx + 2, cy - 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.moveTo(sx - HW + 5, sy - 32); ctx.lineTo(sx, sy - 32 - HH + 2.5); ctx.lineTo(sx + HW - 5, sy - 32); ctx.stroke();
    },
    rubble(ctx, o, sx, sy, th) {
      const rocks = [];
      for (let i = 0; i < 8; i++) {
        const a = hash(o.x, o.y, i * 3) * TAU, d = hash(o.x, o.y, i * 3 + 1) * 14;
        rocks.push([sx + Math.cos(a) * d * 1.3, sy + Math.sin(a) * d * 0.55, 6 + hash(o.x, o.y, i * 3 + 2) * 6, i]);
      }
      rocks.push([sx, sy - 6, 11, 99]);
      rocks.sort((a, b) => a[1] - b[1]);
      for (const [rx, ry, r, i] of rocks) {
        const pts = [];
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * TAU + hash(i, j, 5);
          const rad = r * (0.75 + hash(i, j, 6) * 0.35);
          pts.push(rx + Math.cos(a) * rad, ry - r * 0.5 + Math.sin(a) * rad * 0.75);
        }
        poly(ctx, pts, th.rock[i % 2], 'rgba(0,0,0,0.3)');
        ellipse(ctx, rx - r * 0.25, ry - r * 0.85, r * 0.4, r * 0.22, 'rgba(255,255,255,0.12)');
      }
    },
    lever(ctx, o, sx, sy, th, r) {
      cube(ctx, sx, sy, 9, 11, 5.5, th.stone[0], th.stone[1], th.stone[2]);
      const target = o.on ? 0.65 : -0.65;
      const p = o.t > 0 ? o.t / 0.25 : 0;
      const a = target * (1 - p) + -target * p;
      const bx = sx, by = sy - 9;
      const tx = bx + Math.sin(a) * 24, ty = by - Math.cos(a) * 24;
      ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
      circle(ctx, tx, ty, 4.2, o.on ? '#e8c040' : '#c0392b');
      circle(ctx, tx - 1.2, ty - 1.2, 1.4, 'rgba(255,255,255,0.5)');
      if (o.label) r.label(o.label, sx, sy - 44);
    },
    inscr(ctx, o, sx, sy, th, r, s) {
      const near = s.chars.some((c) => c.id === 'mia' && Math.abs(c.x - o.x) + Math.abs(c.y - o.y) <= 1);
      if (near) { ctx.save(); ctx.shadowColor = '#ffd25a'; ctx.shadowBlur = 18; }
      cube(ctx, sx, sy, 56, 15, 7.5, th.stone[0], th.stone[1], th.stone[2]);
      if (near) ctx.restore();
      ctx.strokeStyle = 'rgba(40,25,10,0.55)'; ctx.lineWidth = 1.1;
      for (let row = 0; row < 6; row++) {
        for (let c = 0; c < 3; c++) {
          const f = (c + 0.6) / 3.6;
          const lx = sx - 15 + f * 15, ly = sy + f * 7.5 - 48 + row * 7.2;
          const v = hash(o.x * 7 + c, o.y * 5 + row, 9);
          ctx.beginPath();
          if (v < 0.33) { ctx.arc(lx, ly, 1.8, 0, TAU); }
          else if (v < 0.66) { ctx.moveTo(lx - 2, ly - 2); ctx.lineTo(lx + 2, ly + 2); ctx.moveTo(lx + 2, ly - 2); ctx.lineTo(lx - 2, ly + 2); }
          else { ctx.moveTo(lx - 2, ly + 1.5); ctx.lineTo(lx, ly - 2); ctx.lineTo(lx + 2, ly + 1.5); }
          ctx.stroke();
        }
      }
      for (let row = 0; row < 6; row++) {
        const ly = sy + 3.75 - 48 + row * 7.2;
        ctx.beginPath(); ctx.moveTo(sx + 3, ly + 1.5); ctx.lineTo(sx + 12, ly - 3); ctx.stroke();
      }
    },
    dial(ctx, o, sx, sy, th, r) {
      cube(ctx, sx, sy, 12, 13, 6.5, th.stone[0], th.stone[1], th.stone[2]);
      const wob = o.t > 0 ? Math.sin(o.t * 40) * 0.12 : 0;
      ctx.save();
      ctx.translate(sx, sy - 30);
      ctx.rotate(wob);
      ctx.beginPath(); ctx.arc(0, 0, 14.5, 0, TAU); ctx.fillStyle = th.stone[2]; ctx.fill();
      const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, 13);
      g.addColorStop(0, th.stone[0]); g.addColorStop(1, th.stone[1]);
      ctx.beginPath(); ctx.arc(0, 0, 12.5, 0, TAU); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, TAU); ctx.fillStyle = 'rgba(30,20,10,0.55)'; ctx.fill();
      drawSymbol(ctx, o.set, o.val, 0, 0, 8.5);
      ctx.restore();
      ctx.fillStyle = th.stone[1]; ctx.fillRect(sx - 2.5, sy - 16, 5, 6);
      if (o.label) r.label(o.label, sx, sy - 52);
    },
    door(ctx, o, sx, sy, th, r, s) {
      const isWall = (x, y) => AC.Engine.tileAt(s, x, y) === 'wall';
      const alongY = isWall(o.x, o.y - 1) || isWall(o.x, o.y + 1);
      const ax = alongY ? sx + HW / 2 : sx - HW / 2, ay = sy - HH / 2;
      const bx = alongY ? sx - HW / 2 : sx + HW / 2, by = sy + HH / 2;
      const H = WALLH;
      const crystal = o.lock === 'key';
      const p = o.t > 0 ? o.t / 0.5 : 0;
      const lift = o.open ? (1 - p) : p; // 0 = geschlossen, 1 = offen
      const gateBottom = lift * (H - 8);
      if (!crystal) {
        // Fallgitter
        const top = H;
        const bot = gateBottom;
        if (top - bot > 2) {
          poly(ctx, [ax, ay - bot, bx, by - bot, bx, by - top, ax, ay - top], 'rgba(20,12,6,0.45)');
          ctx.strokeStyle = '#3d2a17'; ctx.lineWidth = 2.6;
          ctx.beginPath();
          for (let i = 0; i <= 5; i++) {
            const f = i / 5, x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
            ctx.moveTo(x, y - bot); ctx.lineTo(x, y - top);
          }
          for (let j = 1; j <= 3; j++) {
            const h = bot + ((top - bot) * j) / 4;
            ctx.moveTo(ax, ay - h); ctx.lineTo(bx, by - h);
          }
          ctx.stroke();
          ctx.fillStyle = '#5a5a5a';
          for (let i = 0; i <= 5; i++) {
            const f = i / 5, x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
            poly(ctx, [x - 1.5, y - bot, x + 1.5, y - bot, x, y - bot + 4], '#6a6a6a');
          }
        }
      } else if (!o.open || p > 0) {
        const a = o.open ? p : 1;
        ctx.save(); ctx.globalAlpha = a;
        ctx.shadowColor = '#7fe8ff'; ctx.shadowBlur = 16;
        poly(ctx, [ax, ay, bx, by, bx, by - H, ax, ay - H], 'rgba(110,220,255,0.55)', '#bff6ff', 1.5);
        ctx.restore();
        ctx.globalAlpha = a;
        const mx = (ax + bx) / 2, my = (ay + by) / 2 - H / 2;
        circle(ctx, mx, my, 5, '#2b5f7a');
        ctx.fillStyle = '#0d2a3a'; ctx.fillRect(mx - 1, my - 1, 2, 5);
        ctx.globalAlpha = 1;
      }
      // Rahmen
      ctx.strokeStyle = crystal ? '#5e7f99' : shade(th.wall[2], -0.1); ctx.lineWidth = 4.5; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - H - 2); ctx.lineTo(bx, by - H - 2); ctx.lineTo(bx, by); ctx.stroke();
    },
    hook(ctx, o, sx, sy, th, r, s) {
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy + 14); ctx.lineTo(sx, sy - 64); ctx.stroke();
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx - 1, sy + 14); ctx.lineTo(sx - 1, sy - 64); ctx.stroke();
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(sx - 10, sy - 60); ctx.lineTo(sx + 10, sy - 60); ctx.stroke();
      const gl = 0.5 + Math.sin(r.time * 3) * 0.3;
      ctx.save(); ctx.shadowColor = '#ffd25a'; ctx.shadowBlur = 10 * gl;
      ctx.strokeStyle = '#d9b44a'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(sx, sy - 70, 5, 0, TAU); ctx.stroke();
      ctx.restore();
    },
    gem(ctx, o, sx, sy, th, r) {
      const cols = ['#ff4b6e', '#4bdc8a', '#4bb5ff', '#c27bff'];
      drawGem(ctx, sx, sy, cols[(o.x + o.y) % 4], r.time);
    },
    key(ctx, o, sx, sy, th, r) { drawKey(ctx, sx, sy, r.time); },
    sandbag(ctx, o, sx, sy) { drawSack(ctx, sx, sy); },
    pedestal(ctx, o, sx, sy, th, r) {
      cube(ctx, sx, sy, 34, 14, 7, th.stone[0], th.stone[1], th.stone[2]);
      ctx.fillStyle = '#c99a2e';
      poly(ctx, [sx - 14, sy - 28, sx, sy - 21, sx, sy - 18, sx - 14, sy - 25], '#c99a2e');
      poly(ctx, [sx, sy - 21, sx + 14, sy - 28, sx + 14, sy - 25, sx, sy - 18], '#a37c22');
      if (o.hasIdol) drawIdol(ctx, sx, sy - 34, r.time);
      else if (o.hasBag) drawSack(ctx, sx, sy - 34);
    },
  };
  const FLAT = { plate: 1, bridge: 1 };

  function drawPlate(ctx, o, sx, sy, th) {
    const down = !!o.down;
    const h = down ? 1 : 4;
    const hw = HW * 0.62, hh = HH * 0.62;
    if (o.heavy) {
      cube(ctx, sx, sy, h, hw, hh, down ? '#6d737c' : '#8d949e', '#5a5f66', '#474b51');
      ctx.fillStyle = '#3a3d42';
      const ty = sy - h;
      poly(ctx, [sx - 5, ty + 3, sx + 5, ty + 3, sx + 3.5, ty - 2, sx - 3.5, ty - 2], '#3a3d42');
      ctx.strokeStyle = '#3a3d42'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(sx, ty - 3.5, 2, 0, TAU); ctx.stroke();
    } else {
      cube(ctx, sx, sy, h, hw, hh, down ? shade(th.stone[1], 0) : th.stone[0], th.stone[1], th.stone[2]);
      ctx.strokeStyle = 'rgba(60,40,20,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(sx, sy - h, 7, 3.5, 0, 0, TAU); ctx.stroke();
    }
    if (down) diamond(ctx, sx, sy - h, hw - 2, hh - 1, null, 'rgba(255,215,100,0.8)', 1.5);
  }
  function drawBridge(ctx, o, sx, sy) {
    if (!o.open) return;
    const p = o.t > 0 ? 1 - o.t / 0.5 : 1;
    ctx.save();
    ctx.globalAlpha = p;
    diamond(ctx, sx, sy, HW - 1, HH - 0.5, '#8b5a2b');
    ctx.strokeStyle = '#5e3a19'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 5; i++) {
      const f = i / 5;
      ctx.beginPath();
      ctx.moveTo(sx - HW + f * HW, sy - f * HH);
      ctx.lineTo(sx + f * HW, sy + HH - f * HH);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- Renderer
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.light = document.createElement('canvas');
      this.lctx = this.light.getContext('2d');
      this.cam = { x: 0, y: 0 };
      this.camInit = false;
      this.userZoom = 1;
      this.time = 0;
      this.shakeAmt = 0;
      this.shx = 0; this.shy = 0;
      this.parts = [];
      this.whips = [];
      this.falls = [];
      this.labels = [];
      this.resize();
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.dpr = dpr;
      this.cw = window.innerWidth;
      this.ch = window.innerHeight;
      this.canvas.width = Math.round(this.cw * dpr);
      this.canvas.height = Math.round(this.ch * dpr);
      this.light.width = this.canvas.width;
      this.light.height = this.canvas.height;
      this.baseZoom = clamp(Math.min(this.cw / 1000, this.ch / 700) * 1.35, 0.8, 2.0);
    }
    get zoom() { return this.baseZoom * this.userZoom; }
    snapCamera() { this.camInit = false; this.parts.length = 0; this.whips.length = 0; this.falls.length = 0; this.labels.length = 0; }
    screenToGrid(mx, my) {
      const z = this.zoom;
      const wx = (mx - this.cw / 2) / z + this.cam.x;
      const wy = (my - this.ch / 2) / z + this.cam.y;
      return { x: Math.round((wx / HW + wy / HH) / 2), y: Math.round((wy / HH - wx / HW) / 2) };
    }
    toPx(wx, wy) {
      return [this.dpr * ((wx - this.cam.x) * this.zoom + this.cw / 2 + this.shx), this.dpr * ((wy - this.cam.y) * this.zoom + this.ch / 2 + this.shy)];
    }
    addShake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
    label(text, x, y) {
      const ctx = this.ctx;
      ctx.font = '700 10px Cinzel, Georgia, serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(text).width + 8;
      ctx.fillStyle = 'rgba(20,12,4,0.7)'; rr(ctx, x - w / 2, y - 7, w, 14, 4);
      ctx.fillStyle = '#f1d68a'; ctx.fillText(text, x, y + 0.5);
    }
    addFx(e) {
      const [sx, sy] = iso(e.x, e.y);
      const R = Math.random;
      switch (e.kind) {
        case 'dust':
          for (let i = 0; i < 22; i++) this.parts.push({ x: sx + (R() - 0.5) * 30, y: sy - 8 - R() * 10, vx: (R() - 0.5) * 70, vy: -R() * 60, g: 40, life: 0.7 + R() * 0.5, max: 1.2, col: [170, 150, 120], size: 3 + R() * 5, fade: true });
          break;
        case 'rocks':
          for (let i = 0; i < 10; i++) this.parts.push({ x: sx, y: sy - 10, vx: (R() - 0.5) * 140, vy: -60 - R() * 80, g: 380, life: 0.6, max: 0.6, col: [110, 100, 85], size: 2.5 + R() * 2.5, sq: true });
          break;
        case 'sparkle':
          for (let i = 0; i < 16; i++) this.parts.push({ x: sx + (R() - 0.5) * 20, y: sy - 16, vx: (R() - 0.5) * 60, vy: -30 - R() * 60, g: -10, life: 0.9, max: 0.9, col: [255, 220, 110], size: 3 + R() * 2, star: true });
          break;
        case 'hurt':
          for (let i = 0; i < 10; i++) this.parts.push({ x: sx, y: sy - 24, vx: (R() - 0.5) * 120, vy: -R() * 100, g: 120, life: 0.6, max: 0.6, col: [255, 90, 70], size: 3, star: true });
          break;
        case 'arrows':
          for (let i = 0; i < 5; i++) this.parts.push({ x: sx - 140 - R() * 60, y: sy - 20 - R() * 20 + i * 4, vx: 520, vy: 0, g: 0, life: 0.6, max: 0.6, col: [80, 60, 40], size: 0, arrow: true });
          break;
        case 'whip': this.whips.push({ fx: e.x, fy: e.y, tx: e.tx, ty: e.ty, life: 0.35 }); break;
        case 'fallblock': this.falls.push({ x: e.x, y: e.y, life: 0.5 }); break;
        case 'label': this.labels.push({ text: e.text, x: sx, y: sy - 58, life: 1.3 }); break;
        default: break;
      }
    }

    render(s, dt, opts) {
      opts = opts || {};
      const ctx = this.ctx, L = AC.LEVELS[s.idx], th = THEMES[L.theme] || THEMES.jungle, E = AC.Engine;
      this.time += dt;
      const time = this.time;

      // Kamera
      const act = s.chars[s.active];
      const ap = charPos(act);
      const [tx, ty] = iso(ap.x, ap.y);
      if (!this.camInit) { this.cam.x = tx; this.cam.y = ty - 20; this.camInit = true; }
      else { const k = 1 - Math.exp(-dt * 7); this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - 20 - this.cam.y) * k; }
      this.shx = 0; this.shy = 0;
      let sh = this.shakeAmt;
      if (s.timer !== null && !s.failed && !s.complete) sh = Math.max(sh, 1.6);
      if (sh > 0.2) { this.shx = (Math.random() - 0.5) * sh * 2; this.shy = (Math.random() - 0.5) * sh * 2; }
      this.shakeAmt *= Math.exp(-dt * 6);

      const z = this.zoom, dpr = this.dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = th.bg;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (this.cw / 2 - this.cam.x * z + this.shx), dpr * (this.ch / 2 - this.cam.y * z + this.shy));

      const vw = this.cw / z / 2 + 80, vh = this.ch / z / 2 + 110;
      const visible = (sx, sy) => Math.abs(sx - this.cam.x) < vw && sy - this.cam.y > -vh && sy - this.cam.y < vh + 60;

      // Pass 1: Böden
      for (let y = 0; y < s.h; y++) {
        for (let x = 0; x < s.w; x++) {
          const t = s.tiles[y][x];
          if (t === 'wall' || t === 'void') continue;
          const [sx, sy] = iso(x, y);
          if (!visible(sx, sy)) continue;
          this.drawFloor(ctx, s, L, x, y, sx, sy, th, t);
        }
      }
      for (const o of s.objects) {
        if (!FLAT[o.type]) continue;
        const [sx, sy] = iso(o.x, o.y);
        if (o.type === 'plate') drawPlate(ctx, o, sx, sy, th);
        else drawBridge(ctx, o, sx, sy);
      }
      // versinkende Blöcke
      for (const f of this.falls) {
        f.life -= dt;
        const [sx, sy] = iso(f.x, f.y);
        const p = clamp(1 - f.life / 0.5, 0, 1);
        ctx.save();
        diamond(ctx, sx, sy, HW, HH, null); path(ctx, [sx - HW, sy, sx - HW, sy - 80, sx + HW, sy - 80, sx + HW, sy, sx, sy + HH]); ctx.clip();
        cube(ctx, sx, sy + p * 34, 32, HW - 5, HH - 2.5, th.block[0], th.block[1], th.block[2]);
        ctx.restore();
      }
      this.falls = this.falls.filter((f) => f.life > 0);
      // Hover
      if (opts.hover && E.tileAt(s, opts.hover.x, opts.hover.y) !== 'void') {
        const [hx, hy] = iso(opts.hover.x, opts.hover.y);
        diamond(ctx, hx, hy, HW - 2, HH - 1, 'rgba(255,240,200,0.08)', 'rgba(255,240,200,0.55)', 1.5);
      }

      // Pass 2: Wände, Objekte, Figuren – nach Tiefe sortiert
      const items = [];
      const lightMap = {};
      for (const lt of L.lights || []) lightMap[lt[0] + ',' + lt[1]] = lt;
      for (let y = 0; y < s.h; y++) {
        for (let x = 0; x < s.w; x++) {
          if (s.tiles[y][x] !== 'wall') continue;
          const [sx, sy] = iso(x, y);
          if (!visible(sx, sy)) continue;
          items.push({ d: x + y, k: 0, kind: 'w', x, y, sx, sy });
        }
      }
      for (const o of s.objects) {
        if (FLAT[o.type]) continue;
        let ox = o.x, oy = o.y;
        if (o.type === 'block' && o.t > 0) { const p = 1 - o.t / o.dur; ox = o.fromX + (o.x - o.fromX) * p; oy = o.fromY + (o.y - o.fromY) * p; }
        const [sx, sy] = iso(ox, oy);
        if (!visible(sx, sy)) continue;
        items.push({ d: ox + oy, k: 0.1, kind: 'o', o, sx, sy });
      }
      for (const c of s.chars) {
        const p = charPos(c);
        const [sx, sy] = iso(p.x, p.y);
        items.push({ d: p.x + p.y, k: 0.2, kind: 'c', c, p, sx, sy });
      }
      items.sort((a, b) => (a.d + a.k) - (b.d + b.k));

      const nearFront = (x, y) => {
        for (const c of s.chars) {
          const dx = x - c.x, dy = y - c.y;
          if (dx >= 0 && dy >= 0 && dx + dy > 0 && dx + dy <= 2) return true;
          const dx2 = x - c.px, dy2 = y - c.py;
          if (c.t > 0 && dx2 >= 0 && dy2 >= 0 && dx2 + dy2 > 0 && dx2 + dy2 <= 2) return true;
        }
        return false;
      };

      for (const it of items) {
        if (it.kind === 'w') {
          const alpha = nearFront(it.x, it.y) ? 0.38 : 1;
          this.drawWall(ctx, s, it.x, it.y, it.sx, it.sy, th, alpha, lightMap[it.x + ',' + it.y]);
        } else if (it.kind === 'o') {
          const f = OBJ[it.o.type];
          if (f) f(ctx, it.o, it.sx, it.sy, th, this, s);
        } else {
          this.drawChar(ctx, s, it.c, it.p, it.sx, it.sy, it.c === act);
        }
      }

      // Interaktions-Hinweis
      if (!s.complete && act.t <= 0) {
        const f = E.findInteract(s);
        if (f) {
          const [bx, by] = iso(f.o.x, f.o.y);
          const top = { inscr: 78, dial: 66, lever: 58, pedestal: 76, rubble: 36, block: 52, door: 64 }[f.o.type] || 50;
          this.keyBadge(f.o.type === 'block' || f.o.type === 'rubble' ? '➜' : 'E', bx, by - top + Math.sin(time * 4) * 2);
        }
      }

      this.drawFx(ctx, s, dt);
      this.drawLighting(s, L, th, items, time);
    }

    keyBadge(text, x, y) {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(25,15,5,0.85)'; rr(ctx, x - 9, y - 9, 18, 18, 5);
      ctx.strokeStyle = '#e8c26a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 9, y - 9, 18, 18, 5) : ctx.rect(x - 9, y - 9, 18, 18); ctx.stroke();
      ctx.font = '800 11px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f3dc9a'; ctx.fillText(text, x, y + 0.5);
    }

    drawFloor(ctx, s, L, x, y, sx, sy, th, t) {
      const E = AC.Engine;
      if (t === 'pit') {
        diamond(ctx, sx, sy, HW, HH, th.pit);
        ctx.save();
        path(ctx, [sx, sy - HH, sx + HW, sy, sx, sy + HH, sx - HW, sy]); ctx.clip();
        const pitLike = (tt) => tt === 'pit';
        if (!pitLike(E.tileAt(s, x - 1, y))) {
          const g = ctx.createLinearGradient(0, sy - HH, 0, sy + 18);
          g.addColorStop(0, th.pitWall[0]); g.addColorStop(1, th.pit);
          poly(ctx, [sx - HW, sy, sx, sy - HH, sx, sy - HH + 26, sx - HW, sy + 26], g);
        }
        if (!pitLike(E.tileAt(s, x, y - 1))) {
          const g = ctx.createLinearGradient(0, sy - HH, 0, sy + 18);
          g.addColorStop(0, th.pitWall[1]); g.addColorStop(1, th.pit);
          poly(ctx, [sx, sy - HH, sx + HW, sy, sx + HW, sy + 26, sx, sy - HH + 26], g);
        }
        ctx.restore();
        return;
      }
      const v = hash(x, y, 7);
      const col = t === 'filled' ? th.block[1] : th.floors[(v * th.floors.length) | 0];
      diamond(ctx, sx, sy, HW, HH, col);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      path(ctx, [sx, sy - HH + 1, sx + HW - 2, sy, sx, sy + HH - 1, sx - HW + 2, sy]); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.moveTo(sx - HW + 3, sy); ctx.lineTo(sx, sy - HH + 2); ctx.lineTo(sx + HW - 3, sy); ctx.stroke();
      if (t === 'filled') {
        diamond(ctx, sx, sy, HW - 6, HH - 3, null, 'rgba(0,0,0,0.25)');
        return;
      }
      // Deko
      const d = hash(x, y, 11);
      if (th.deco === 'jungle' && d < 0.22) {
        ctx.strokeStyle = 'rgba(90,150,60,0.75)'; ctx.lineWidth = 1.3;
        const gx = sx + (hash(x, y, 12) - 0.5) * 30, gy = sy + (hash(x, y, 13) - 0.5) * 12;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - 3, gy - 6); ctx.moveTo(gx, gy); ctx.lineTo(gx + 1, gy - 7); ctx.moveTo(gx, gy); ctx.lineTo(gx + 4, gy - 5); ctx.stroke();
      } else if (th.deco === 'pyramid' && d < 0.35) {
        ctx.fillStyle = 'rgba(120,90,40,0.35)';
        for (let i = 0; i < 4; i++) ctx.fillRect(sx + (hash(x, y, 20 + i) - 0.5) * 34, sy + (hash(x, y, 30 + i) - 0.5) * 14, 1.5, 1.5);
      } else if ((th.deco === 'cave' || th.deco === 'shrine') && d < 0.2) {
        ellipse(ctx, sx + (hash(x, y, 12) - 0.5) * 26, sy + (hash(x, y, 13) - 0.5) * 10, 3, 1.6, 'rgba(0,0,0,0.25)');
      }
      if (d > 0.86) {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx - 8, sy - 2); ctx.lineTo(sx - 2, sy + 1); ctx.lineTo(sx + 4, sy - 1); ctx.stroke();
      }
      if (t === 'cracked') {
        ctx.strokeStyle = 'rgba(20,10,0,0.75)'; ctx.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) {
          let px = sx + (hash(x, y, 40 + i) - 0.5) * 10, py = sy + (hash(x, y, 50 + i) - 0.5) * 5;
          ctx.beginPath(); ctx.moveTo(px, py);
          const a = (i / 4) * TAU + hash(x, y, 60 + i);
          for (let j = 1; j <= 3; j++) {
            px += Math.cos(a + (hash(x, y, 70 + i * 3 + j) - 0.5)) * 7; py += Math.sin(a + (hash(x, y, 80 + i * 3 + j) - 0.5)) * 3.5;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ellipse(ctx, sx + 6, sy + 2, 3, 1.5, 'rgba(0,0,0,0.55)');
        ellipse(ctx, sx - 9, sy - 1, 2, 1, 'rgba(0,0,0,0.55)');
      } else if (t === 'spikes') {
        const sp = L.spikes || { down: 1, up: 1 };
        const ph = s.time % (sp.down + sp.up);
        const warn = s.spikesEnabled && !s.spikesUp && ph > sp.down - 0.35;
        const hgt = s.spikesUp ? 13 : warn ? 3 : 0;
        const pts = [[-14, 0], [14, 0], [0, -7], [0, 7], [-7, -3.5], [7, 3.5], [7, -3.5], [-7, 3.5], [0, 0]];
        for (const [ox, oy] of pts) {
          ellipse(ctx, sx + ox, sy + oy, 2.6, 1.3, 'rgba(0,0,0,0.6)');
          if (hgt > 0) {
            poly(ctx, [sx + ox - 2.5, sy + oy, sx + ox, sy + oy - hgt, sx + ox + 2.5, sy + oy], '#c9ccd2');
            poly(ctx, [sx + ox, sy + oy, sx + ox, sy + oy - hgt, sx + ox + 2.5, sy + oy], '#8a8e96');
          }
        }
        if (!s.spikesEnabled) diamond(ctx, sx, sy, HW - 4, HH - 2, 'rgba(0,0,0,0.15)');
      } else if (t === 'exit') {
        const pulse = 0.5 + Math.sin(this.time * 3 + x + y) * 0.5;
        diamond(ctx, sx, sy, HW - 3, HH - 1.5, `rgba(255,205,90,${0.28 + pulse * 0.22})`, `rgba(255,225,140,${0.6 + pulse * 0.4})`, 1.5);
        diamond(ctx, sx, sy, HW - 14, HH - 7, null, 'rgba(255,240,180,0.7)', 1);
        circle(ctx, sx, sy, 2.5, 'rgba(255,245,200,0.9)');
      }
    }

    drawWall(ctx, s, x, y, sx, sy, th, alpha, light) {
      const E = AC.Engine;
      ctx.globalAlpha = alpha;
      const v = hash(x, y, 1);
      const top = th.wallTops[(v * 3) | 0];
      const showL = E.tileAt(s, x, y + 1) !== 'wall' && E.tileAt(s, x, y + 1) !== 'void';
      const showR = E.tileAt(s, x + 1, y) !== 'wall' && E.tileAt(s, x + 1, y) !== 'void';
      cube(ctx, sx, sy, WALLH, HW, HH, top, th.wall[1], th.wall[2]);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
      const rows = 4, rh = WALLH / rows;
      if (th.deco !== 'cave') {
        ctx.beginPath();
        for (let r = 1; r < rows; r++) {
          const k = r * rh;
          if (showL) { ctx.moveTo(sx - HW, sy - k); ctx.lineTo(sx, sy + HH - k); }
          if (showR) { ctx.moveTo(sx, sy + HH - k); ctx.lineTo(sx + HW, sy - k); }
        }
        for (let r = 0; r < rows; r++) {
          const k = r * rh;
          const f = r % 2 ? 0.33 : 0.66;
          if (showL) { ctx.moveTo(sx - HW + f * HW, sy + f * HH - k); ctx.lineTo(sx - HW + f * HW, sy + f * HH - k - rh); }
          if (showR) { ctx.moveTo(sx + f * HW, sy + HH - f * HH - k); ctx.lineTo(sx + f * HW, sy + HH - f * HH - k - rh); }
        }
        ctx.stroke();
      } else {
        if (showL) poly(ctx, [sx - HW + 6, sy - 10, sx - 12, sy - 3, sx - 14, sy - 22, sx - HW + 8, sy - 30], 'rgba(0,0,0,0.12)');
        if (showR) poly(ctx, [sx + 6, sy + 4, sx + 24, sy - 8, sx + 22, sy - 28, sx + 8, sy - 18], 'rgba(255,255,255,0.04)');
      }
      // Kante oben
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.moveTo(sx - HW, sy - WALLH); ctx.lineTo(sx, sy + HH - WALLH); ctx.lineTo(sx + HW, sy - WALLH); ctx.stroke();

      const d = hash(x, y, 3);
      if (th.deco === 'jungle') {
        if (d < 0.45) {
          ellipse(ctx, sx + (hash(x, y, 4) - 0.5) * 24, sy - WALLH + (hash(x, y, 5) - 0.5) * 8, 9, 4, 'rgba(70,120,50,0.8)');
          ellipse(ctx, sx + (hash(x, y, 6) - 0.5) * 24, sy - WALLH + (hash(x, y, 7) - 0.5) * 8, 6, 3, 'rgba(95,150,60,0.8)');
        }
        if (d < 0.35 && (showL || showR)) {
          ctx.strokeStyle = 'rgba(70,130,50,0.9)'; ctx.lineWidth = 1.6;
          const fx = showL ? sx - HW / 2 : sx + HW / 2, fy = sy + HH / 2 - WALLH;
          ctx.beginPath(); ctx.moveTo(fx, fy);
          ctx.bezierCurveTo(fx - 4, fy + 12, fx + 4, fy + 22, fx - 1, fy + 32 + d * 20); ctx.stroke();
          ellipse(ctx, fx - 3, fy + 14, 2.5, 1.5, 'rgba(90,150,60,0.9)');
          ellipse(ctx, fx + 2, fy + 25, 2.5, 1.5, 'rgba(90,150,60,0.9)');
        }
      } else if (th.deco === 'pyramid' && d < 0.4 && showL) {
        ctx.strokeStyle = 'rgba(90,60,25,0.55)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) {
          const f = 0.2 + i * 0.28, lx = sx - HW + f * HW, ly = sy + f * HH - 26;
          const g = hash(x + i, y, 9);
          ctx.beginPath();
          if (g < 0.33) { ctx.arc(lx, ly, 2.4, 0, TAU); ctx.moveTo(lx, ly + 2.4); ctx.lineTo(lx, ly + 7); }
          else if (g < 0.66) { ctx.moveTo(lx - 3, ly + 4); ctx.lineTo(lx, ly - 3); ctx.lineTo(lx + 3, ly + 4); }
          else { ctx.moveTo(lx - 3, ly); ctx.quadraticCurveTo(lx, ly - 5, lx + 3, ly); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 6); }
          ctx.stroke();
        }
      } else if (th.deco === 'shrine' && (showL || showR)) {
        ctx.fillStyle = 'rgba(210,160,60,0.35)';
        if (showL) poly(ctx, [sx - HW, sy - WALLH + 6, sx, sy + HH - WALLH + 6, sx, sy + HH - WALLH + 9, sx - HW, sy - WALLH + 9], 'rgba(210,160,60,0.4)');
        if (showR) poly(ctx, [sx, sy + HH - WALLH + 6, sx + HW, sy - WALLH + 6, sx + HW, sy - WALLH + 9, sx, sy + HH - WALLH + 9], 'rgba(170,125,45,0.4)');
      } else if (th.deco === 'cave' && d < 0.1) {
        this.crystalCluster(ctx, sx + (hash(x, y, 4) - 0.5) * 20, sy - WALLH, ['#6cf', '#c6f', '#6fc'][(d * 30 | 0) % 3], 0.7);
      }
      if (light) {
        if (light[2] === 'torch') this.brazier(ctx, sx, sy - WALLH);
        else this.crystalCluster(ctx, sx, sy - WALLH, light[3] || '#6cf', 1.2);
      }
      ctx.globalAlpha = 1;
    }

    brazier(ctx, x, y) {
      const t = this.time;
      poly(ctx, [x - 8, y - 2, x + 8, y - 2, x + 5, y + 4, x - 5, y + 4], '#3a2a1a');
      ellipse(ctx, x, y - 2, 8, 3, '#5a4028');
      const f = 1 + Math.sin(t * 13 + x) * 0.12 + Math.sin(t * 7.3 + y) * 0.1;
      ctx.save();
      ctx.shadowColor = '#ff9a2a'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#ff8a1a';
      ctx.beginPath(); ctx.moveTo(x - 6, y - 2); ctx.quadraticCurveTo(x - 6, y - 14 * f, x + Math.sin(t * 9) * 2, y - 20 * f); ctx.quadraticCurveTo(x + 6, y - 12 * f, x + 6, y - 2); ctx.fill();
      ctx.fillStyle = '#ffd34a';
      ctx.beginPath(); ctx.moveTo(x - 3, y - 2); ctx.quadraticCurveTo(x - 3, y - 9 * f, x + Math.sin(t * 9) * 1.5, y - 13 * f); ctx.quadraticCurveTo(x + 3, y - 8 * f, x + 3, y - 2); ctx.fill();
      ctx.restore();
    }
    crystalCluster(ctx, x, y, col, sc) {
      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = 12 * sc;
      const sh = [[-6, 0, 4, 16, -0.3], [0, 1, 5, 22, 0.05], [6, 0, 4, 14, 0.35]];
      for (const [ox, oy, w, h, a] of sh) {
        ctx.save(); ctx.translate(x + ox * sc, y + oy * sc); ctx.rotate(a); ctx.scale(sc, sc);
        poly(ctx, [-w, 0, -w * 0.7, -h * 0.75, 0, -h, w * 0.7, -h * 0.75, w, 0], rgba(col.length === 4 ? '#' + col[1] + col[1] + col[2] + col[2] + col[3] + col[3] : col, 0.85));
        poly(ctx, [-w * 0.2, 0, -w * 0.2, -h * 0.8, 0, -h, w * 0.3, -h * 0.75, w * 0.3, 0], 'rgba(255,255,255,0.35)');
        ctx.restore();
      }
      ctx.restore();
    }

    drawChar(ctx, s, c, p, sx, sy, isActive) {
      const time = this.time;
      let z = 0;
      if (c.t > 0 && c.kind === 'jump') z = Math.sin(Math.PI * p.p) * 26;
      if (c.t > 0 && c.kind === 'swing') z = Math.sin(Math.PI * p.p) * 30;
      // Seil beim Schwingen
      if (c.t > 0 && c.kind === 'swing') {
        const [hx, hy] = iso(c.hookX, c.hookY);
        ctx.strokeStyle = '#7a5a30'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(hx, hy - 70); ctx.quadraticCurveTo((hx + sx) / 2, (hy - 70 + sy - z - 30) / 2 + 8, sx, sy - z - 30); ctx.stroke();
      }
      ellipse(ctx, sx, sy, 11 - z * 0.15, 5 - z * 0.06, `rgba(0,0,0,${0.35 - z * 0.006})`);
      if (isActive) {
        const pulse = 0.6 + Math.sin(time * 5) * 0.4;
        ctx.strokeStyle = `rgba(255,214,110,${0.5 + pulse * 0.5})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sx, sy, 15 + pulse * 1.5, 7.5 + pulse * 0.75, 0, 0, TAU); ctx.stroke();
      }
      if (c.hurtT > 0 && Math.floor(time * 16) % 2 === 0) return;
      const moving = c.t > 0 && (c.kind === 'walk' || c.kind === 'push');
      const speed = c.sprint ? 30 : 17;
      ctx.save();
      ctx.translate(sx, sy - z);
      if (c.kind === 'smash' && c.t > 0) ctx.translate(Math.sin(c.t * 60) * 1.5, 0);
      drawKid(ctx, c.id, { dir: c.dir, moving, phase: time * speed });
      ctx.restore();
      if (c.id === 'lea' && c.sprint) {
        ctx.save(); ctx.translate(sx + 11, sy - z - 52);
        poly(ctx, [0, -6, -4, 1, -0.5, 1, -2, 7, 4, -1, 0.5, -1, 2, -6], '#ffd24a', 'rgba(80,50,0,0.6)');
        ctx.restore();
        if (moving) {
          ctx.strokeStyle = 'rgba(255,240,200,0.5)'; ctx.lineWidth = 1.5;
          const [dx, dy] = AC.Engine.DIRV[c.dir];
          const bx = -(dx - dy) * 12, by = -(dx + dy) * 6;
          ctx.beginPath();
          for (let i = 0; i < 3; i++) { ctx.moveTo(sx + bx, sy - 12 - i * 9 - z); ctx.lineTo(sx + bx * 2.2, sy - 12 - i * 9 - z + by); }
          ctx.stroke();
        }
      }
      if (isActive) {
        const b = Math.sin(time * 4) * 3;
        const hy = sy - z - (c.id === 'ben' ? 70 : 64) + b;
        poly(ctx, [sx - 6, hy - 7, sx + 6, hy - 7, sx, hy], '#ffd66e', 'rgba(80,50,0,0.7)');
      }
    }

    drawFx(ctx, s, dt) {
      // Partikel
      for (const p of this.parts) {
        p.life -= dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const a = clamp(p.life / p.max, 0, 1);
        if (p.arrow) {
          ctx.strokeStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${a})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 22, p.y); ctx.stroke();
          poly(ctx, [p.x + 4, p.y, p.x - 2, p.y - 3, p.x - 2, p.y + 3], `rgba(160,160,170,${a})`);
        } else if (p.star) star(ctx, p.x, p.y, p.size * (0.5 + a * 0.5), `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${a})`);
        else if (p.sq) { ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${a})`; ctx.fillRect(p.x, p.y, p.size, p.size); }
        else circle(ctx, p.x, p.y, p.size * (1.4 - a * 0.4), `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${a * 0.5})`);
      }
      this.parts = this.parts.filter((p) => p.life > 0);
      // Peitsche
      for (const w of this.whips) {
        w.life -= dt;
        const [ax, ay] = iso(w.fx, w.fy), [bx, by] = iso(w.tx, w.ty);
        const a = clamp(w.life / 0.35, 0, 1);
        const sy0 = ay - 24, sy1 = by - (w.hook ? 70 : 22);
        ctx.strokeStyle = `rgba(90,55,25,${a})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ax, sy0); ctx.quadraticCurveTo((ax + bx) / 2, Math.min(sy0, sy1) - 30 * a, bx, sy1); ctx.stroke();
        star(ctx, bx, sy1, 6 * a + 2, `rgba(255,240,180,${a})`);
      }
      this.whips = this.whips.filter((w) => w.life > 0);
      // schwebende Beschriftungen
      for (const l of this.labels) {
        l.life -= dt;
        ctx.save(); ctx.globalAlpha = clamp(l.life / 0.4, 0, 1);
        this.label(l.text, l.x, l.y - (1.3 - l.life) * 14);
        ctx.restore();
      }
      this.labels = this.labels.filter((l) => l.life > 0);
    }

    drawLighting(s, L, th, items, time) {
      const lc = this.lctx, W = this.light.width, H = this.light.height;
      const lights = [];
      for (const c of s.chars) {
        const p = charPos(c); const [x, y] = iso(p.x, p.y);
        lights.push({ x, y: y - 20, r: c === s.chars[s.active] ? 190 : 150, a: 1 });
      }
      for (const lt of L.lights || []) {
        const [x, y] = iso(lt[0], lt[1]);
        const fl = lt[2] === 'torch' ? 1 + Math.sin(time * 11 + x) * 0.04 + Math.sin(time * 5.3 + y) * 0.04 : 1 + Math.sin(time * 1.5 + x) * 0.05;
        lights.push({ x, y: y - WALLH - 8, r: (lt[2] === 'torch' ? 230 : 170) * fl, a: 1, col: lt[2] === 'torch' ? '#ff9a3a' : (lt[3] || '#66ccff') });
      }
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.tiles[y][x] === 'exit') { const [sx, sy] = iso(x, y); lights.push({ x: sx, y: sy, r: 70, a: 0.8, col: '#ffcf6a' }); }
      for (const o of s.objects) {
        if (o.type === 'gem' || o.type === 'key') { const [sx, sy] = iso(o.x, o.y); lights.push({ x: sx, y: sy - 16, r: 55, a: 0.7 }); }
        if (o.type === 'pedestal' && o.hasIdol) { const [sx, sy] = iso(o.x, o.y); lights.push({ x: sx, y: sy - 50, r: 120, a: 0.9, col: '#ffd25a' }); }
        if (o.type === 'door' && o.lock && !o.open) { const [sx, sy] = iso(o.x, o.y); lights.push({ x: sx, y: sy - 24, r: 80, a: 0.7, col: '#7fe8ff' }); }
      }
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.globalCompositeOperation = 'source-over';
      lc.clearRect(0, 0, W, H);
      const red = s.timer !== null && !s.complete ? 0.5 + Math.sin(time * 6) * 0.5 : 0;
      lc.fillStyle = `rgba(${Math.round(4 + red * 50)},3,${Math.round(10 - red * 6)},${th.dark})`;
      lc.fillRect(0, 0, W, H);
      lc.globalCompositeOperation = 'destination-out';
      const sc = this.zoom * this.dpr;
      const vis = [];
      for (const l of lights) {
        const [px, py] = this.toPx(l.x, l.y);
        const r = l.r * sc;
        if (px < -r || py < -r || px > W + r || py > H + r) continue;
        vis.push([l, px, py, r]);
        const g = lc.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, `rgba(0,0,0,${l.a})`);
        g.addColorStop(0.5, `rgba(0,0,0,${l.a * 0.6})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = g;
        lc.fillRect(px - r, py - r, r * 2, r * 2);
      }
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.light, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      for (const [l, px, py, r] of vis) {
        if (!l.col) continue;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r * 0.75);
        g.addColorStop(0, rgba(l.col, 0.16));
        g.addColorStop(1, rgba(l.col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      // Vignette
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  }

  function charPos(c) {
    if (c.t > 0 && c.kind !== 'hurt' && c.dur > 0) {
      const p = 1 - c.t / c.dur;
      const e = c.kind === 'walk' ? p : p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      return { x: c.px + (c.x - c.px) * e, y: c.py + (c.y - c.py) * e, p };
    }
    return { x: c.x, y: c.y, p: 1 };
  }

  // ---------------------------------------------------------------- Porträts & Icons für die Oberfläche
  function drawPortrait(cv, id) {
    const c = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    const bgc = { mia: '#1d4f5a', ben: '#5a2318', lea: '#5e4212', tip: '#4a3a1c' }[id] || '#333';
    const g = c.createRadialGradient(w / 2, h * 0.4, 2, w / 2, h / 2, w * 0.7);
    g.addColorStop(0, shade(bgc, 0.25)); g.addColorStop(1, bgc);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (id === 'tip') {
      c.translate(w / 2, h / 2);
      c.scale(w / 64, w / 64);
      c.strokeStyle = '#e8c26a'; c.lineWidth = 3;
      c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.stroke();
      poly(c, [0, -17, 5, 0, 0, 17, -5, 0], null);
      poly(c, [0, -17, 5, 0, -5, 0], '#e85a3a');
      poly(c, [0, 17, 5, 0, -5, 0], '#f1e2bd');
      return;
    }
    const sc = w / 30;
    c.translate(w / 2 - 1 * sc, h * 0.5 + 36 * sc);
    c.scale(sc, sc);
    drawKid(c, id, { dir: 1, moving: false });
  }
  function drawIcon(cv, type) {
    const c = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    const sc = w / 40;
    c.translate(w / 2, h * 0.72);
    c.scale(sc, sc);
    if (type === 'gem') drawGem(c, 0, 10, '#4bb5ff', 0);
    else if (type === 'key') drawKey(c, -2, 12, 0);
    else if (type === 'sandbag') drawSack(c, 0, 4);
    else if (type === 'idol') drawIdol(c, 0, 6, 0);
  }

  AC.Renderer = Renderer;
  AC.drawPortrait = drawPortrait;
  AC.drawIcon = drawIcon;
})();
