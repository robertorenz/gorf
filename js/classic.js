/* GORF Arcade Original — a recreation of the 1981 cabinet.
   Everything lives on a 240x320 portrait "screen" of logical pixels, like the
   vertical monitor, but every sprite pixel is drawn straight onto a canvas at
   the browser's full device resolution, so nothing is upscaled or blurred. */
(() => {
'use strict';

const LW = 240, LH = 320;          // logical screen
const TOP = 22, BOT = 302;         // playfield band between the score lines
const PY_MIN = 238, PY_MAX = 292;  // the fighter may climb a little
const RANKS = ['SPACE CADET', 'SPACE CAPTAIN', 'SPACE COLONEL', 'SPACE GENERAL', 'SPACE WARRIOR', 'SPACE AVENGER'];
const K = {
  white: '#ffffff', red: '#ff2a2a', yellow: '#ffe000', cyan: '#20e8ff', blue: '#3a6cff',
  green: '#30ff60', orange: '#ff8a00', steel: '#a8b8c8', grey: '#5a6878', dark: '#1830a0'
};
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = arr => arr[(Math.random() * arr.length) | 0];

/* ------------------------------------------------------------------ */
/* Sprites                                                             */
/* Art is drawn at double detail (one character per half logical      */
/* pixel, '.' transparent). At load it is smoothed with Scale2x and    */
/* shaded from its edges, so each final pixel is a quarter of a        */
/* logical pixel: about one device pixel on a typical screen.          */
/* ------------------------------------------------------------------ */
const dbl = rows => rows.flatMap(r => { const d = r.replace(/./g, c => c + c); return [d, d]; });
const EYE = '#0b1220';
const GAL = [[
  '........aa........',
  '........aa........',
  '......aaaaaa......',
  '......aaaaaa......',
  'aa....akaaka....aa',
  'aa....aaaaaa....aa',
  'aaaa..aabbaa..aaaa',
  'aaaa..aabbaa..aaaa',
  'aaaaaaaabbaaaaaaaa',
  'aaaaaaaabbaaaaaaaa',
  'aa..aaaaaaaaaa..aa',
  'aa..aaaaaaaaaa..aa',
  '......aa..aa......',
  '......aa..aa......',
  '....aa......aa....',
  '....aa......aa....'
], [
  '........aa........',
  '........aa........',
  '......aaaaaa......',
  '......aaaaaa......',
  '......akaaka......',
  '......aaaaaa......',
  'aa....aabbaa....aa',
  'aa....aabbaa....aa',
  'aaaaaaaabbaaaaaaaa',
  'aaaaaaaabbaaaaaaaa',
  'aaaaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaaaa',
  '..aa..aa..aa..aa..',
  '..aa..aa..aa..aa..',
  '....aa......aa....',
  '....aa......aa....'
]];
const SPR = {
  ship: { pal: { w: K.white, c: K.cyan, C: '#0a8fb0', r: K.red, b: K.blue, y: K.yellow }, flat: '', f: [[
    '..........ww..........',
    '..........ww..........',
    '.........wwww.........',
    '.........wwww.........',
    '........wwccww........',
    '........wcccCw........',
    '........wccCCw........',
    '..rr....wwccww....rr..',
    '..rr...wwwwwwww...rr..',
    '..rr..wwwwwwwwww..rr..',
    '..ww.wwwwwwwwwwww.ww..',
    '.wwwwwwwwwwwwwwwwwwww.',
    'wwwwwwwwwwwwwwwwwwwwww',
    'wwwbwwwwyyyyyywwwwbwww',
    'www..www.yyyy.www..www',
    'ww....ww......ww....ww'
  ]] },
  invA: { pal: { a: K.cyan, k: EYE, e: K.white }, f: [[
    '........aaaaaaaa........',
    '......aaaaaaaaaaaa......',
    '....aaaaaaaaaaaaaaaa....',
    '...aaaaaaaaaaaaaaaaaa...',
    '..aaaaaaaaaaaaaaaaaaaa..',
    '..aaaaaaaaaaaaaaaaaaaa..',
    '..aaaakkekaaaakkekaaaa..',
    '..aaaakkkkaaaakkkkaaaa..',
    '..aaaaaaaaaaaaaaaaaaaa..',
    '..aaaaaaaaaaaaaaaaaaaa..',
    '......aaaa....aaaa......',
    '......aaaa....aaaa......',
    '....aaaa..aaaa..aaaa....',
    '....aaaa..aaaa..aaaa....',
    'aaaa................aaaa',
    'aaaa................aaaa'
  ], [
    '........aaaaaaaa........',
    '......aaaaaaaaaaaa......',
    '....aaaaaaaaaaaaaaaa....',
    '...aaaaaaaaaaaaaaaaaa...',
    '..aaaaaaaaaaaaaaaaaaaa..',
    '..aaaaaaaaaaaaaaaaaaaa..',
    '..aaaakkekaaaakkekaaaa..',
    '..aaaakkkkaaaakkkkaaaa..',
    '..aaaaaaaaaaaaaaaaaaaa..',
    '..aaaaaaaaaaaaaaaaaaaa..',
    '........aa....aa........',
    '........aa....aa........',
    '......aa..aaaa..aa......',
    '......aa..aaaa..aa......',
    '........aa....aa........',
    '........aa....aa........'
  ]] },
  invB: { pal: { a: K.green, k: EYE, e: K.white }, f: [[
    '....aa..........aa....',
    '....aa..........aa....',
    '......aa......aa......',
    '......aa......aa......',
    '....aaaaaaaaaaaaaa....',
    '....aaaaaaaaaaaaaa....',
    '..aaaakkaaaaaakkaaaa..',
    '..aaaakeaaaaaakeaaaa..',
    'aaaaaaaaaaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaaaaaaaa',
    'aa..aaaaaaaaaaaaaa..aa',
    'aa..aaaaaaaaaaaaaa..aa',
    'aa..aa..........aa..aa',
    'aa..aa..........aa..aa',
    '......aaaa..aaaa......',
    '......aaaa..aaaa......'
  ], [
    '....aa..........aa....',
    '....aa..........aa....',
    'aa....aa......aa....aa',
    'aa....aa......aa....aa',
    'aa..aaaaaaaaaaaaaa..aa',
    'aa..aaaaaaaaaaaaaa..aa',
    'aaaaaakkaaaaaakkaaaaaa',
    'aaaaaakeaaaaaakeaaaaaa',
    'aaaaaaaaaaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaaaaaaaa',
    '..aaaaaaaaaaaaaaaaaa..',
    '..aaaaaaaaaaaaaaaaaa..',
    '....aa..........aa....',
    '....aa..........aa....',
    '..aa..............aa..',
    '..aa..............aa..'
  ]] },
  invC: { pal: { a: K.yellow, k: EYE, e: K.white, m: '#b05a00' }, f: [[
    '......aaaa......',
    '.....aaaaaa.....',
    '....aaaaaaaa....',
    '...aaaaaaaaaa...',
    '..aaaaaaaaaaaa..',
    '.aaaaaaaaaaaaaa.',
    'aaakkkaaaakkkaaa',
    'aaakekaaaakekaaa',
    'aaaaaaaaaaaaaaaa',
    'aaaaaammmmaaaaaa',
    '....aa....aa....',
    '....aa....aa....',
    '..aa..aaaa..aa..',
    '..aa..aaaa..aa..',
    'aa..aa....aa..aa',
    'aa..aa....aa..aa'
  ], [
    '......aaaa......',
    '.....aaaaaa.....',
    '....aaaaaaaa....',
    '...aaaaaaaaaa...',
    '..aaaaaaaaaaaa..',
    '.aaaaaaaaaaaaaa.',
    'aaakkkaaaakkkaaa',
    'aaakekaaaakekaaa',
    'aaaaaaaaaaaaaaaa',
    'aaaaaammmmaaaaaa',
    '..aa..aaaa..aa..',
    '..aa..aaaa..aa..',
    'aa............aa',
    'aa............aa',
    '..aa........aa..',
    '..aa........aa..'
  ]] },
  gorfship: { pal: { a: K.red, y: K.yellow, c: K.cyan }, flat: 'y', f: [[
    '............cccccccc............',
    '..........cccccccccccc..........',
    '......aaaaaaaaaaaaaaaaaaaa......',
    '....aaaaaaaaaaaaaaaaaaaaaaaa....',
    '..aaaayyaaaayyaaaayyaaaayyaaaa..',
    '..aaaayyaaaayyaaaayyaaaayyaaaa..',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '....aaaaaa....aaaa....aaaaaa....',
    '....aaaaaa....aaaa....aaaaaa....',
    '......aa................aa......',
    '......aa................aa......'
  ], [
    '............cccccccc............',
    '..........cccccccccccc..........',
    '......aaaaaaaaaaaaaaaaaaaa......',
    '....aaaaaaaaaaaaaaaaaaaaaaaa....',
    '..aaaaaayyaaaayyyyaaaayyaaaaaa..',
    '..aaaaaayyaaaayyyyaaaayyaaaaaa..',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '....aaaaaa....aaaa....aaaaaa....',
    '....aaaaaa....aaaa....aaaaaa....',
    '......aa................aa......',
    '......aa................aa......'
  ]] },
  laser: { pal: { a: K.steel, y: K.yellow, r: K.red, c: K.cyan }, flat: 'y', f: [[
    '......aaaaaaaaaa......',
    '......aaaccccaaa......',
    '..aaaaaaaccccaaaaaaa..',
    '..aaaaaaaaaaaaaaaaaa..',
    'aaaayyaaaaaaaaaayyaaaa',
    'aaaayyaaaaaaaaaayyaaaa',
    'aaaaaaaaaaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaaaaaaaa',
    '..aaaa..aaaaaa..aaaa..',
    '..aaaa..aaaaaa..aaaa..',
    '........aaaaaa........',
    '........aaaaaa........',
    '..........rr..........',
    '..........rr..........',
    '..........yy..........',
    '..........yy..........'
  ]] },
  robot: { pal: { a: K.orange, e: K.red, d: '#5a2000' }, flat: 'e', f: [[
    '......aaaaaa......',
    '......aaaaaa......',
    '....aaaaaaaaaa....',
    '....aaaaaaaaaa....',
    '..aaeeaaaaaaeeaa..',
    '..aaeeaaaaaaeeaa..',
    '..aaaaaaaaaaaaaa..',
    '..aaaaaaaaaaaaaa..',
    'aaaa..dddddd..aaaa',
    'aaaa..dddddd..aaaa',
    'aa..aaaaaaaaaa..aa',
    'aa..aaaaaaaaaa..aa',
    '....aa......aa....',
    '....aa......aa....',
    '..aaaa......aaaa..',
    '..aaaa......aaaa..'
  ], [
    '......aaaaaa......',
    '......aaaaaa......',
    '....aaaaaaaaaa....',
    '....aaaaaaaaaa....',
    '..aaeeaaaaaaeeaa..',
    '..aaeeaaaaaaeeaa..',
    '..aaaaaaaaaaaaaa..',
    '..aaaaaaaaaaaaaa..',
    'aaaa..dddddd..aaaa',
    'aaaa..dddddd..aaaa',
    'aa..aaaaaaaaaa..aa',
    'aa..aaaaaaaaaa..aa',
    '..aa..........aa..',
    '..aa..........aa..',
    'aaaa..........aaaa',
    'aaaa..........aaaa'
  ]] },
  galBlue: { pal: { a: K.blue, b: K.yellow, k: EYE }, f: GAL },
  galGreen: { pal: { a: K.green, b: K.red, k: EYE }, f: GAL },
  galRed: { pal: { a: K.red, b: K.yellow, k: EYE }, f: GAL },
  galFlag: { pal: { a: K.yellow, b: K.red, k: EYE }, f: GAL },
  face: { pal: { a: K.steel, r: K.red, d: K.grey }, flat: 'r', f: [dbl([
    '....aaaaaaaa....',
    '..aaaaaaaaaaaa..',
    '.aaaaaaaaaaaaaa.',
    'aaa..aaaaaa..aaa',
    'aa.rr.aaaa.rr.aa',
    'aa.rr.aaaa.rr.aa',
    'aaa..aaaaaa..aaa',
    'aaaaaaa..aaaaaaa',
    'aaaaaaa..aaaaaaa',
    '.aaaaaaaaaaaaaa.',
    '.aa.d.d.d.d.daa.',
    '.aaddddddddddaa.',
    '..aaaaaaaaaaaa..',
    '....aaaaaaaa....'
  ])] }
};

// Scale2x (EPX): doubles a character grid, rounding off stair-step diagonals.
function scale2x(g) {
  const h = g.length, w = g[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : g[y][x]);
  const out = [];
  for (let y = 0; y < h; y++) {
    let r0 = '', r1 = '';
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      r0 += (C === A && C !== D && A !== B) ? A : P;
      r0 += (A === B && A !== C && B !== D) ? B : P;
      r1 += (D === C && D !== B && C !== A) ? C : P;
      r1 += (B === D && B !== A && D !== C) ? D : P;
    }
    out.push(r0, r1);
  }
  return out;
}
const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
// Lighten (f > 0) toward white or darken (f < 0) toward black.
function tint(c, f) {
  const [r, g, b] = rgb(c), t = f > 0 ? 255 : 0, a = Math.min(Math.abs(f), 0.75);
  return `rgb(${Math.round(r + (t - r) * a)},${Math.round(g + (t - g) * a)},${Math.round(b + (t - b) * a)})`;
}
// Light from the top-left: bright rims on top and left edges, shadow below and right.
function shadeAt(g, x, y, base) {
  const h = g.length, w = g[0].length;
  const e = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= w || yy >= h || g[yy][xx] === '.'; };
  let f = 0.16 - 0.34 * y / Math.max(1, h - 1);
  if (e(0, -1)) f += 0.38; else if (e(0, -2)) f += 0.14;
  if (e(0, 1)) f -= 0.42; else if (e(0, 2)) f -= 0.14;
  if (e(-1, 0)) f += 0.12;
  if (e(1, 0)) f -= 0.2;
  return tint(base, f);
}
for (const k in SPR) {
  const s = SPR[k];
  s.g = s.f.map(scale2x);
  s.q = 0.25;                    // logical size of one final pixel
  s.w = s.g[0][0].length * s.q;  // logical width and height
  s.h = s.g[0].length * s.q;
  s.color = s.pal[Object.keys(s.pal)[0]];
  if (s.flat === undefined) s.flat = 'ke';
}

const LOGO = {
  G: ['.#####.', '##...##', '##.....', '##..###', '##...##', '##...##', '.#####.'],
  O: ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  R: ['######.', '##...##', '##...##', '######.', '##.##..', '##..##.', '##...##'],
  F: ['#######', '##.....', '##.....', '######.', '##.....', '##.....', '##.....']
};

/* ------------------------------------------------------------------ */
/* Canvas & drawing at device resolution                               */
/* ------------------------------------------------------------------ */
let cv = null, ctx = null, S = 1, OX = 0, OY = 0;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.round(window.innerWidth * dpr);
  cv.height = Math.round(window.innerHeight * dpr);
  S = Math.min(cv.width / LW, cv.height / LH);
  OX = (cv.width - LW * S) / 2;
  OY = (cv.height - LH * S) / 2;
  spriteCache.clear();
}
const X = x => Math.round(OX + x * S);
const Y = y => Math.round(OY + y * S);
function rect(x, y, w, h, c) {
  const x0 = X(x), y0 = Y(y);
  if (c) ctx.fillStyle = c;
  ctx.fillRect(x0, y0, Math.max(1, X(x + w) - x0), Math.max(1, Y(y + h) - y0));
}
// Each sprite frame is rendered once per screen size into an offscreen
// canvas, with a soft phosphor glow, then blitted every frame.
const spriteCache = new Map();
function spriteImg(name, fi, flip, palOver) {
  const key = name + ':' + fi + (flip ? 'f' : '') + (palOver ? JSON.stringify(palOver) : '');
  let c = spriteCache.get(key);
  if (c) return c;
  const s = SPR[name], g = flip ? s.g[fi].slice().reverse() : s.g[fi];
  const h = g.length, w = g[0].length, q = s.q * S;
  const body = document.createElement('canvas');
  body.width = Math.max(1, Math.round(w * q));
  body.height = Math.max(1, Math.round(h * q));
  const b = body.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = g[y][x];
      if (ch === '.') continue;
      const base = (palOver && palOver[ch]) || s.pal[ch];
      b.fillStyle = s.flat.includes(ch) ? base : shadeAt(g, x, y, base);
      const x0 = Math.round(x * q), y0 = Math.round(y * q);
      b.fillRect(x0, y0, Math.max(1, Math.round((x + 1) * q) - x0), Math.max(1, Math.round((y + 1) * q) - y0));
    }
  }
  const pad = Math.ceil(S * 1.6);
  const out = document.createElement('canvas');
  out.width = body.width + pad * 2;
  out.height = body.height + pad * 2;
  const o = out.getContext('2d');
  o.filter = `blur(${(S * 0.7).toFixed(1)}px)`;
  o.globalAlpha = 0.6;
  o.drawImage(body, pad, pad);
  o.filter = 'none';
  o.globalAlpha = 1;
  o.drawImage(body, pad, pad);
  c = { img: out, pad };
  spriteCache.set(key, c);
  return c;
}
function sprite(name, cx, cy, frame, k, flip, palOver) {
  const s = SPR[name], n = s.g.length, fi = (((frame || 0) % n) + n) % n;
  k = k || 1;
  const c = spriteImg(name, fi, flip, palOver);
  const x0 = X(cx - s.w * k / 2) - c.pad * k, y0 = Y(cy - s.h * k / 2) - c.pad * k;
  if (k === 1) ctx.drawImage(c.img, x0, y0);
  else ctx.drawImage(c.img, x0, y0, c.img.width * k, c.img.height * k);
}
function text(str, x, y, color, size, align) {
  ctx.font = `${Math.round((size || 8) * S)}px "Press Start 2P", "Courier New", monospace`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(str, X(x), Y(y));
}
const pad = (n, l) => String(n).padStart(l, '0');

/* ------------------------------------------------------------------ */
/* Sound & speech                                                      */
/* ------------------------------------------------------------------ */
let ac = null, noiseBuf = null, muted = false;
function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function tone(f, dur, type, vol, f2, delay) {
  if (!ac || muted) return;
  const t = ac.currentTime + (delay || 0);
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol || 0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, cutoff) {
  if (!ac || muted) return;
  const t = ac.currentTime;
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuf; src.loop = true;
  f.type = 'lowpass';
  f.frequency.setValueAtTime(cutoff || 2000, t);
  f.frequency.exponentialRampToValueAtTime(60, t + dur);
  g.gain.setValueAtTime(vol || 0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(ac.destination);
  src.start(t); src.stop(t + dur + 0.02);
}
let marchI = 0;
const sfx = {
  shoot: () => tone(1800, 0.13, 'square', 0.05, 260),
  hit: () => noise(0.28, 0.22, 2600),
  die: () => { noise(1.2, 0.45, 1400); tone(600, 1.1, 'sawtooth', 0.08, 40); },
  march: () => tone([92, 82, 73, 69][marchI++ % 4], 0.1, 'square', 0.09),
  dive: () => tone(1500, 0.6, 'sine', 0.06, 380),
  ufo: () => tone(rand(500, 700), 0.12, 'sawtooth', 0.025, 900),
  charge: () => tone(120, 0.6, 'sawtooth', 0.05, 1600),
  beam: () => tone(90, 0.7, 'sawtooth', 0.11, 70),
  warp: () => tone(200, 0.5, 'sine', 0.05, 1400),
  block: () => tone(240, 0.05, 'square', 0.05, 120),
  big: () => { noise(2.4, 0.55, 1200); tone(140, 2, 'sawtooth', 0.12, 25); },
  start: () => [196, 233, 196, 147, 196, 294].forEach((f, i) => tone(f, 0.2, 'square', 0.07, null, i * 0.16)),
  clear: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.06, null, i * 0.09)),
  coin: () => { tone(988, 0.08, 'square', 0.06); tone(1319, 0.3, 'square', 0.06, null, 0.08); }
};
function say(t) {
  if (muted || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.pitch = 0; u.rate = 0.78; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch (e) { /* speech is optional */ }
}
const rank = () => RANKS[Math.min(level, RANKS.length - 1)];
const rankSay = () => rank().toLowerCase();

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */
let active = false, onExit = null, raf = 0;
let state = 'attract', stT = 0, attractT = 0, paused = false, time = 0, flash = 0;
let score = 0, lives = 3, level = 0, mIdx = 0, M = null, promoted = false;
let hi = 0;
try { hi = +localStorage.getItem('gorf.classic.hi') || 0; } catch (e) { /* storage unavailable */ }

const P = { x: 120, y: 284, dead: false, deadT: 0, inv: 0 };
let shot = null;
const foes = [], bombs = [], booms = [], pops = [];
const keys = {};
const stars = [];
for (let i = 0; i < 70; i++) {
  stars.push({ x: rand(0, LW), y: rand(TOP, BOT), sp: rand(6, 26), c: pick([K.white, K.cyan, K.yellow, K.red, K.blue]), ph: rand(0, 6) });
}
const lvl = () => 1 + level * 0.16;

/* ------------------------------------------------------------------ */
/* Entities                                                            */
/* ------------------------------------------------------------------ */
function foe(spr, x, y, pts, extra) {
  const s = SPR[spr];
  const f = Object.assign({ spr, x, y, pts, k: 1, alive: true, st: 'form', frame: 0, flip: false, w: s.w, h: s.h }, extra);
  foes.push(f);
  return f;
}
function boom(x, y, color, big) { booms.push({ x, y, t: 0, color, big: !!big, max: big ? 1.1 : 0.4 }); }
function pop(x, y, n) { pops.push({ x, y, t: 0, txt: String(n) }); }
function addScore(n) {
  const before = score;
  score += n;
  if (score > hi) hi = score;
  // Bonus ship every 10,000, as most operators set the dip switches.
  if (Math.floor(score / 10000) > Math.floor(before / 10000)) { lives++; sfx.coin(); }
}
function killFoe(f) {
  f.alive = false;
  const diving = f.st === 'peel' || f.st === 'dive';
  let p = f.pts * (diving ? 2 : 1);
  if (f.flag && diving) p = foes.some(o => o.alive && o.escortOf === f) ? 150 : 300;
  addScore(p);
  boom(f.x, f.y, SPR[f.spr].color);
  if (p >= 100) pop(f.x, f.y, p);
  sfx.hit();
  if (M.onKill) M.onKill(f);
}
function bomb(x, y, vx, vy, kind) { bombs.push({ x, y, vx, vy, kind: kind || 'zig' }); }
function aim(x, y, sp, kind) {
  const dx = P.x - x, dy = P.y - y, d = Math.hypot(dx, dy) || 1;
  bomb(x, y, dx / d * sp, dy / d * sp, kind);
}
const hits = (f, x, y, pad) => Math.abs(f.x - x) < f.w * f.k / 2 + (pad || 0) && Math.abs(f.y - y) < f.h * f.k / 2 + (pad || 0);

function fire() {
  if (state !== 'play' || P.dead || paused) return;
  // The quark laser: one bolt at a time, and firing again recalls it.
  shot = { x: P.x, y: P.y - 6 };
  sfx.shoot();
}
function killPlayer(force) {
  if (P.dead || state !== 'play' || (P.inv > 0 && !force)) return;
  P.dead = true; P.deadT = 2.2;
  boom(P.x, P.y, K.white, true);
  sfx.die();
  lives--;
  shot = null;
  say(pick([`Bite the dust, ${rankSay()}!`, `Got you, ${rankSay()}!`, 'Ha ha ha ha!', 'Long live Gorf!', `Some galactic defender you are, ${rankSay()}!`]));
}

function startDive(f) {
  f.st = 'peel'; f.pt = 0; f.dt = 0;
  f.sx = f.x; f.sy = f.y;
  f.side = f.x < 120 ? -1 : 1;
  f.sw = rand(30, 70) * (Math.random() < 0.5 ? -1 : 1);
  f.fireT = rand(0.3, 0.8);
  sfx.dive();
}
// Galaxian-style flight: peel out of the formation in a loop, dive, wrap round and rejoin.
function diver(f, dt, sx, sy) {
  if (f.st === 'form') { f.x = sx; f.y = sy; f.flip = false; return; }
  if (f.st === 'peel') {
    f.pt += dt * lvl();
    const th = Math.min(Math.PI, f.pt / 0.7 * Math.PI), cx = f.sx + f.side * 12;
    f.x = cx - f.side * 12 * Math.cos(th);
    f.y = f.sy - 12 * Math.sin(th);
    f.flip = th > Math.PI / 2;
    if (f.pt >= 0.7) { f.st = 'dive'; f.tx = P.x; }
    return;
  }
  if (f.st === 'dive') {
    f.dt += dt;
    f.y += 100 * lvl() * dt;
    if (f.y < P.y - 50) f.tx = P.x;
    f.x = clamp(f.x + clamp(f.tx - f.x, -70 * dt, 70 * dt) + Math.cos(f.dt * 3) * f.sw * dt, 6, LW - 6);
    f.fireT -= dt;
    if (f.fireT <= 0 && f.y > TOP + 40 && f.y < P.y - 40 && !P.dead) {
      f.fireT = rand(0.5, 1.1) / lvl();
      bomb(f.x, f.y + 5, clamp((P.x - f.x) * 0.6, -40, 40), 125 * lvl(), 'aim');
    }
    if (f.y > LH + 10) { f.st = 'return'; f.y = TOP - 12; f.flip = false; }
    return;
  }
  f.x += (sx - f.x) * Math.min(1, dt * 4);
  f.y += 70 * dt;
  if (f.y >= sy) { f.y = sy; f.st = 'form'; }
}

/* ------------------------------------------------------------------ */
/* The five missions                                                   */
/* ------------------------------------------------------------------ */
const MISSIONS = [

  /* 1 — Astro Battles */
  {
    name: 'ASTRO BATTLES',
    init() {
      this.dir = 1; this.stepT = 0.5; this.bombT = 1.4; this.ufo = null; this.ufoT = 8; this.ufoS = 0;
      const kinds = [['invA', 30], ['invB', 20], ['invC', 10]];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) foe(kinds[r][0], 120 + (c - 3.5) * 22, 54 + r * 18, kinds[r][1]);
      // The force field: an arc over the fighter that soaks up enemy fire
      // but lets the quark laser through.
      this.field = [];
      for (let row = 0; row < 2; row++) {
        for (let x = 18; x <= 222; x += 4) this.field.push({ x, y: 206 + 0.0022 * (x - 120) * (x - 120) + row * 4, alive: true });
      }
    },
    update(dt) {
      const inv = foes.filter(f => f.alive && !f.bonus);
      this.stepT -= dt;
      if (this.stepT <= 0 && inv.length) {
        this.stepT = (0.025 + 0.55 * inv.length / 24) / lvl();
        const edge = inv.some(f => { const nx = f.x + this.dir * 3; return nx < 10 || nx > LW - 10; });
        if (edge) { this.dir *= -1; inv.forEach(f => { f.y += 6; }); }
        else inv.forEach(f => { f.x += this.dir * 3; });
        inv.forEach(f => { f.frame ^= 1; });
        sfx.march();
        if (inv.some(f => f.y + 4 > 196)) { killPlayer(true); inv.forEach(f => { f.y -= 60; }); }
      }
      this.bombT -= dt;
      if (this.bombT <= 0 && inv.length) {
        this.bombT = rand(0.35, 1.2) / lvl();
        const col = pick(inv);
        const low = inv.filter(f => Math.abs(f.x - col.x) < 1).reduce((a, b) => (b.y > a.y ? b : a));
        bomb(low.x, low.y + 5, 0, 95 * lvl(), 'zig');
      }
      this.ufoT -= dt;
      if (!this.ufo && this.ufoT <= 0) {
        const d = Math.random() < 0.5 ? -1 : 1;
        this.ufo = foe('gorfship', d < 0 ? LW + 10 : -10, 36, pick([100, 200, 300]), { bonus: true, vx: d * 45 });
      }
      if (this.ufo) {
        this.ufo.x += this.ufo.vx * dt;
        this.ufo.frame = Math.floor(time * 8) % 2;
        if ((this.ufoS -= dt) <= 0) { this.ufoS = 0.14; sfx.ufo(); }
        if (!this.ufo.alive || this.ufo.x < -14 || this.ufo.x > LW + 14) {
          this.ufo.alive = false;
          this.ufo = null; this.ufoT = rand(10, 16);
        }
      }
    },
    absorb(b) {
      for (const c of this.field) {
        if (c.alive && Math.abs(c.x + 2 - b.x) < 3 && Math.abs(c.y + 1.5 - b.y) < 3) {
          c.alive = false;
          return true;
        }
      }
      return false;
    },
    draw() {
      const c = Math.floor(time * 10) % 2 ? K.red : K.orange;
      for (const f of this.field) {
        if (!f.alive) continue;
        rect(f.x, f.y, 3.6, 3, c);
        rect(f.x, f.y, 3.6, 0.75, tint(c, 0.45));
        rect(f.x, f.y + 2.25, 3.6, 0.75, tint(c, -0.35));
      }
    },
    done() { return !foes.some(f => f.alive && !f.bonus); }
  },

  /* 2 — Laser Attack */
  {
    name: 'LASER ATTACK',
    init() {
      this.t = 0; this.diveT = 2;
      this.squads = [-1, 1].map(s => {
        const sq = { base: 120 + s * 50, ph: s * 1.4, cx: 0, cy: 0, mode: 0, modeT: rand(2, 3.5), len: 0, members: [] };
        const add = (spr, ox, oy, pts, role) => {
          const f = foe(spr, sq.base + ox, 70 + oy, pts, { ox, oy, role });
          sq.members.push(f);
          return f;
        };
        sq.laser = add('laser', 0, 0, 150, 'laser');
        add('robot', -16, 0, 50);
        add('robot', 16, 0, 50);
        add('galRed', -8, -14, 80);
        add('galRed', 8, -14, 80);
        return sq;
      });
    },
    update(dt) {
      this.t += dt;
      for (const sq of this.squads) {
        sq.cx = sq.base + Math.sin(this.t * 0.8 * lvl() + sq.ph) * 32;
        sq.cy = 74 + Math.sin(this.t * 1.1 + sq.ph) * 8;
        for (const f of sq.members) {
          if (!f.alive) continue;
          diver(f, dt, sq.cx + f.ox, sq.cy + f.oy);
          if (f.role !== 'laser') f.frame = Math.floor(time * 4) % 2;
        }
        const L = sq.laser;
        if (!L.alive) { sq.mode = 0; continue; }
        // The laser ship charges, then shoots a beam that grows down the screen.
        sq.modeT -= dt;
        if (sq.mode === 0 && sq.modeT <= 0) { sq.mode = 1; sq.modeT = 0.6; sfx.charge(); }
        else if (sq.mode === 1 && sq.modeT <= 0) { sq.mode = 2; sq.len = 0; sfx.beam(); }
        else if (sq.mode === 2) {
          sq.len += 320 * dt;
          if (L.y + 5 + sq.len >= BOT) { sq.len = BOT - L.y - 5; sq.mode = 3; sq.modeT = 0.35; }
        } else if (sq.mode === 3 && sq.modeT <= 0) { sq.mode = 0; sq.modeT = rand(2, 4) / lvl(); }
        if (sq.mode >= 2 && Math.abs(P.x - L.x) < 5 && L.y + 5 + sq.len > P.y - 4) killPlayer();
      }
      this.diveT -= dt;
      if (this.diveT <= 0) {
        this.diveT = rand(1.1, 2.2) / lvl();
        const busy = foes.filter(f => f.alive && f.st !== 'form').length;
        const ready = foes.filter(f => f.alive && f.st === 'form' && f.role !== 'laser');
        if (ready.length && busy < 2 + level && !P.dead) startDive(pick(ready));
      }
    },
    draw() {
      for (const sq of this.squads) {
        const L = sq.laser;
        if (!L.alive) continue;
        if (sq.mode === 1 && Math.floor(time * 20) % 2) sprite('laser', L.x, L.y, 0, 1, false, { a: K.white, y: K.red });
        if (sq.mode >= 2) {
          const top = L.y + 5;
          ctx.globalAlpha = 0.35;
          rect(L.x - 2, top, 4, sq.len, K.red);
          ctx.globalAlpha = 1;
          rect(L.x - 0.75, top, 1.5, sq.len, [K.white, K.yellow, K.red][Math.floor(time * 30) % 3]);
        }
      }
    },
    done() { return !foes.some(f => f.alive); }
  },

  /* 3 — Galaxians */
  {
    name: 'GALAXIANS',
    init() {
      this.t = 0; this.diveT = 2;
      const add = (spr, c, r, pts, extra) => foe(spr, 0, 0, pts, Object.assign({ ox: (c - 4.5) * 17, oy: 52 + r * 15 }, extra));
      add('galFlag', 3, 0, 60, { flag: true }); add('galFlag', 6, 0, 60, { flag: true });
      for (let c = 2; c <= 7; c++) add('galRed', c, 1, 50);
      for (let c = 1; c <= 8; c++) add('galGreen', c, 2, 40);
      for (let c = 0; c <= 9; c++) add('galBlue', c, 3, 30);
      for (const f of foes) { f.x = 120 + f.ox; f.y = f.oy; }
    },
    update(dt) {
      this.t += dt;
      const sway = Math.sin(this.t * 0.6) * 18;
      for (const f of foes) {
        if (!f.alive) continue;
        diver(f, dt, 120 + sway + f.ox, f.oy);
        f.frame = Math.floor(time * 3 + f.ox + 100) % 2;
      }
      this.diveT -= dt;
      if (this.diveT <= 0 && !P.dead) {
        this.diveT = rand(0.8, 1.8) / lvl();
        const busy = foes.filter(f => f.alive && f.st !== 'form').length;
        if (busy >= 3 + level) return;
        const ready = foes.filter(f => f.alive && f.st === 'form');
        const flags = ready.filter(f => f.flag);
        if (flags.length && Math.random() < 0.3) {
          // A flagship takes up to two red escorts with it.
          const fl = pick(flags);
          startDive(fl);
          ready.filter(f => f.spr === 'galRed').sort((a, b) => Math.abs(a.x - fl.x) - Math.abs(b.x - fl.x)).slice(0, 2).forEach(e => {
            startDive(e); e.side = fl.side; e.sw = fl.sw; e.escortOf = fl;
          });
        } else if (ready.length) {
          const edge = ready.filter(f => !f.flag);
          if (edge.length) startDive(pick(edge));
        }
      }
    },
    onKill(f) { if (f.flag) foes.forEach(o => { if (o.escortOf === f) o.escortOf = null; }); },
    done() { return !foes.some(f => f.alive); }
  },

  /* 4 — Space Warp */
  {
    name: 'SPACE WARP',
    cx: 120, cy: 132,
    init() { this.need = 10 + level * 2; this.killed = 0; this.spawnT = 0.5; },
    onKill() { this.killed++; },
    update(dt) {
      const alive = foes.filter(f => f.alive);
      this.spawnT -= dt;
      if (this.spawnT <= 0 && alive.length < 3 && this.killed + alive.length < this.need) {
        this.spawnT = 1 / lvl();
        foe(pick(['robot', 'gorfship', 'galRed', 'robot']), this.cx, this.cy, 100, { wt: 0, th0: rand(0, Math.PI * 2), dir: Math.random() < 0.5 ? -1 : 1, fireT: 0.7, k: 0.2 });
        sfx.warp();
      }
      for (const f of alive) {
        // Spiral out of the warp, growing as the ship comes closer.
        f.wt += dt * lvl();
        const r = 3 + f.wt * f.wt * 15, th = f.th0 + f.dir * f.wt * 1.8;
        f.x = this.cx + Math.cos(th) * r;
        f.y = this.cy + Math.sin(th) * r * 0.85;
        f.k = Math.min(2, 0.2 + f.wt * 0.5);
        f.pts = f.k < 0.7 ? 300 : f.k < 1.3 ? 200 : 100;
        f.frame = Math.floor(time * 5) % 2;
        f.fireT -= dt;
        if (f.wt > 1.1 && f.fireT <= 0 && !P.dead && f.y < P.y - 30) {
          f.fireT = rand(0.9, 1.4) / lvl();
          aim(f.x, f.y, 110 * lvl(), 'aim');
        }
        if (f.x < -20 || f.x > LW + 20 || f.y < TOP - 20 || f.y > BOT + 20) f.alive = false;
      }
    },
    draw() {
      const cols = [K.red, K.orange, K.yellow, K.green, K.cyan, K.blue];
      ctx.lineWidth = Math.max(1, S * 0.8);
      ctx.globalAlpha = 0.6;
      for (let a = 0; a < 6; a++) {
        ctx.strokeStyle = cols[(a + Math.floor(time * 8)) % cols.length];
        ctx.beginPath();
        for (let j = 0; j <= 46; j++) {
          const r = j * 3.4, th = a * Math.PI / 3 + time * 1.6 - j * 0.11;
          const x = X(this.cx + Math.cos(th) * r), y = Y(this.cy + Math.sin(th) * r * 0.85);
          if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      rect(this.cx - 2, this.cy - 2, 4, 4, Math.floor(time * 12) % 2 ? K.white : K.yellow);
      text(`${Math.max(0, this.need - this.killed)}`, LW - 8, TOP + 4, K.grey, 6, 'right');
    },
    done() { return this.killed >= this.need; }
  },

  /* 5 — Flag Ship */
  {
    name: 'FLAG SHIP',
    // Left half of the mothership, one character per hull plate; mirrored at init.
    // c trim, w bridge windows, d armour panels, y running lights, R reactor.
    // The open column under the reactor is the vent you can thread a shot through.
    hull: [
      '.................cccc',
      '...............cccccc',
      '..............ccwcwcw',
      '.............cccccccc',
      '..........hhhhhhhhhhh',
      '.......hhhhhhhhhhhhhh',
      '.....hhhhyhhhhhhyhhhh',
      '...hhhhhhhhhhhhhhhhhh',
      '..cccccccccccccccccch',
      '.hhhhdddhhhhhhhhhhhRR',
      'hhhhhdydhhhhhhdddhhRR',
      'hhhhhdddhhhhhhdydhhh.',
      'hhhhhhhhhhhhhhdddhhh.',
      '.ccccccccccccccccccc.',
      '..hhhhhhhhhhhhhhhhhh.',
      '...hhhh..hhhhhhhhhhh.',
      '...hhhh....hhhhhhhh..',
      '...dddd.....hhhhhh...',
      '...yyyy......dddd....',
      '..............yy.....'
    ],
    init() {
      this.t = 0; this.fireT = 1.5; this.won = false; this.winT = 0;
      this.cx = 120; this.cy = 74;
      this.blocks = [];
      // The hull is built from half-size plates, each shaded like the sprites.
      const map = this.hull.map(r => r + [...r].reverse().join('')), C2 = 1.5;
      const cols = map[0].length, rows = map.length;
      const color = { h: K.blue, c: '#7fa8ff', w: K.white, d: K.dark, y: K.yellow, R: K.red };
      map.forEach((row, j) => {
        for (let i = 0; i < cols; i++) {
          const ch = row[i];
          if (!color[ch]) continue;
          this.blocks.push({ lx: (i - cols / 2) * C2, ly: (j - rows / 2) * C2, w: C2, h: C2, alive: true, color: 'yw'.includes(ch) ? color[ch] : shadeAt(map, i, j, color[ch]), core: ch === 'R', pts: 10 });
        }
      });
      // A shimmering shield band slung under the hull.
      for (let r = 0; r < 4; r++) {
        for (let i = 0; i < 54; i++) this.blocks.push({ lx: (i - 27) * C2, ly: 20 + r * C2, w: C2, h: C2, alive: true, shield: true, pts: 5 });
      }
    },
    update(dt) {
      if (this.won) {
        this.winT -= dt;
        if (Math.random() < 0.5) boom(this.cx + rand(-34, 34), this.cy + rand(-14, 20), pick([K.white, K.yellow, K.red, K.orange]), Math.random() < 0.2);
        return;
      }
      this.t += dt;
      this.cx = 120 + Math.sin(this.t * 0.5 * lvl()) * 72;
      this.cy = 74 + Math.sin(this.t * 1.2) * 4;
      this.fireT -= dt;
      if (this.fireT <= 0 && !P.dead) {
        this.fireT = rand(0.6, 1.3) / lvl();
        if (Math.random() < 0.5) aim(this.cx + rand(-20, 20), this.cy + 14, 115 * lvl(), 'ball');
        else bomb(this.cx + rand(-28, 28), this.cy + 14, 0, 100 * lvl(), 'ball');
      }
    },
    hit(x, y) {
      let best = null;
      for (const b of this.blocks) {
        if (!b.alive) continue;
        const bx = this.cx + b.lx, by = this.cy + b.ly;
        if (x >= bx - 0.5 && x <= bx + b.w + 0.5 && y >= by && y <= by + b.h + 2 && (!best || b.ly > best.ly)) best = b;
      }
      if (!best) return false;
      best.alive = false;
      if (best.core) { this.win(); return true; }
      // Knock a ragged chunk out around the hit.
      for (const b of this.blocks) {
        if (b.alive && !b.core && b.shield === best.shield && Math.hypot(b.lx - best.lx, b.ly - best.ly) < 2.2 && Math.random() < 0.6) b.alive = false;
      }
      addScore(best.pts);
      sfx.block();
      return true;
    },
    win() {
      this.won = true; this.winT = 2.6;
      addScore(1000);
      pop(this.cx, this.cy, 1000);
      this.blocks.forEach(b => { b.alive = false; });
      for (let i = 0; i < 6; i++) boom(this.cx + rand(-30, 30), this.cy + rand(-10, 10), K.white, true);
      flash = 1.1;
      sfx.big();
      say('Ha ha ha ha!');
    },
    draw() {
      const shieldCols = [K.cyan, K.green, K.yellow, K.red];
      for (const b of this.blocks) {
        if (!b.alive) continue;
        let c = b.color;
        if (b.shield) c = shieldCols[(Math.floor(time * 12) + Math.floor(b.lx / 3)) & 3];
        else if (b.core) c = Math.floor(time * 8) % 2 ? K.red : K.white;
        rect(this.cx + b.lx, this.cy + b.ly, b.w, b.h, c);
      }
    },
    done() { return this.won && this.winT <= 0; }
  }
];

/* ------------------------------------------------------------------ */
/* Flow                                                                */
/* ------------------------------------------------------------------ */
function clearField() {
  foes.length = 0; bombs.length = 0; shot = null;
}
function beginMission() {
  clearField();
  M = MISSIONS[mIdx];
  M.init();
  state = 'intro'; stT = 2.4;
  sfx.start();
  if (promoted) say(`You have been promoted to ${rankSay()}.`);
  else if (mIdx > 0 || level > 0) say(pick(['Prepare yourself for annihilation!', 'My Gorfian robots will destroy you!', `Survival is impossible, ${rankSay()}!`, 'I devour coins!', `Don't get cocky, ${rankSay()}!`]));
}
function startGame() {
  initAudio();
  score = 0; lives = 3; level = 0; mIdx = 0; promoted = false;
  P.x = 120; P.y = 284; P.dead = false; P.inv = 0;
  booms.length = 0; pops.length = 0;
  paused = false;
  sfx.coin();
  beginMission();
  say(`I am Gorf. Prepare yourself, ${rankSay()}!`);
}
function gameOver() {
  state = 'over'; stT = 5;
  clearField();
  try { localStorage.setItem('gorf.classic.hi', hi); } catch (e) { /* storage unavailable */ }
  say('Long live Gorf! Ha ha ha ha!');
}
function toAttract() { state = 'attract'; attractT = 0; clearField(); M = null; }

function update(dt) {
  time += dt;
  for (const s of stars) { s.y += s.sp * dt; if (s.y > BOT) { s.y = TOP; s.x = rand(0, LW); } }
  for (let i = booms.length - 1; i >= 0; i--) if ((booms[i].t += dt) > booms[i].max) booms.splice(i, 1);
  for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].t += dt) > 1) pops.splice(i, 1);
  if (flash > 0) flash -= dt;

  if (state === 'attract') { attractT += dt; return; }
  if (state === 'over') { if ((stT -= dt) <= 0) toAttract(); return; }

  updatePlayer(dt);
  if (state === 'over') return;
  if (state === 'intro') {
    if ((stT -= dt) <= 0) { state = 'play'; promoted = false; }
    return;
  }
  if (state === 'clear') {
    if ((stT -= dt) <= 0) {
      mIdx++;
      if (mIdx >= MISSIONS.length) { mIdx = 0; level++; lives++; promoted = true; }
      beginMission();
    }
    return;
  }
  // play
  updateShot(dt);
  M.update(dt);
  updateBombs(dt);
  if (!P.dead && P.inv <= 0) {
    for (const f of foes) if (f.alive && hits(f, P.x, P.y, -1)) { killFoe(f); killPlayer(); break; }
  }
  for (let i = foes.length - 1; i >= 0; i--) if (!foes[i].alive) foes.splice(i, 1);
  if (M.done() && !P.dead) { state = 'clear'; stT = 2; bombs.length = 0; shot = null; sfx.clear(); }
}

function updatePlayer(dt) {
  if (P.dead) {
    if ((P.deadT -= dt) <= 0) {
      if (lives <= 0) { gameOver(); return; }
      P.dead = false; P.inv = 1.2; P.x = 120; P.y = 284;
      bombs.length = 0;
    }
    return;
  }
  if (P.inv > 0) P.inv -= dt;
  const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  const dy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  P.x = clamp(P.x + dx * 105 * dt, 8, LW - 8);
  P.y = clamp(P.y + dy * 80 * dt, PY_MIN, PY_MAX);
}

function updateShot(dt) {
  if (!shot) return;
  let rem = 340 * dt;
  while (rem > 0 && shot) {
    const s = Math.min(2, rem);
    rem -= s;
    shot.y -= s;
    if (shot.y < TOP) { shot = null; break; }
    const f = foes.find(o => o.alive && hits(o, shot.x, shot.y, 1));
    if (f) { killFoe(f); shot = null; break; }
    if (M.hit && M.hit(shot.x, shot.y)) { shot = null; break; }
  }
}

function updateBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.x += b.vx * dt; b.y += b.vy * dt;
    let gone = b.y > BOT + 4 || b.y < TOP - 4 || b.x < -4 || b.x > LW + 4;
    if (!gone && M.absorb && M.absorb(b)) gone = true;
    if (!gone && !P.dead && P.inv <= 0 && Math.abs(b.x - P.x) < 5 && Math.abs(b.y - P.y) < 5) { gone = true; killPlayer(); }
    if (gone) bombs.splice(i, 1);
  }
}

/* ------------------------------------------------------------------ */
/* Drawing                                                             */
/* ------------------------------------------------------------------ */
function drawStars() {
  for (const s of stars) {
    if (Math.sin(time * 3 + s.ph) < -0.3) continue;
    rect(s.x, s.y, 0.6, 0.6, s.c);
  }
}
function drawBoom(b) {
  const p = b.t / b.max, rays = b.big ? 20 : 12, len = b.big ? 28 : 10;
  const cols = b.big ? [K.white, K.yellow, K.orange, K.red] : [K.white, b.color, tint(b.color, 0.4)];
  if (p < 0.35) {
    const r = (b.big ? 9 : 4) * (1 - p / 0.35);
    const gr = ctx.createRadialGradient(X(b.x), Y(b.y), 0, X(b.x), Y(b.y), r * S);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)');
    gr.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(X(b.x - r), Y(b.y - r), r * 2 * S, r * 2 * S);
  }
  for (let i = 0; i < rays; i++) {
    const a = i / rays * Math.PI * 2 + (b.big ? i * 0.37 : i * 0.2);
    for (let d = 1; d <= 4; d++) {
      const r = len * p * d / 4 * (0.8 + (i % 3) * 0.12);
      const sz = (b.big ? 1.25 : 0.75) * (1 - p * 0.5);
      rect(b.x + Math.cos(a) * r - sz / 2, b.y + Math.sin(a) * r - sz / 2, sz, sz, cols[(d + i + Math.floor(time * 20)) % cols.length]);
    }
  }
}
function drawBomb(b) {
  if (b.kind === 'zig') {
    ctx.fillStyle = K.white;
    for (let j = 0; j < 12; j++) rect(b.x - 0.4 + Math.sin((j + time * 30) * 0.9) * 0.9, b.y - 3 + j * 0.5, 0.75, 0.6);
  } else if (b.kind === 'ball') {
    const r = 1.8 * S, gr = ctx.createRadialGradient(X(b.x - 0.4), Y(b.y - 0.4), 0, X(b.x), Y(b.y), r);
    gr.addColorStop(0, K.white);
    gr.addColorStop(0.4, Math.floor(time * 14) % 2 ? K.yellow : K.orange);
    gr.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), r, 0, Math.PI * 2); ctx.fill();
  } else {
    rect(b.x - 0.4, b.y - 2.5, 0.8, 4, K.yellow);
    rect(b.x - 0.4, b.y - 2.5, 0.8, 1, K.white);
    rect(b.x - 0.4, b.y + 1.5, 0.8, 1, K.red);
  }
}
function drawHud() {
  text('1UP', 8, 3, K.red);
  text(pad(score, 6), 8, 12, K.white);
  text('HIGH SCORE', LW / 2, 3, K.red, 8, 'center');
  text(pad(hi, 6), LW / 2, 12, K.white, 8, 'center');
  text('MISSION', LW - 8, 3, K.red, 8, 'right');
  text(M ? String(mIdx + 1) : '-', LW - 8, 12, K.white, 8, 'right');
  for (let i = 0; i < Math.min(lives - (P.dead || state === 'over' ? 0 : 1), 6); i++) sprite('ship', 10 + i * 12, BOT + 10, 0, 0.8);
  text(rank(), LW - 6, BOT + 6, K.yellow, 7, 'right');
}
function drawAttract() {
  const page = Math.floor(attractT / 11) % 2;
  if (page === 0) {
    const cols = [K.red, K.red, K.orange, K.orange, K.yellow, K.yellow, K.white];
    let x = 120 - (4 * 7 * 6 + 3 * 6) / 2;
    for (const ch of 'GORF') {
      LOGO[ch].forEach((row, j) => {
        for (let i = 0; i < 7; i++) if (row[i] === '#') rect(x + i * 6 + 0.5, 40 + j * 6 + 0.5, 5, 5, cols[(j + Math.floor(time * 6)) % 7]);
      });
      x += 48;
    }
    const eyes = Math.floor(time * 3) % 2 ? K.red : K.yellow;
    sprite('face', 120, 134, 0, 3, false, { r: eyes });
    text('GALACTIC ORBITING', 120, 178, K.cyan, 8, 'center');
    text('ROBOT FORCE', 120, 190, K.cyan, 8, 'center');
    if (Math.floor(time * 2) % 2) text('PUSH START', 120, 222, K.yellow, 10, 'center');
    text('SPACE OR ENTER', 120, 240, K.white, 6, 'center');
    text('ARROWS MOVE  SPACE FIRES', 120, 262, K.grey, 6, 'center');
  } else {
    text('THE MISSIONS', 120, 34, K.red, 10, 'center');
    const rows = [['invB', 'ASTRO BATTLES'], ['laser', 'LASER ATTACK'], ['galFlag', 'GALAXIANS'], ['robot', 'SPACE WARP'], ['gorfship', 'FLAG SHIP']];
    rows.forEach(([s, n], i) => {
      const y = 64 + i * 22;
      sprite(s, 46, y + 3, Math.floor(time * 3) % 2);
      text(`${i + 1} ${n}`, 66, y, i % 2 ? K.cyan : K.yellow);
    });
    text('THE RANKS', 120, 182, K.red, 10, 'center');
    RANKS.forEach((r, i) => text(r, 120, 202 + i * 12, i === Math.floor(time) % 6 ? K.white : K.grey, 8, 'center'));
  }
  text('A TRIBUTE TO GORF  MIDWAY 1981', 120, 286, K.grey, 5, 'center');
  text('ESC  MAIN MENU', 120, 296, K.grey, 5, 'center');
}
function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  // Thin bezel line around the screen when the window is wider or taller.
  ctx.strokeStyle = '#1d3557';
  ctx.lineWidth = Math.max(1, S * 0.5);
  ctx.strokeRect(X(0) - 1, Y(0) - 1, X(LW) - X(0) + 2, Y(LH) - Y(0) + 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(X(0), Y(0), X(LW) - X(0), Y(LH) - Y(0));
  ctx.clip();

  if (flash > 0 && Math.floor(flash * 16) % 2) {
    rect(0, 0, LW, LH, [K.white, K.red, K.yellow, K.blue][Math.floor(flash * 8) % 4]);
  }
  drawStars();
  if (state === 'attract') {
    drawAttract();
    text('HIGH SCORE', LW / 2, 3, K.red, 8, 'center');
    text(pad(hi, 6), LW / 2, 12, K.white, 8, 'center');
  } else {
    if (M && M.draw) M.draw();
    for (const f of foes) if (f.alive) sprite(f.spr, f.x, f.y, f.frame, f.k, f.flip);
    if (!P.dead && state !== 'over' && (P.inv <= 0 || Math.floor(time * 14) % 2)) {
      const fl = 1 + Math.random() * 1.6;
      rect(P.x - 0.9, P.y + 3.6, 1.8, fl, K.orange);
      rect(P.x - 0.4, P.y + 3.6, 0.8, fl * 0.6, K.yellow);
      sprite('ship', P.x, P.y);
    }
    if (shot) {
      ctx.globalAlpha = 0.35;
      rect(shot.x - 1, shot.y - 0.5, 2, 7, K.yellow);
      ctx.globalAlpha = 1;
      rect(shot.x - 0.4, shot.y, 0.8, 6, K.yellow);
      rect(shot.x - 0.4, shot.y, 0.8, 2, K.white);
    }
    bombs.forEach(drawBomb);
    for (const p of pops) text(p.txt, p.x, p.y - 4 - p.t * 8, K.white, 6, 'center');
    if (state === 'intro') {
      if (promoted) {
        text('PROMOTED TO', 120, 120, K.white, 8, 'center');
        text(rank(), 120, 132, K.yellow, 10, 'center');
      }
      text(`MISSION ${mIdx + 1}`, 120, 150, K.red, 8, 'center');
      text(M.name, 120, 162, K.yellow, 10, 'center');
    } else if (state === 'clear') {
      text('MISSION', 120, 150, K.cyan, 8, 'center');
      text('ACCOMPLISHED', 120, 162, K.yellow, 10, 'center');
    } else if (state === 'over') {
      text('GAME OVER', 120, 140, K.red, 12, 'center');
      text('LONG LIVE GORF', 120, 162, K.yellow, 8, 'center');
      text(`RANK  ${rank()}`, 120, 184, K.white, 7, 'center');
    }
    drawHud();
  }
  booms.forEach(drawBoom);
  if (paused) {
    rect(60, 140, 120, 34, '#000');
    text('PAUSED', 120, 146, K.yellow, 10, 'center');
    text('P RESUME  ESC MENU', 120, 162, K.grey, 5, 'center');
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Loop & input                                                        */
/* ------------------------------------------------------------------ */
let last = 0;
function frame(now) {
  if (!active) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) update(dt);
  draw();
  raf = requestAnimationFrame(frame);
}

function pressStart() {
  if (state === 'attract' || (state === 'over' && stT < 3.5)) startGame();
}
function onKey(e) {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'Escape') { exit(); return; }
  if (e.code === 'KeyM') {
    muted = !muted;
    if (muted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    return;
  }
  if (e.code === 'KeyP' && (state === 'play' || state === 'intro' || state === 'clear')) { paused = !paused; return; }
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Digit1' || e.code === 'ControlLeft') {
    if (state === 'attract' || state === 'over') pressStart();
    else fire();
  }
}
function onKeyUp(e) { keys[e.code] = false; }
function onBlur() {
  for (const k in keys) keys[k] = false;
  if (state === 'play' || state === 'intro') paused = true;
}
let drag = null;
function onDown(e) {
  initAudio();
  drag = { x: e.clientX, y: e.clientY };
  cv.setPointerCapture(e.pointerId);
  if (state === 'attract' || state === 'over') pressStart();
  else fire();
}
function onMove(e) {
  if (!drag || P.dead || paused) return;
  const k = (window.devicePixelRatio || 1) / S;
  P.x = clamp(P.x + (e.clientX - drag.x) * k, 8, LW - 8);
  P.y = clamp(P.y + (e.clientY - drag.y) * k, PY_MIN, PY_MAX);
  drag.x = e.clientX; drag.y = e.clientY;
}
function onUp() { drag = null; }

function start(opts) {
  onExit = opts && opts.onExit;
  cv = document.getElementById('classic');
  ctx = cv.getContext('2d');
  cv.classList.remove('hidden');
  active = true;
  resize();
  initAudio();
  toAttract();
  paused = false;
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  if (document.fonts && document.fonts.load) document.fonts.load('10px "Press Start 2P"');
  last = performance.now();
  raf = requestAnimationFrame(frame);
  say('Insert coin. I devour coins!');
}
function exit() {
  active = false;
  cancelAnimationFrame(raf);
  if (state !== 'attract') { try { localStorage.setItem('gorf.classic.hi', hi); } catch (e) { /* storage unavailable */ } }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  for (const k in keys) keys[k] = false;
  window.removeEventListener('resize', resize);
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('blur', onBlur);
  cv.removeEventListener('pointerdown', onDown);
  cv.removeEventListener('pointermove', onMove);
  cv.removeEventListener('pointerup', onUp);
  cv.removeEventListener('pointercancel', onUp);
  cv.classList.add('hidden');
  if (onExit) onExit();
}

window.GorfClassic = {
  start,
  exit,
  // Small hook for automated checks.
  debug: { get state() { return state; }, get mission() { return mIdx; }, get M() { return M; }, get paused() { return paused; }, set paused(v) { paused = v; }, get score() { return score; }, get level() { return level; }, foes, P, keys, startGame, fire, step: n => { for (let i = 0; i < n; i++) update(1 / 60); }, skip: () => { if (!M) return; foes.forEach(f => { f.alive = false; }); if (M.win) M.win(); if (M.need) M.killed = M.need; } }
};
})();
