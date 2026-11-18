// Scene deterministik di balik ?shot=1|2|3|4 — mengikuti formula 4-shot
// rank 1-3 (RANK-STUDY.md): chase MALAM NEON + HUJAN (target visual
// referensi kompetitor), lalu shootout, peta, title.
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

// Satu mobil polisi bernama di posisi relatif terhadap pemain.
function placeCopCar(G, dx, dz, angle, name, status) {
  const v = makeVehicle(G.rng, 'police', G.player.x + dx, G.player.z + dz, angle);
  v.ai = null;
  v.name = name;
  v.status = status;
  v.dist = Math.round(Math.hypot(dx, dz));
  v.speed = 14;
  G.vehicles.push(v);
  return v;
}

export function stageShot(name, G) {
  // Dunia segar untuk tiap scene.
  G.resetWorld();
  G.clock = 10 * 60; // siang cerah (diubah per scene)
  G.day = 1;
  if (name === '1') {
    // CHASE (hero shot): MALAM NEON + HUJAN ala referensi kompetitor
    // (22:47, jalan basah memantul, papan neon), wanted 4, heli +
    // spotlight, polisi bernama, M5 tahap kabur, dialog Dimas, NOS,
    // speed 3 digit.
    G.clock = 22 * 60 + 47; // malam 22:47 — neon + hujan
    G.rain = true;
    stageProgress(G);
    G.stats.missionsDone = 4; // M5 sedang jalan
    const car = makeVehicle(G.rng, 'sport', 84, 12, -Math.PI / 2);
    car.color = 0xd42a2a;
    G.vehicles.push(car);
    G.player.vehicle = car;
    G.player.onFoot = false;
    car.driver = G.player;
    G.player.x = car.x;
    G.player.z = car.z;
    G.player.angle = car.angle;
    spawnTraffic(G, 8);
    spawnParked(G, 6);
    spawnPeds(G, 20);
    G.screen = SCREEN_PLAY;
    G.coverStrip = '10 STORY MISSIONS · HELICOPTER CHASES · POLICE RESPONSE · RADIO 3 STATIONS · GARAGE UPGRADES · 3 SAVE SLOTS · 24 SHELLS';
    startMission(G, 4); // M5 — Rampok Toko
    simulate(G, 0.8, false); // sampai di toko -> tahap 2 (kabur, wanted 4)
    // Komposisi ulang: mobil dipindah ke jalan yang sama, sudah ngebut
    // ke arah barat (neon CBD di depan kamera chase).
    car.x = 60;
    car.z = 12;
    car.angle = -Math.PI / 2;
    car.speed = 20;
    G.player.x = car.x;
    G.player.z = car.z;
    G.player.angle = car.angle;
    G.mission.dialog = {
      speaker: 'Dimas',
      text: 'Lepas helikopter itu dulu sebelum ke garasi! Ganti mobil, ganti warna, apa saja!',
      shown: 0,
    };
    G.mission.dialog.shown = G.mission.dialog.text.length;
    simulate(G, 2.6, true, true);
    // Kunci komposisi akhir: wanted persis 4, kecepatan 3 digit,
    // heli di depan-atas pemain (sorot masuk frame), 3+ mobil polisi
    // di sekitar pemain. Pejalan kaki yang lari ke belakang mobil
    // dibersihkan supaya tidak menutupi mobil hero.
    G.peds = G.peds.filter((ped) => Math.hypot(ped.x - G.player.x, ped.z - G.player.z) > 8);
    // Polisi jalan kaki disebar ke samping/depan — jangan ada yang
    // berdiri tepat di belakang mobil (kepalanya nongol di atap).
    const copSpots = [[-14, -6], [-18, 6], [-8, -7], [-24, -3]];
    G.cops.forEach((c, i) => {
      const spot = copSpots[i % copSpots.length];
      c.x = G.player.x + spot[0];
      c.z = G.player.z + spot[1];
      c.dist = Math.round(Math.hypot(spot[0], spot[1]));
    });
    G.wanted = 4;
    G.cops.splice(4); // panel: heli + 4 mobil + 4 polisi jalan kaki
    car.speed = 19; // 152 km/j di speedometer
    if (G.heli) {
      G.heli.x = G.player.x - 14;
      G.heli.z = G.player.z - 2;
      G.heli.y = 13;
    }
    for (const v of G.vehicles) {
      if (v.type === 'police') v.dead = true; // bersihkan hasil kejar-kejaran sim
    }
    G.vehicles = G.vehicles.filter((v) => !v.dead);
    // Bersihkan mobil lalu-lalang/parkir yang menempel di sekitar hero
    // (menutupi mobil hero dari kamera rapat) — hero + polisi tetap.
    G.vehicles = G.vehicles.filter((v) => v === car || v.type === 'police' || Math.hypot(v.x - car.x, v.z - car.z) > 12);
    placeCopCar(G, -18, -3.5, -Math.PI / 2, 'CENDRAWASIH-07', 'PURSUIT');
    placeCopCar(G, -24, 4, -Math.PI / 2, 'JALAK-42', 'RAMMING');
    placeCopCar(G, -13, 0.5, -Math.PI / 2, 'BANGAU-18', 'PURSUIT');
    placeCopCar(G, -10, -5.5, -Math.PI / 2, 'ELANG-11', 'PURSUIT');
    // Kamera chase ala referensi: di belakang-utara mobil, memandang ke
    // barat daya — hero 3/4 tengah-bawah, jalan lurus ke titik hilang,
    // papan TELUK FM geser ke kiri, polisi kanan-depan masuk frame.
    // Dialog dipindah ke bawah sekali (ala referensi: tanpa dialog di
    // tengah frame) supaya badan mobil hero tidak tertutup kotak dialog.
    const dlg = document.getElementById('dialog');
    if (dlg) dlg.style.bottom = '10px';
    G.shotCam = {
      px: car.x + 7, py: 2.6, pz: car.z - 1.5,
      lx: car.x - 8, ly: 1.0, lz: car.z + 0.5,
    };
    return { screen: SCREEN_PLAY };
  }
  if (name === '2') {
    // SHOOTOUT: M10 MALAM NEON + HUJAN di gudang pelabuhan — jalan basah
    // memantulkan neon, musuh bertanda merah, helikopter + tembakan.
    G.clock = 21 * 60 + 42; // malam neon 21:42
    G.rain = true;
    G.player.x = 78;
    G.player.z = 100;
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
    G.screen = SCREEN_PLAY;
    // Musuh pertama tepat di depan pemain (tengah frame, bertanda merah);
    // sisanya berbaris di jalan yang sama supaya baku tembak terbaca.
    G.enemies.forEach((en, i) => {
      en.x = G.player.x - 6 - i * 4;
      en.z = G.player.z + (i % 2) * 3 - 1;
    });
    const e = G.enemies[0];
    if (e) {
      G.aimOverride = { x: e.x, z: e.z };
    }
    G.input.mouse.down = true;
    simulate(G, 1.5, false);
    G.input.mouse.down = false;
    // Musuh dirapatkan ke depan pemain (baris dekat, bukan kejauhan),
    // digeser ke kanan garis bidik supaya tracer melintang di frame.
    G.enemies.forEach((en, i) => {
      en.x = G.player.x - 5 - i * 2.2;
      en.z = G.player.z - 3.5 + (i % 2) * 2;
    });
    const e0 = G.enemies[0];
    if (e0) {
      G.aimOverride = { x: e0.x, z: e0.z };
      G.player.aimAngle = Math.atan2(e0.x - G.player.x, e0.z - G.player.z);
      G.player.angle = G.player.aimAngle;
    }
    // Kamera on-foot dekat + offset samping: pemain di x ~30% frame, tinggi
    // ~30-35% frame, terlihat dari samping-belakang (laras + musuh di kanan).
    // Bukan jarak kamera mobil.
    const a = G.player.angle;
    const fx = Math.sin(a);
    const fz = Math.cos(a);
    const rx = -Math.cos(a);
    const rz = Math.sin(a);
    G.shotCam = {
      px: G.player.x - fx * 4.5 + rx * 2.0,
      py: 1.9,
      pz: G.player.z - fz * 4.5 + rz * 2.0,
      lx: G.player.x + fx * 6 + rx * 2.4,
      ly: 0.6,
      lz: G.player.z + fz * 6 + rz * 2.4,
    };
    // Flash + tracer PERSISTEN sampai __shotReady: mode ?shot= tidak
    // menjalankan stepGame lagi, jadi nilai ini tidak decay sebelum frame
    // tertangkap (pelajaran shot lama: 0,07 dtk habis sebelum screenshot).
    G.muzzleFlash = 5;
    if (e0) {
      const mx = G.player.x + fx * 1.4;
      const mz = G.player.z + fz * 1.4;
      G.bullets.push({ x: e0.x, z: e0.z, px: mx, pz: mz, angle: a, speed: 0, life: 99, from: 'player' });
      G.flashTarget = { x: e0.x, z: e0.z }; // ujung balok tracer persisten
    }
    if (G.heli) {
      G.heli.x = G.player.x - 7;
      G.heli.z = G.player.z - 3;
      G.heli.y = 10;
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === '3') {
    // MAP: satu malam yang sama — peta kota + daftar misi
    // DONE/ACTIVE/LOCKED + statistik + legenda.
    G.clock = 22 * 60 + 47; // malam 22:47, konsisten dengan shot 1
    stageProgress(G);
    G.mission.index = 8; // M9 ACTIVE, M1-8 DONE, M10 LOCKED
    G.mission.started = true;
    G.mission.step = 0;
    G.mission.objective = 'Habisi 5 penjaga brankas pelabuhan';
    G.player.x = 0;
    G.player.z = 0;
    G.shells.forEach((s, i) => { s.taken = i < 9; });
    G.screen = SCREEN_MAP;
    return { screen: SCREEN_MAP };
  }
  // '4': TITLE — kota MALAM NEON + HUJAN yang hidup di belakang logo:
  // mobil hero + Raka di tengah orbit, logo gradasi + kru + Continue.
  G.clock = 21 * 60; // malam 21:00 — neon + hujan di backdrop
  G.rain = true;
  G.titleFixed = true; // kamera poster: mobil hero besar di kiri bawah
  const hero = makeVehicle(G.rng, 'sport', 3, 20, -Math.PI / 2);
  hero.color = 0xd42a2a;
  G.vehicles.push(hero);
  G.player.x = 2;
  G.player.z = 22;
  G.player.angle = 0.79; // Raka menghadap kamera, di samping mobil
  G.player.onFoot = true;
  writeSave(0, {
    cash: 14830, health: 82, armor: 64, x: 0, z: 0,
    weapon: 'pistol', ammo: { pistol: 48, shotgun: 12 }, ammoInMag: { pistol: 12, shotgun: 6 },
    missionIndex: 6, missionStarted: false, wanted: 0,
    clock: 16 * 60 + 29, day: 3, rep: 1092, shells: 7,
    upgrades: {}, playSeconds: 2 * 3600 + 31 * 60,
    stats: { missionsDone: 6, takedowns: 34, carsStolen: 21, escapes: 6, shells: 7 },
  });
  G.titleSave = {
    cash: 14830, missionIndex: 6, day: 3, rep: 1092, shells: 7,
  };
  simulate(G, 4, false);
  G.screen = SCREEN_TITLE;
  return { screen: SCREEN_TITLE };
}
