// Boot + loop Teluk Cerah. Game state (G) dibuat di sini dan dibagikan ke semua
// modul; stepGame() adalah satu-satunya jalan memajukan simulasi, dipakai
// loop nyata maupun scene screenshot deterministik.
//
// ?seed=N mengganti seed kota. ?shot=1|2|3|4 men-stage scene lalu melukisnya
// dua kali dan menyetel window.__shotReady untuk screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_RELOAD, ACTION_MUTE } from './input.js';
import { createCity } from './city.js';
import { createPlayer, updatePlayer } from './player.js';
import { spawnTraffic, spawnParked, spawnLoanerCar, updateVehicles } from './vehicles.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updatePolice } from './police.js';
import { fireWeapon, reloadWeapon, updateCombat } from './combat.js';
import { createMissionState, startMission, updateMissions, onMissionEvent, startTaxi, startRampage } from './missions.js';
import { createRenderer } from './render.js';
import { createHud, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './hud.js';
import { createAudio } from './audio.js';
import { readSave, writeSave } from './save.js';
import { stageShot } from './shots.js';
import { MISSION_DEFS } from './config.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const input = createInput(canvas);
const renderer = createRenderer(canvas);
const hud = createHud(canvas);
const audio = createAudio();

const G = {
  seed, rng: createRandom(seed), city: null,
  time: 0, clock: 8 * 60, day: 1,
  player: null, vehicles: [], peds: [], cops: [], enemies: [],
  bullets: [], particles: [], skid: [], cashFloaters: [],
  wanted: 0, wantedTimer: 0, hiddenTimer: 0, roadblock: null,
  mission: createMissionState(), missionDefs: MISSION_DEFS,
  camera: { x: 900, y: 2650, zoom: 1 },
  viewW: window.innerWidth, viewH: window.innerHeight,
  shake: 0, flashRed: 0, shotsFiredTimer: 0,
  events: [], screen: SCREEN_TITLE,
  input, audio,
};

function resetWorld() {
  G.rng = createRandom(G.seed);
  G.city = createCity(G.rng);
  G.time = 0;
  G.clock = 8 * 60;
  G.day = 1;
  G.player = createPlayer(470, 2650); // rumah Raka, Marina barat
  G.vehicles = [];
  G.peds = [];
  G.cops = [];
  G.enemies = [];
  G.bullets = [];
  G.particles = [];
  G.skid = [];
  G.cashFloaters = [];
  G.wanted = 0;
  G.hiddenTimer = 0;
  G.roadblock = null;
  G.mission = createMissionState();
  G.shake = 0;
  G.flashRed = 0;
  G.shotsFiredTimer = 0;
  G.events = [];
  G.camera = { x: G.player.x, y: G.player.y, zoom: 1 };
  spawnLoanerCar(G);
  spawnTraffic(G, 12);
  spawnParked(G, 10);
  spawnPeds(G, 40);
}
G.resetWorld = resetWorld;

function snapshot() {
  const p = G.player;
  return {
    cash: p.cash, health: p.health, armor: p.armor,
    x: p.x, y: p.y, weapon: p.weapon,
    ammo: p.ammo, ammoInMag: p.ammoInMag,
    missionIndex: G.mission.index, missionStarted: G.mission.started,
    wanted: G.wanted, clock: G.clock, day: G.day,
  };
}

function applySnapshot(s) {
  const p = G.player;
  p.cash = s.cash; p.health = s.health; p.armor = s.armor;
  p.x = s.x; p.y = s.y;
  p.weapon = s.weapon || 'fist';
  p.ammo = s.ammo || p.ammo;
  p.ammoInMag = s.ammoInMag || p.ammoInMag;
  G.wanted = s.wanted || 0;
  G.clock = s.clock || 8 * 60;
  G.day = s.day || 1;
  if (s.missionIndex >= 0 && s.missionIndex < MISSION_DEFS.length) {
    startMission(G, s.missionIndex);
    if (!s.missionStarted) { G.mission.started = false; }
  }
}

function drainEvents() {
  while (G.events.length) {
    const ev = G.events.shift();
    onMissionEvent(G, ev);
  }
}

function stepGame(dt) {
  G.time += dt;
  G.clock += dt * 3; // 1 hari game = 8 menit nyata
  if (G.clock >= 1440) { G.clock -= 1440; G.day += 1; }
  const actions = input.takeActions();

  if (G.screen === SCREEN_TITLE) {
    updateVehicles(G, dt);
    updatePeds(G, dt);
    G.camera.x = G.player.x;
    G.camera.y = G.player.y;
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      audio.startMusic();
      G.screen = SCREEN_PLAY;
      announce('Teluk Cerah. Temui Bu Sari — tekan Enter untuk mulai misi pertama.');
    }
    return;
  }
  if (G.screen === SCREEN_PAUSED) {
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) G.screen = SCREEN_PLAY;
    return;
  }

  // --- layar play ---
  if (actions & ACTION_PAUSE) { G.screen = SCREEN_PAUSED; announce('Paused.'); return; }
  if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
  if (actions & ACTION_RELOAD) reloadWeapon(G);

  // Taksi (T) / Rampage (G) — sekali tekan.
  if (input.keys.taxi && !G._taxiLatch) { G._taxiLatch = true; startTaxi(G); }
  if (!input.keys.taxi) G._taxiLatch = false;
  if (input.keys.rampage && !G._rampageLatch) { G._rampageLatch = true; startRampage(G); }
  if (!input.keys.rampage) G._rampageLatch = false;

  // Enter: dialog dulu, lalu mulai misi berikutnya.
  const m = G.mission;
  if (actions & ACTION_CONFIRM) {
    if (m.dialog && m.dialog.shown < m.dialog.text.length) {
      m.dialog.shown = m.dialog.text.length;
    } else if (m.dialog) {
      m.dialog = null;
    } else if (!m.started && m.index >= 0) {
      startMission(G, m.index);
    }
  }

  // Tembak (klik kiri tahan).
  if (G.player.onFoot && input.firing()) fireWeapon(G);

  updatePlayer(G, dt, input, actions);
  updateVehicles(G, dt);
  updatePeds(G, dt);
  updatePolice(G, dt);
  updateCombat(G, dt);
  updateMissions(G, dt);
  drainEvents();

  // Taxi: jemput lalu antar.
  if (m.taxi) {
    const t = m.taxi;
    if (t.state === 'pickup' && Math.hypot(G.player.x - t.px, G.player.y - t.py) < 60) {
      t.state = 'dropoff';
      const a = G.rng.range(0, Math.PI * 2);
      t.dx = Math.max(100, Math.min(3100, G.player.x + Math.cos(a) * 900));
      t.dy = Math.max(100, Math.min(3100, G.player.y + Math.sin(a) * 900));
      t.fare = 60 + G.rng.int(0, 80);
      m.objective = `Taksi: antar penumpang (bayaran $${t.fare})`;
    } else if (t.state === 'dropoff' && Math.hypot(G.player.x - t.dx, G.player.y - t.dy) < 70) {
      G.player.cash += t.fare;
      m.banner = `TAKSI SELESAI  +$${t.fare}`;
      m.taxi = null;
      m.objective = m.started ? MISSION_DEFS[m.index].steps[m.step].text : 'Tekan Enter untuk misi berikutnya';
    }
  }

  // Rampage: skor dari bunuh musuh.
  if (m.rampage) {
    // skor dihitung dari event enemyKilled/pedKilled saat rampage aktif
  }

  // Kamera follow + zoom.
  const targetZoom = G.player.onFoot ? 1.0 : 0.85;
  G.camera.zoom += (targetZoom - G.camera.zoom) * Math.min(1, dt * 2);
  G.camera.x += (G.player.x - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (G.player.y - G.camera.y) * Math.min(1, dt * 5);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
  if (G.flashRed > 0) G.flashRed = Math.max(0, G.flashRed - dt * 1.5);
  for (let i = G.cashFloaters.length - 1; i >= 0; i -= 1) {
    G.cashFloaters[i].life -= dt;
    if (G.cashFloaters[i].life <= 0) G.cashFloaters.splice(i, 1);
  }
}
G.stepGame = stepGame;

function announce(message) {
  status.textContent = message;
}

function drawFrame() {
  G.viewW = window.innerWidth;
  G.viewH = window.innerHeight;
  hud.setView(G.viewW, G.viewH);
  renderer.draw(G, G.screen);
  if (G.screen === SCREEN_TITLE) {
    const saves = readSave(0);
    hud.drawPanel('TELUK CERAH', [
      'Open-world crime 2D — kota pantai, 6 misi, wanted 0-5, taksi & rampage.',
      'WASD gerak · E masuk mobil · F curi mobil · Klik kiri tembak · R reload',
      'Shift lari · Space handbrake · T taksi · G rampage · Esc pause · M mute',
      saves ? `Save ditemukan (Hari ${saves.day}, $${saves.cash}) — tekan L untuk lanjut` : 'Belum ada save.',
      '',
      'Semua nama, kota, dan cerita orisinal. Bukan GTA.',
    ], 'Tekan Enter / klik untuk mulai');
  } else if (G.screen === SCREEN_PAUSED) {
    hud.drawPanel('Paused', [
      'S — simpan ke slot 1',
      'Q — kembali ke title',
      'Esc — lanjut main',
    ], 'Esc untuk lanjut');
  } else {
    hud.drawHud(G);
  }
}

function runShot(name) {
  const scene = stageShot(name, G);
  let painted = 0;
  function paint() {
    drawFrame();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  // L: load save dari title. S/Q di pause.
  window.addEventListener('keydown', (e) => {
    if (G.screen === SCREEN_TITLE && e.code === 'KeyL') {
      const s = readSave(0);
      if (s) {
        applySnapshot(s);
        G.screen = SCREEN_PLAY;
        announce('Save dimuat. Lanjutkan!');
      }
    }
    if (G.screen === SCREEN_PAUSED && e.code === 'KeyS') {
      const ok = writeSave(0, snapshot());
      announce(ok ? 'Disimpan ke slot 1.' : 'Gagal menyimpan.');
    }
    if (G.screen === SCREEN_PAUSED && e.code === 'KeyQ') {
      G.screen = SCREEN_TITLE;
      resetWorld();
    }
    if (G.screen === SCREEN_PLAY && e.code === 'Digit1') G.player.weapon = 'fist';
    if (G.screen === SCREEN_PLAY && e.code === 'Digit2' && G.player.ammo.pistol > 0) G.player.weapon = 'pistol';
    if (G.screen === SCREEN_PLAY && e.code === 'Digit3' && G.player.ammo.shotgun > 0) G.player.weapon = 'shotgun';
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (accumulator >= STEP) {
      stepGame(STEP);
      accumulator -= STEP;
    }
    drawFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === SCREEN_PLAY) G.screen = SCREEN_PAUSED;
  });

  announce('Teluk Cerah. Tekan Enter untuk mulai.');
  requestAnimationFrame(frame);
}

resetWorld();
window.__game = G;
window.__shotReady = false;

if (shot) runShot(shot);
else runGame();
