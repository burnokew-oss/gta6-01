// Scene deterministik di balik ?shot=1|2|3|4 — mengikuti formula 4-shot
// rank 1-3 (RANK-STUDY.md): chase sunset dulu, lalu shootout, peta, title.
// Tiap scene memainkan aturan sungguhan maju beberapa detik dari seed
// tetap, jadi frame yang tertangkap adalah tampilan game yang sebenarnya.
import { STEP } from './config.js';
import { makeVehicle, spawnParked, spawnTraffic } from './vehicles.js';
import { spawnPeds } from './pedestrians.js';
import { addWanted } from './police.js';
import { startMission } from './missions.js';
import { writeSave } from './save.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_MAP } from './hud.js';

function simulate(G, seconds, drive, nos) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (drive) G.input.keys.up = true; // lurus di jalan, tanpa belok
    if (nos) G.input.keys.run = true; // Shift = NOS saat nyetir
    G.stepGame(STEP);
    if (drive) G.input.keys.up = false;
    if (nos) G.input.keys.run = false;
  }
}

// Profil progres "save jauh" untuk shot chase/peta (uang besar, Rep tier 4,
// statistik hidup) — sama seperti rank 1-3 yang memotret dari save lanjutan.
function stageProgress(G) {
  G.player.cash = 48250;
  G.rep = 1960;
  G.stats = { missionsDone: 8, takedowns: 61, carsStolen: 38, escapes: 13, shells: 9 };
  G.playSeconds = 3 * 3600 + 47 * 60;
  G.day = 3;
}

export function stageShot(name, G) {
  // Dunia segar untuk tiap scene.
  G.resetWorld();
  G.clock = 10 * 60; // siang cerah (diubah per scene)
  G.day = 1;
  if (name === '1') {
    // CHASE (hero shot): sunset, wanted 4, heli + spotlight, ≥3 polisi
    // bernama, M5 tahap kabur, dialog Dimas, NOS, speed 3 digit.
    G.clock = 17 * 60 + 30; // senja oranye
    stageProgress(G);
    G.stats.missionsDone = 4; // M5 sedang jalan
    const car = makeVehicle(G.rng, 'sport', 2150, 1400, 0);
    G.vehicles.push(car);
    G.player.vehicle = car;
    G.player.onFoot = false;
    car.driver = G.player;
    G.player.x = car.x; G.player.y = car.y;
    spawnTraffic(G, 8);
    spawnParked(G, 6);
    spawnPeds(G, 20);
    G.camera.x = car.x; G.camera.y = car.y;
    G.screen = SCREEN_PLAY;
    G.coverStrip = '10 STORY MISSIONS · HELICOPTER CHASES · POLICE RESPONSE · RADIO 3 STATIONS · GARAGE UPGRADES · 3 SAVE SLOTS · 24 SHELLS';
    startMission(G, 4); // M5 — Rampok Toko
    simulate(G, 0.8, false); // sampai di toko -> tahap 2 (kabur, wanted 4)
    // Komposisi ulang: mobil dipindah ke ujung barat jalan yang sama,
    // sudah ngebut — frame diambil saat kecepatan masih 3 digit.
    car.x = 900; car.y = 1400; car.angle = 0; car.speed = 420;
    G.player.x = car.x; G.player.y = car.y;
    G.camera.x = car.x; G.camera.y = car.y;
    G.mission.dialog = {
      speaker: 'Dimas',
      text: 'Lepas helikopter itu dulu sebelum ke garasi! Ganti mobil, ganti warna, apa saja!',
      shown: 0,
    };
    G.mission.dialog.shown = G.mission.dialog.text.length;
    simulate(G, 2.6, true, true);
    return { screen: SCREEN_PLAY };
  }
  if (name === '2') {
    // SHOOTOUT: M10 malam di gudang pelabuhan + helikopter + tembakan.
    G.clock = 19 * 60; // malam, lampu jalan + jendela menyala
    G.player.x = 2900; G.player.y = 2900;
    G.player.weapon = 'pistol';
    G.player.ammoInMag.pistol = 12;
    G.player.ammo.pistol = 48;
    G.player.cash = 18300;
    G.rep = 1200;
    spawnPeds(G, 24);
    spawnParked(G, 4);
    startMission(G, 9); // M10 — Raja Teluk
    G.mission.dialog.shown = G.mission.dialog.text.length; // dialog penuh
    addWanted(G, 3); // helikopter ikut masuk frame
    G.camera.x = G.player.x; G.camera.y = G.player.y;
    G.screen = SCREEN_PLAY;
    const e = G.enemies[0];
    if (e) {
      G.player.aimAngle = Math.atan2(e.y - G.player.y, e.x - G.player.x);
      G.input.mouse.x = G.viewW / 2 + Math.cos(G.player.aimAngle) * 200;
      G.input.mouse.y = G.viewH / 2 + Math.sin(G.player.aimAngle) * 200;
    }
    G.input.mouse.down = true;
    simulate(G, 1.5, false);
    G.input.mouse.down = false;
    return { screen: SCREEN_PLAY };
  }
  if (name === '3') {
    // MAP: peta kota + daftar misi DONE/ACTIVE/LOCKED + statistik + legenda.
    G.clock = 18 * 60 + 40;
    stageProgress(G);
    G.mission.index = 8; // M9 ACTIVE, M1-8 DONE, M10 LOCKED
    G.mission.started = true;
    G.mission.step = 0;
    G.mission.objective = 'Habisi 5 penjaga brankas pelabuhan';
    G.player.x = 1650; G.player.y = 1650;
    G.shells.forEach((s, i) => { s.taken = i < 9; });
    G.camera.x = G.player.x; G.camera.y = G.player.y;
    G.screen = SCREEN_MAP;
    return { screen: SCREEN_MAP };
  }
  // '4': TITLE — logo gradasi + kru + Continue ber-ringkasan save.
  writeSave(0, {
    cash: 14830, health: 82, armor: 64, x: 1650, y: 1650,
    weapon: 'pistol', ammo: { pistol: 48, shotgun: 12 }, ammoInMag: { pistol: 12, shotgun: 6 },
    missionIndex: 6, missionStarted: false, wanted: 0,
    clock: 16 * 60 + 29, day: 3, rep: 1092, shells: 7,
    upgrades: {}, playSeconds: 2 * 3600 + 31 * 60,
    stats: { missionsDone: 6, takedowns: 34, carsStolen: 21, escapes: 6, shells: 7 },
  });
  simulate(G, 4, false);
  G.screen = SCREEN_TITLE;
  return { screen: SCREEN_TITLE };
}
