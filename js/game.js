/* GORF: Reimagined — a 2.5D tribute to the 1981 arcade game.
   Gameplay runs on a flat XY plane; everything is rendered as extruded
   voxel models through a tilted perspective camera. */
(() => {
'use strict';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = arr => arr[(Math.random() * arr.length) | 0];

const W = 14;            // field half-width
const H = 36;            // field height
const PLAYER_TOP = 10;   // the fighter may roam the lower part of the field
const RANKS = ['Space Cadet', 'Space Captain', 'Space Colonel', 'Space General', 'Space Warrior', 'Space Avenger'];
const C = {
  cyan: 0x3fd0ff, amber: 0xffb347, red: 0xff4d5a, green: 0x4be3a0, white: 0xe6eef8,
  blue: 0x2f7fe0, yellow: 0xffe066, steel: 0x8fa3b8, dark: 0x2a3b55, orange: 0xff8a3c
};

/* ------------------------------------------------------------------ */
/* Renderer, camera, backdrop                                          */
/* ------------------------------------------------------------------ */
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040914);
scene.fog = new THREE.Fog(0x040914, 70, 170);
const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);
const camBase = new THREE.Vector3();
const LOOK = new THREE.Vector3(0, H * 0.47, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.72));
const sun = new THREE.DirectionalLight(0xffffff, 0.75);
sun.position.set(-8, -14, 22);
scene.add(sun);
const shotLight = new THREE.PointLight(C.cyan, 0, 16);
scene.add(shotLight);

// Pull the camera back until the whole field fits the viewport.
function fitCamera() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const v = new THREE.Vector3();
  const corners = [[-W - 1, -1], [W + 1, -1], [-W - 1, H + 1], [W + 1, H + 1]];
  for (let k = 0.5; k < 9; k += 0.04) {
    camera.position.set(0, LOOK.y - 21 * k, 34 * k);
    camera.lookAt(LOOK);
    camera.updateMatrixWorld(true);
    let ok = true;
    for (const [x, y] of corners) {
      v.set(x, y, 0).project(camera);
      if (Math.abs(v.x) > 0.96 || v.y > 0.88 || v.y < -0.96) { ok = false; break; }
    }
    if (ok) break;
  }
  camBase.copy(camera.position);
}
window.addEventListener('resize', fitCamera);
fitCamera();

// Starfield
const STAR_N = 700;
const starPos = new Float32Array(STAR_N * 3);
for (let i = 0; i < STAR_N; i++) {
  starPos[i * 3] = rand(-90, 90);
  starPos[i * 3 + 1] = rand(-40, 120);
  starPos[i * 3 + 2] = rand(-60, -8);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbfd8f0, size: 0.35, sizeAttenuation: true, fog: false })));

// Scrolling deck grid under the playfield
const grid = new THREE.GridHelper(200, 100, 0x1d4e89, 0x14345c);
grid.rotation.x = Math.PI / 2;
grid.position.z = -5;
grid.material.transparent = true;
grid.material.opacity = 0.35;
scene.add(grid);

// Field rails
const railMat = new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.35 });
for (const s of [-1, 1]) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, H + 6, 0.08), railMat);
  rail.position.set(s * (W + 0.8), H / 2, 0);
  scene.add(rail);
}

/* ------------------------------------------------------------------ */
/* Voxel sprites                                                       */
/* ------------------------------------------------------------------ */
const boxTpl = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
function voxelGeo(rows, pal, depth) {
  const pos = [], nor = [], col = [];
  const tp = boxTpl.attributes.position.array, tn = boxTpl.attributes.normal.array;
  const h = rows.length, w = rows[0].length, c = new THREE.Color();
  rows.forEach((row, j) => {
    for (let i = 0; i < w; i++) {
      const ch = row[i];
      if (!pal[ch]) continue;
      c.set(pal[ch]);
      const ox = i - (w - 1) / 2, oy = (h - 1) / 2 - j;
      for (let k = 0; k < tp.length; k += 3) {
        pos.push(tp[k] + ox, tp[k + 1] + oy, tp[k + 2] * depth);
        nor.push(tn[k], tn[k + 1], tn[k + 2]);
        col.push(c.r, c.g, c.b);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

const GAL = [
  '....a....',
  '...aaa...',
  'a..aaa..a',
  'aa.aba.aa',
  'aaaabaaaa',
  'a.aaaaa.a',
  '...a.a...',
  '..a...a..'
];
const SPR = {
  ship: { pal: { w: C.white, c: C.cyan, b: C.blue, r: C.amber }, frames: [[
    '.....w.....',
    '.....w.....',
    '....wcw....',
    '....wcw....',
    '...wwcww...',
    '.b.wwwww.b.',
    '.bwwwwwwwb.',
    'bbww.r.wwbb',
    'b..r...r..b'
  ]] },
  crab: { pal: { a: C.green, e: C.white }, frames: [[
    '..a.....a..',
    '...a...a...',
    '..aaaaaaa..',
    '.aaeaaaeaa.',
    'aaaaaaaaaaa',
    'a.aaaaaaa.a',
    'a.a.....a.a',
    '...aa.aa...'
  ], [
    '..a.....a..',
    'a..a...a..a',
    'a.aaaaaaa.a',
    'aaaeaaaeaaa',
    'aaaaaaaaaaa',
    '.aaaaaaaaa.',
    '..a.....a..',
    '.a.......a.'
  ]] },
  squid: { pal: { a: C.cyan, e: C.dark }, frames: [[
    '...aa...',
    '..aaaa..',
    '.aaaaaa.',
    'aaeaaeaa',
    'aaaaaaaa',
    '..a..a..',
    '.a.aa.a.',
    'a.a..a.a'
  ], [
    '...aa...',
    '..aaaa..',
    '.aaaaaa.',
    'aaeaaeaa',
    'aaaaaaaa',
    '.a.aa.a.',
    'a......a',
    '.a....a.'
  ]] },
  gorf: { pal: { g: C.amber, r: C.red, d: C.dark }, frames: [[
    '..ggggg..',
    '.ggggggg.',
    'ggrgggrgg',
    'ggggggggg',
    'ggdddddgg',
    '.ggggggg.',
    '..g.g.g..',
    '.gg...gg.'
  ]] },
  laser: { pal: { c: C.steel, y: C.yellow, r: C.red }, frames: [[
    '..ccccc..',
    '.ccccccc.',
    'ccyccccyc',
    'ccccccccc',
    '.cc.r.cc.',
    '....r....',
    '....r....'
  ]] },
  galBlue: { pal: { a: C.blue, b: C.yellow }, frames: [GAL] },
  galRed: { pal: { a: C.red, b: C.yellow }, frames: [GAL] },
  galFlag: { pal: { a: C.yellow, b: C.red }, frames: [GAL] },
  saucer: { pal: { s: C.steel, y: C.amber }, frames: [[
    '....ssss....',
    '..ssssssss..',
    'sysssyysssys',
    '..sss..sss..',
    '...s....s...'
  ]] }
};
for (const k in SPR) {
  const s = SPR[k];
  s.geo = s.frames.map(f => voxelGeo(f, s.pal, 2.2));
  s.w = s.frames[0][0].length;
  s.h = s.frames[0].length;
  s.color = s.pal[Object.keys(s.pal)[0]];
}
const voxMat = new THREE.MeshLambertMaterial({ vertexColors: true });

const basicMats = {};
function basicMat(color, opacity) {
  const key = color + ':' + (opacity || 1);
  if (!basicMats[key]) {
    basicMats[key] = new THREE.MeshBasicMaterial({ color, transparent: opacity != null && opacity < 1, opacity: opacity == null ? 1 : opacity });
  }
  return basicMats[key];
}
const unitBox = new THREE.BoxGeometry(1, 1, 1);

/* ------------------------------------------------------------------ */
/* Audio & speech                                                      */
/* ------------------------------------------------------------------ */
let ac = null, muted = false, noiseBuf = null;
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
  g.gain.setValueAtTime(vol || 0.1, t);
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
  f.frequency.setValueAtTime(cutoff || 1600, t);
  f.frequency.exponentialRampToValueAtTime(80, t + dur);
  g.gain.setValueAtTime(vol || 0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(ac.destination);
  src.start(t); src.stop(t + dur + 0.02);
}
let marchI = 0;
const sfx = {
  shoot: () => tone(980, 0.16, 'square', 0.06, 220),
  boom: () => noise(0.3, 0.22, 1800),
  bigBoom: () => { noise(1.4, 0.5, 900); tone(160, 1.2, 'sawtooth', 0.12, 30); },
  die: () => { noise(0.9, 0.4, 1000); tone(420, 0.9, 'sawtooth', 0.09, 40); },
  march: () => tone([110, 98, 87, 82][marchI++ % 4], 0.09, 'square', 0.08),
  dive: () => tone(1300, 0.55, 'sawtooth', 0.035, 320),
  charge: () => tone(180, 0.7, 'sawtooth', 0.05, 1300),
  beam: () => tone(150, 0.55, 'sawtooth', 0.13, 80),
  hit: () => tone(320, 0.06, 'square', 0.06, 160),
  clear: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.07, null, i * 0.11))
};

let subT = 0;
function say(text) {
  $('subtitle').textContent = 'Gorf: ' + text;
  $('subtitle').classList.remove('hidden');
  subT = 3.2;
  if (muted || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.1; u.rate = 0.82; u.volume = 0.9;
    window.speechSynthesis.speak(u);
  } catch (e) { /* speech is optional */ }
}
const rankName = () => RANKS[Math.min(level, RANKS.length - 1)];
const deathTaunts = () => [
  `Bad move, ${rankName()}!`,
  `Got you, ${rankName()}!`,
  'Long live Gorf!',
  `Too bad, ${rankName()}!`,
  'Another enemy ship destroyed. Ha ha ha!'
];
const missionTaunts = () => [
  'My Gorfian robots are unbeatable!',
  `Survival is impossible, ${rankName()}!`,
  'Prepare yourself for annihilation!',
  'You will meet a Gorfian doom!',
  `Try again, I devour coins, ${rankName()}!`
];

/* ------------------------------------------------------------------ */
/* Game state                                                          */
/* ------------------------------------------------------------------ */
let state = 'menu';       // menu | intro | play | clear | gameover
let paused = false;
let stateT = 0, time = 0, shake = 0;
let score = 0, lives = 3, level = 0, missionIdx = 0, mission = null;
let hi = 0;
try { hi = +localStorage.getItem('gorf.hi') || 0; } catch (e) { /* storage unavailable */ }

const enemies = [];      // { mesh, x, y, hw, hh, alive, pts, ... }
const bullets = [];      // enemy fire
const blocks = [];       // cells that stop the player's shot (flagship hull, force field)
const shieldCells = [];  // cells that stop enemy fire (mission 1 shield)
const parts = [];        // explosion debris
const extras = [];       // per-mission scenery to dispose
let shot = null;         // the single quark laser bolt

const lvl = () => 1 + level * 0.18;

/* ------------------------------------------------------------------ */
/* Player                                                              */
/* ------------------------------------------------------------------ */
const player = { x: 0, y: 3, hw: 0.7, hh: 0.6, dead: false, inv: 0, respawnT: 0, bank: 0, mesh: new THREE.Group() };
{
  const hull = new THREE.Mesh(SPR.ship.geo[0], voxMat);
  hull.scale.setScalar(0.2);
  player.mesh.add(hull);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1, 8), basicMat(C.amber, 0.85));
  flame.rotation.z = Math.PI;
  flame.position.y = -1.3;
  player.mesh.add(flame);
  player.flame = flame;
  player.mesh.visible = false;
  scene.add(player.mesh);
}
const shotMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 0.16), basicMat(C.cyan));
shotMesh.visible = false;
scene.add(shotMesh);

const keys = {};
function fire() {
  if (paused || player.dead || (state !== 'play' && state !== 'intro')) return;
  // Quark laser: only one bolt exists; firing again recalls it.
  shot = { x: player.x, y: player.y + 1.2 };
  shotMesh.visible = true;
  shieldFlick = 0.18;
  sfx.shoot();
}
function killShot() {
  shot = null;
  shotMesh.visible = false;
  shotLight.intensity = 0;
}

function updatePlayer(dt) {
  if (player.dead) {
    player.respawnT -= dt;
    if (player.respawnT <= 0) {
      if (lives <= 0) { gameOver(); return; }
      clearBullets();
      player.dead = false; player.inv = 2.4;
      player.x = 0; player.y = 3;
    }
    return;
  }
  const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  const dy = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0);
  player.x = clamp(player.x + dx * 17 * dt, -W + 1.1, W - 1.1);
  player.y = clamp(player.y + dy * 13 * dt, 1.2, PLAYER_TOP);
  player.bank += (dx * 0.5 - player.bank) * Math.min(1, dt * 10);
  if (player.inv > 0) player.inv -= dt;
  player.mesh.visible = player.inv <= 0 || Math.floor(time * 14) % 2 === 0;
  player.mesh.position.set(player.x, player.y, 0);
  player.mesh.rotation.y = player.bank;
  player.flame.scale.y = 0.7 + Math.random() * 0.7;
}

function killPlayer(force) {
  if (player.dead || state !== 'play' || (player.inv > 0 && !force)) return;
  player.dead = true;
  player.mesh.visible = false;
  player.respawnT = 1.9;
  burst(player.x, player.y, C.white, 26, 13, 0.3);
  burst(player.x, player.y, C.amber, 18, 9, 0.25);
  sfx.die();
  shake = 0.9;
  lives--;
  if (shot) killShot();
  say(pick(deathTaunts()));
  syncHud();
}

const hitsPlayer = (x, y, hw, hh) =>
  !player.dead && Math.abs(x - player.x) < hw + player.hw && Math.abs(y - player.y) < hh + player.hh;

/* ------------------------------------------------------------------ */
/* Shots, bullets, debris                                              */
/* ------------------------------------------------------------------ */
function updateShot(dt) {
  if (!shot) return;
  let rem = 46 * dt;
  while (rem > 0 && shot) {
    const s = Math.min(0.3, rem);
    rem -= s;
    shot.y += s;
    if (shot.y > H + 2 || shotHit()) killShot();
  }
  if (shot) {
    shotMesh.position.set(shot.x, shot.y, 0);
    shotLight.position.set(shot.x, shot.y, 1.5);
    shotLight.intensity = 1.6;
  }
}

function shotHit() {
  for (const e of enemies) {
    if (e.alive && Math.abs(e.x - shot.x) < e.hw + 0.1 && Math.abs(e.y - shot.y) < e.hh + 0.5) {
      killEnemy(e);
      return true;
    }
  }
  let best = null;
  for (const b of blocks) {
    if (b.alive && Math.abs(b.x - shot.x) <= b.h && Math.abs(b.y - shot.y) < b.h + 0.4 && (!best || b.y < best.y)) best = b;
  }
  if (best) {
    best.alive = false;
    best.mesh.visible = false;
    burst(best.x, best.y, best.color, 5, 6, 0.2);
    best.onHit(best);
    return true;
  }
  return false;
}

const bulletGeo = new THREE.OctahedronGeometry(0.32);
function mkBullet(x, y, vx, vy, color) {
  const mesh = new THREE.Mesh(bulletGeo, basicMat(color || C.amber));
  mesh.position.set(x, y, 0);
  scene.add(mesh);
  bullets.push({ mesh, x, y, vx, vy, dead: false });
}
function aimBullet(x, y, speed, color) {
  const dx = player.x - x, dy = player.y - y, d = Math.hypot(dx, dy) || 1;
  mkBullet(x, y, dx / d * speed, dy / d * speed, color);
}
function clearBullets() {
  bullets.forEach(b => scene.remove(b.mesh));
  bullets.length = 0;
}
function updateBullets(dt) {
  for (const b of bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.mesh.position.set(b.x, b.y, 0);
    b.mesh.rotation.z += dt * 9; b.mesh.rotation.x += dt * 5;
    if (b.y < -2 || b.y > H + 4 || Math.abs(b.x) > W + 4) { b.dead = true; continue; }
    for (const s of shieldCells) {
      if (s.alive && Math.abs(s.x - b.x) < s.hw + 0.15 && Math.abs(s.y - b.y) < s.hh + 0.25) {
        s.alive = false; s.mesh.visible = false; b.dead = true;
        burst(s.x, s.y, C.cyan, 3, 4, 0.15);
        break;
      }
    }
    if (!b.dead && hitsPlayer(b.x, b.y, 0.15, 0.2) && player.inv <= 0) { b.dead = true; killPlayer(); }
  }
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].dead) { scene.remove(bullets[i].mesh); bullets.splice(i, 1); }
  }
}

function burst(x, y, color, n, speed, size) {
  for (let i = 0; i < n && parts.length < 600; i++) {
    const m = new THREE.Mesh(unitBox, basicMat(color));
    const a = Math.random() * Math.PI * 2, sp = speed * rand(0.3, 1);
    const life = rand(0.4, 0.9);
    scene.add(m);
    parts.push({ m, x, y, z: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(-2, 9), life, max: life, size: size * rand(0.6, 1.3) });
  }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { scene.remove(p.m); parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.m.position.set(p.x, p.y, p.z);
    p.m.rotation.x += dt * 7; p.m.rotation.y += dt * 5;
    p.m.scale.setScalar(p.size * (p.life / p.max));
  }
}

/* ------------------------------------------------------------------ */
/* Enemies                                                             */
/* ------------------------------------------------------------------ */
function mkEnemy(spr, x, y, pts, px) {
  const s = SPR[spr];
  px = px || 0.2;
  const mesh = new THREE.Mesh(s.geo[0], voxMat);
  mesh.scale.setScalar(px);
  mesh.position.set(x, y, 0);
  scene.add(mesh);
  const e = { mesh, spr: s, x, y, hw: s.w * px / 2, hh: s.h * px / 2, alive: true, pts, color: s.color, state: 'form', seed: Math.random() * 6, frame: 0 };
  enemies.push(e);
  return e;
}
function removeEnemy(e) {
  e.alive = false;
  scene.remove(e.mesh);
}
function killEnemy(e) {
  removeEnemy(e);
  burst(e.x, e.y, e.color, 14, 10, 0.26);
  addScore(e.pts * (e.state === 'dive' ? 2 : 1));
  sfx.boom();
  shake = Math.max(shake, 0.2);
  if (mission.onKill) mission.onKill(e);
}
function addScore(n) {
  score += n;
  if (score > hi) hi = score;
  syncHud();
}

function startDive(e) {
  e.state = 'dive'; e.dt = 0;
  e.sx = e.x; e.sy = e.y; e.tx = player.x;
  e.swing = (Math.random() < 0.5 ? -1 : 1) * rand(2, 5);
  e.fireT = rand(0.4, 0.9);
  sfx.dive();
}
// Shared behaviour for enemies that peel off a formation, swoop, and return.
function updateDiver(e, dt, slotX, slotY) {
  if (e.state === 'form') {
    e.x = slotX; e.y = slotY;
    e.mesh.rotation.z = 0;
  } else if (e.state === 'dive') {
    e.dt += dt;
    e.y -= 10.5 * lvl() * dt;
    const p = clamp((e.sy - e.y) / (e.sy - 4), 0, 1);
    e.x = clamp(e.sx + (e.tx - e.sx) * p + Math.sin(e.dt * 3.2) * e.swing * (1 - p * 0.5), -W + 1, W - 1);
    e.mesh.rotation.z = Math.PI * Math.min(1, e.dt * 2) + Math.sin(e.dt * 3.2) * 0.5;
    e.fireT -= dt;
    if (e.fireT <= 0 && e.y > 13 && !player.dead) {
      e.fireT = 0.75 / lvl() + Math.random() * 0.4;
      mkBullet(e.x, e.y - 0.8, clamp((player.x - e.x) * 0.5, -5, 5), -14 * lvl(), C.amber);
    }
    if (e.y < -2) { e.y = H + 3; e.x = slotX; e.state = 'return'; }
  } else {
    e.mesh.rotation.z = 0;
    e.x += (slotX - e.x) * Math.min(1, dt * 5);
    e.y -= 10 * dt;
    if (e.y <= slotY) { e.y = slotY; e.state = 'form'; }
  }
}
function tryDive(list, diveMax) {
  const diving = list.filter(e => e.alive && e.state !== 'form').length;
  const ready = list.filter(e => e.alive && e.state === 'form' && e.role !== 'laser');
  if (ready.length && diving < diveMax && !player.dead) startDive(pick(ready));
}

/* ------------------------------------------------------------------ */
/* Missions                                                            */
/* ------------------------------------------------------------------ */
let shieldFlick = 0;
function addExtra(obj) { scene.add(obj); extras.push(obj); return obj; }

const MISSIONS = [

  /* 1 — Astro Battles: a marching invader block and a force-field dome. */
  {
    name: 'Astro Battles',
    init() {
      this.dir = 1; this.stepT = 0.6; this.bombT = 1.6; this.ufoT = 8; this.ufo = null;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 8; c++) mkEnemy(r === 0 ? 'squid' : 'crab', (c - 3.5) * 2.7, 30.5 - r * 2.5, (3 - r) * 10);
      }
      this.shieldMat = new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.55 });
      for (let row = 0; row < 2; row++) {
        for (let i = -14; i <= 14; i++) {
          const x = i * 0.8, y = 13.6 - 0.014 * x * x + row * 0.45;
          const mesh = new THREE.Mesh(unitBox, this.shieldMat);
          mesh.scale.set(0.74, 0.38, 0.5);
          mesh.position.set(x, y, 0);
          scene.add(mesh);
          shieldCells.push({ mesh, x, y, hw: 0.4, hh: 0.22, alive: true });
        }
      }
    },
    update(dt) {
      // The dome opens briefly to let the quark laser through.
      this.shieldMat.opacity = shieldFlick > 0 ? 0.15 : 0.5 + Math.sin(time * 6) * 0.08;
      const inv = enemies.filter(e => e.alive && !e.bonus);
      this.stepT -= dt;
      if (this.stepT <= 0 && inv.length) {
        this.stepT = (0.05 + 0.5 * inv.length / 24) / lvl();
        const edge = inv.some(e => Math.abs(e.x + this.dir * 0.5) > W - 1.4);
        if (edge) { this.dir *= -1; inv.forEach(e => { e.y -= 1; }); }
        else inv.forEach(e => { e.x += this.dir * 0.5; });
        inv.forEach(e => { e.frame ^= 1; e.mesh.geometry = e.spr.geo[e.frame]; });
        sfx.march();
        if (inv.some(e => e.y < 15.5)) { killPlayer(true); inv.forEach(e => { e.y += 9; }); }
      }
      this.bombT -= dt;
      if (this.bombT <= 0 && inv.length) {
        this.bombT = rand(0.45, 1.3) / lvl();
        const col = pick(inv);
        const low = inv.filter(e => Math.abs(e.x - col.x) < 0.1).reduce((a, b) => (b.y < a.y ? b : a));
        mkBullet(low.x, low.y - 1, 0, -13 * lvl(), C.amber);
      }
      this.ufoT -= dt;
      if (!this.ufo && this.ufoT <= 0) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        this.ufo = mkEnemy('gorf', -dir * (W + 2), 34, 300);
        this.ufo.bonus = true; this.ufo.vx = dir * 7;
      }
      if (this.ufo) {
        this.ufo.x += this.ufo.vx * dt;
        if (!this.ufo.alive || Math.abs(this.ufo.x) > W + 3) {
          if (this.ufo.alive) removeEnemy(this.ufo);
          this.ufo = null; this.ufoT = rand(9, 15);
        }
      }
    },
    done() { return !enemies.some(e => e.alive && !e.bonus); }
  },

  /* 2 — Laser Attack: two squads, each guarding a laser ship. */
  {
    name: 'Laser Attack',
    init() {
      this.t = 0; this.diveT = 1.8;
      this.squads = [-1, 1].map(s => {
        const sq = { base: s * 7, phase: s * 1.3, cx: s * 7, cy: 28, laserT: rand(2, 4), mode: 0, modeT: 0, members: [] };
        const add = (spr, ox, oy, pts, role) => {
          const e = mkEnemy(spr, sq.cx + ox, sq.cy + oy, pts);
          e.ox = ox; e.oy = oy; e.role = role;
          sq.members.push(e);
          return e;
        };
        sq.laser = add('laser', 0, 0, 100, 'laser');
        add('galRed', -2.9, 0, 50);
        add('galRed', 2.9, 0, 50);
        add('galBlue', -1.5, 2.5, 50);
        add('gorf', 1.5, 2.5, 150);
        sq.beam = addExtra(new THREE.Mesh(unitBox, basicMat(C.amber, 0.7)));
        sq.beam.visible = false;
        return sq;
      });
    },
    update(dt) {
      this.t += dt;
      for (const sq of this.squads) {
        sq.cx = sq.base + Math.sin(this.t * 0.7 * lvl() + sq.phase) * 3.3;
        sq.cy = 28 + Math.sin(this.t * 0.9 + sq.phase) * 1.2;
        for (const e of sq.members) if (e.alive) updateDiver(e, dt, sq.cx + e.ox, sq.cy + e.oy);
        const L = sq.laser;
        if (!L.alive) { sq.beam.visible = false; continue; }
        if (sq.mode === 0) {
          sq.laserT -= dt;
          if (sq.laserT <= 0) { sq.mode = 1; sq.modeT = 0.75; sfx.charge(); }
        } else if (sq.mode === 1) {
          sq.modeT -= dt;
          if (sq.modeT <= 0) { sq.mode = 2; sq.modeT = 0.55; sfx.beam(); shake = Math.max(shake, 0.25); }
        } else {
          sq.modeT -= dt;
          if (Math.abs(player.x - L.x) < 0.4 + player.hw) killPlayer();
          if (sq.modeT <= 0) { sq.mode = 0; sq.laserT = rand(2.2, 4.6) / lvl(); }
        }
        sq.beam.visible = sq.mode > 0;
        if (sq.mode > 0) {
          const top = L.y - 0.8, bottom = -3;
          const w = sq.mode === 1 ? 0.07 : 0.6 + Math.random() * 0.3;
          sq.beam.material = sq.mode === 1 ? basicMat(C.amber, 0.7) : basicMat(C.red, 0.9);
          sq.beam.scale.set(w, top - bottom, 0.25);
          sq.beam.position.set(L.x, (top + bottom) / 2, 0);
        }
      }
      this.diveT -= dt;
      if (this.diveT <= 0) {
        this.diveT = rand(1.2, 2.4) / lvl();
        tryDive(enemies, Math.min(2 + level, 5));
      }
    },
    done() { return !enemies.some(e => e.alive); }
  },

  /* 3 — Galaxians: a swaying convoy that peels off to dive-bomb. */
  {
    name: 'Galaxians',
    init() {
      this.t = 0; this.diveT = 2;
      const add = (spr, c, r, pts) => {
        const e = mkEnemy(spr, (c - 3.5) * 2.5, 31.5 - r * 2.2, pts);
        e.ox = (c - 3.5) * 2.5; e.oy = 31.5 - r * 2.2;
      };
      add('galFlag', 2, 0, 150); add('galFlag', 5, 0, 150);
      for (let c = 1; c <= 6; c++) add('galRed', c, 1, 50);
      for (let r = 2; r <= 3; r++) for (let c = 0; c < 8; c++) add('galBlue', c, r, 30);
    },
    update(dt) {
      this.t += dt;
      const sway = Math.sin(this.t * 0.8) * 2.6;
      for (const e of enemies) if (e.alive) updateDiver(e, dt, sway + e.ox, e.oy);
      this.diveT -= dt;
      if (this.diveT <= 0) {
        this.diveT = rand(0.8, 1.9) / lvl();
        tryDive(enemies, Math.min(3 + level, 6));
      }
    },
    done() { return !enemies.some(e => e.alive); }
  },

  /* 4 — Space Warp: enemies spiral out of a tunnel, growing as they come. */
  {
    name: 'Space Warp',
    cx: 0, cy: 23,
    init() {
      this.need = 9 + level * 2; this.killed = 0; this.spawnT = 0.4;
      const g = addExtra(new THREE.Group());
      g.position.set(this.cx, this.cy, -1.5);
      const lineMat = new THREE.LineBasicMaterial({ color: C.blue, transparent: true, opacity: 0.5 });
      const pts = [];
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.9, 0));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(pts);
      this.rings = [];
      for (let i = 0; i < 9; i++) {
        const r = new THREE.LineLoop(ringGeo, lineMat);
        g.add(r);
        this.rings.push(r);
      }
      const spokes = [];
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2;
        spokes.push(new THREE.Vector3(Math.cos(a) * 0.6, Math.sin(a) * 0.54, 0), new THREE.Vector3(Math.cos(a) * 30, Math.sin(a) * 27, 0));
      }
      this.spokes = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(spokes), lineMat);
      g.add(this.spokes);
    },
    onKill() { this.killed++; },
    update(dt) {
      this.rings.forEach((r, i) => {
        const s = (time * 0.3 + i / this.rings.length) % 1;
        r.scale.setScalar(0.5 + s * s * 28);
      });
      this.spokes.rotation.z += dt * 0.25;
      const alive = enemies.filter(e => e.alive);
      this.spawnT -= dt;
      if (this.spawnT <= 0 && alive.length < 3 && this.killed + alive.length < this.need) {
        this.spawnT = 1.1 / lvl();
        const e = mkEnemy(pick(['galRed', 'gorf', 'saucer', 'galBlue']), this.cx, this.cy, 100, 0.04);
        e.wt = 0; e.th0 = rand(0, Math.PI * 2); e.dir = Math.random() < 0.5 ? -1 : 1; e.fireT = 0.6;
      }
      for (const e of alive) {
        e.wt += dt * lvl();
        const r = 0.6 + e.wt * e.wt * 1.1, th = e.th0 + e.dir * e.wt * 1.7;
        e.x = this.cx + Math.cos(th) * r;
        e.y = this.cy + Math.sin(th) * r * 0.9;
        const px = Math.min(0.25, 0.04 + e.wt * 0.055);
        e.mesh.scale.setScalar(px);
        e.hw = e.spr.w * px / 2; e.hh = e.spr.h * px / 2;
        e.mesh.rotation.z = e.dir * e.wt * 1.2;
        e.fireT -= dt;
        if (e.wt > 1.3 && e.fireT <= 0 && !player.dead && e.y > player.y + 4) {
          e.fireT = 1.2 / lvl();
          aimBullet(e.x, e.y, 12 * lvl(), C.orange);
        }
        if (r > 26) removeEnemy(e);
      }
    },
    done() { return this.killed >= this.need; }
  },

  /* 5 — Flag Ship: chip through the hull or thread the vent to the reactor. */
  {
    name: 'Flag Ship',
    hull: [
      '........hhhhh........',
      '.....hhhhhhhhhhh.....',
      '..hhhhyyhhhhhyyhhhh..',
      'hhhhhhhhhhhhhhhhhhhhh',
      'hhddhhhhhhRhhhhhhddhh',
      '.hhhhhhhhh.hhhhhhhhh.',
      '..hhhhhhhh.hhhhhhhh..',
      '....hhhhhh.hhhhhh....',
      '......hhh...hhh......'
    ],
    init() {
      this.t = 0; this.fireT = 1.6; this.won = false;
      this.group = addExtra(new THREE.Group());
      this.cells = [];
      const S = 0.6, cols = this.hull[0].length, rows = this.hull.length;
      const colors = { h: 0x4f6885, d: 0x22324a, y: 0xd9a520, R: 0xc81e2e };
      const mats = {};
      for (const k in colors) mats[k] = new THREE.MeshLambertMaterial({ color: colors[k] });
      this.coreMat = mats.R;
      const cellGeo = new THREE.BoxGeometry(S * 0.96, S * 0.96, 1.1);
      this.hull.forEach((row, j) => {
        for (let i = 0; i < cols; i++) {
          const ch = row[i];
          if (!colors[ch]) continue;
          const mesh = new THREE.Mesh(cellGeo, mats[ch]);
          const lx = (i - (cols - 1) / 2) * S, ly = ((rows - 1) / 2 - j) * S;
          mesh.position.set(lx, ly, 0);
          this.group.add(mesh);
          const b = { mesh, lx, ly, x: lx, y: 29 + ly, h: S / 2, alive: true, color: colors[ch],
            onHit: ch === 'R' ? () => this.win() : () => { addScore(20); sfx.hit(); } };
          this.cells.push(b);
          blocks.push(b);
        }
      });
      const fieldMat = basicMat(C.cyan, 0.5);
      for (let row = 0; row < 2; row++) {
        for (let i = -13; i <= 13; i++) {
          const x = i * 0.8, y = 19 + 0.016 * x * x + row * 0.8;
          const mesh = addExtra(new THREE.Mesh(unitBox, fieldMat));
          mesh.scale.set(0.74, 0.74, 0.5);
          mesh.position.set(x, y, 0);
          blocks.push({ mesh, x, y, h: 0.4, alive: true, color: C.cyan, onHit: () => { addScore(5); sfx.hit(); } });
        }
      }
    },
    update(dt) {
      if (this.won) return;
      this.t += dt;
      const fx = Math.sin(this.t * 0.55 * lvl()) * 7, fy = 29 + Math.sin(this.t * 1.1) * 0.8;
      this.group.position.set(fx, fy, 0);
      this.coreMat.emissive.setScalar(0.25 + Math.sin(time * 8) * 0.25);
      for (const c of this.cells) { c.x = fx + c.lx; c.y = fy + c.ly; }
      this.fireT -= dt;
      if (this.fireT <= 0 && !player.dead) {
        this.fireT = rand(0.9, 1.6) / lvl();
        aimBullet(fx + rand(-3, 3), fy - 3, 12 * lvl(), C.orange);
      }
    },
    win() {
      this.won = true;
      for (const c of this.cells) {
        if (c.alive) { c.alive = false; c.mesh.visible = false; burst(c.x, c.y, c.color, 3, 16, 0.4); }
      }
      burst(this.group.position.x, this.group.position.y, C.amber, 60, 20, 0.5);
      addScore(1000);
      sfx.bigBoom();
      shake = 1.6;
    },
    done() { return this.won; }
  }
];

/* ------------------------------------------------------------------ */
/* Flow                                                                */
/* ------------------------------------------------------------------ */
function cleanupMission() {
  enemies.forEach(e => scene.remove(e.mesh));
  enemies.length = 0;
  clearBullets();
  blocks.forEach(b => b.mesh.parent && b.mesh.parent.remove(b.mesh));
  blocks.length = 0;
  shieldCells.forEach(s => scene.remove(s.mesh));
  shieldCells.length = 0;
  extras.forEach(o => scene.remove(o));
  extras.length = 0;
  if (shot) killShot();
}

let bannerT = 0;
function banner(title, sub, dur) {
  $('bannerTitle').textContent = title;
  $('bannerSub').textContent = sub;
  $('banner').classList.remove('hidden');
  bannerT = dur;
}

function beginMission() {
  cleanupMission();
  mission = MISSIONS[missionIdx];
  mission.init();
  state = 'intro'; stateT = 2.4;
  banner('Mission ' + (missionIdx + 1), mission.name, 2.4);
  if (missionIdx > 0 || level > 0) say(pick(missionTaunts()));
  syncHud();
}

function nextMission() {
  missionIdx++;
  if (missionIdx >= MISSIONS.length) {
    missionIdx = 0;
    level++;
    lives++;
    beginMission();
    banner('Promoted · bonus ship', rankName(), 2.4);
    say(`You have been promoted to ${rankName()}. Some galactic defender you are!`);
    return;
  }
  beginMission();
}

function startGame() {
  initAudio();
  score = 0; lives = 3; level = 0; missionIdx = 0;
  player.dead = false; player.inv = 2; player.x = 0; player.y = 3;
  player.mesh.visible = true;
  paused = false;
  showModal(null);
  $('hud').classList.remove('hidden');
  beginMission();
  say('I am the Gorfian Empire. Prepare yourself, Space Cadet!');
}

function gameOver() {
  state = 'gameover';
  try { localStorage.setItem('gorf.hi', hi); } catch (e) { /* storage unavailable */ }
  $('overScore').textContent = score.toLocaleString();
  $('overHi').textContent = hi.toLocaleString();
  $('overRank').textContent = rankName();
  showModal('modalOver');
}

function quitToTitle() {
  cleanupMission();
  paused = false;
  state = 'menu';
  player.mesh.visible = false;
  $('hud').classList.add('hidden');
  $('banner').classList.add('hidden');
  showModal('modalMode');
}

function setPaused(p) {
  if (state === 'menu' || state === 'gameover') return;
  paused = p;
  showModal(p ? 'modalPause' : null);
}

let currentModal = null;
function showModal(id) {
  currentModal = id;
  for (const m of ['modalMode', 'modalStart', 'modalPause', 'modalOver']) $(m).classList.toggle('hidden', m !== id);
  $('overlay').classList.toggle('hidden', !id);
  if (id) { const b = $(id).querySelector('.btn'); if (b) b.focus(); }
}

function syncHud() {
  $('hudScore').textContent = score.toLocaleString();
  $('hudHi').textContent = hi.toLocaleString();
  $('hudMissionNo').textContent = 'Mission ' + (missionIdx + 1);
  $('hudMission').textContent = mission ? mission.name : '';
  $('hudRank').textContent = rankName();
  $('hudLives').textContent = Math.max(lives, 0);
}

/* ------------------------------------------------------------------ */
/* Main loop                                                           */
/* ------------------------------------------------------------------ */
function update(dt) {
  time += dt;
  // backdrop
  const sp = starGeo.attributes.position;
  for (let i = 0; i < STAR_N; i++) {
    let y = sp.array[i * 3 + 1] - dt * (4 + (i % 5) * 2.5);
    if (y < -40) y += 160;
    sp.array[i * 3 + 1] = y;
  }
  sp.needsUpdate = true;
  grid.position.y = 30 - (time * 5) % 2;

  if (bannerT > 0 && (bannerT -= dt) <= 0) $('banner').classList.add('hidden');
  if (subT > 0 && (subT -= dt) <= 0) $('subtitle').classList.add('hidden');
  if (shieldFlick > 0) shieldFlick -= dt;
  if (shake > 0) shake = Math.max(0, shake - dt * 2.2);
  updateParts(dt);
  if (state === 'menu' || state === 'gameover') return;

  updatePlayer(dt);
  if (state === 'gameover' || state === 'menu') return;
  updateShot(dt);

  if (state === 'intro') {
    if ((stateT -= dt) <= 0) state = 'play';
  } else if (state === 'play') {
    mission.update(dt);
    updateBullets(dt);
    for (const e of enemies) {
      if (e.alive && player.inv <= 0 && hitsPlayer(e.x, e.y, e.hw * 0.8, e.hh * 0.8)) { killEnemy(e); killPlayer(); }
    }
    if (mission.done() && !player.dead) {
      state = 'clear'; stateT = 1.8;
      clearBullets();
      sfx.clear();
      banner('Mission complete', mission.name, 1.8);
    }
  } else if (state === 'clear') {
    if ((stateT -= dt) <= 0) nextMission();
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.alive) { enemies.splice(i, 1); continue; }
    e.mesh.position.set(e.x, e.y, 0);
    e.mesh.rotation.y = Math.sin(time * 1.6 + e.seed) * 0.35;
  }
}

function render() {
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  camera.position.set(camBase.x + player.x * 0.14 + sx, camBase.y + sy, camBase.z);
  camera.lookAt(LOOK.x + player.x * 0.05, LOOK.y, 0);
  renderer.render(scene, camera);
}

let last = performance.now();
const classicOn = () => document.body.dataset.mode === 'classic';
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // The arcade original draws on its own canvas; idle the 3D scene meanwhile.
  if (!classicOn()) {
    if (!paused) update(dt);
    render();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */
window.addEventListener('keydown', e => {
  if (classicOn()) return;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'Space') {
    if (state === 'menu' || state === 'gameover') { if (currentModal === 'modalStart' && document.activeElement.tagName !== 'BUTTON') startGame(); }
    else fire();
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    setPaused(!paused);
  } else if (e.code === 'KeyM') {
    muted = !muted;
    if (muted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    banner('Sound', muted ? 'Muted' : 'On', 0.9);
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => {
  if (classicOn()) return;
  for (const k in keys) keys[k] = false;
  if (state === 'play' || state === 'intro') setPaused(true);
});

// Pointer: drag to steer, press to fire.
let drag = null;
const canvas = $('game');
canvas.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  fire();
});
canvas.addEventListener('pointermove', e => {
  if (!drag || player.dead || paused) return;
  const k = (W * 2.6) / Math.min(window.innerWidth, 900);
  player.x = clamp(player.x + (e.clientX - drag.x) * k, -W + 1.1, W - 1.1);
  player.y = clamp(player.y - (e.clientY - drag.y) * k, 1.2, PLAYER_TOP);
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

$('btnStart').addEventListener('click', startGame);
$('btnAgain').addEventListener('click', startGame);
$('btnResume').addEventListener('click', () => setPaused(false));
$('btnQuit').addEventListener('click', quitToTitle);
$('btnMenu').addEventListener('click', quitToTitle);
$('btnBack').addEventListener('click', () => showModal('modalMode'));
$('btnModeNew').addEventListener('click', () => showModal('modalStart'));
$('btnModeClassic').addEventListener('click', () => {
  showModal(null);
  document.body.dataset.mode = 'classic';
  window.GorfClassic.start({ onExit: () => {
    delete document.body.dataset.mode;
    showModal('modalMode');
  } });
});

syncHud();
showModal('modalMode');

// Small hook for automated checks.
window.__gorf = { get state() { return state; }, get mission() { return missionIdx; }, enemies, keys, fire, player, step: n => { for (let i = 0; i < n; i++) update(1 / 60); }, skip: () => { enemies.forEach(removeEnemy); if (mission.win) mission.win(); if (mission.need) mission.killed = mission.need; } };
})();
