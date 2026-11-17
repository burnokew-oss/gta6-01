// Scene deterministik di balik ?shot=1|2|3|4. Tiap scene memainkan aturan
// sungguhan maju beberapa detik dari seed tetap, jadi frame yang tertangkap
// adalah tampilan game yang sebenarnya — bukan mockup.
import { STEP } from './config.js';
import { makeVehicle, spawnParked, spawnTraffic } from './vehicles.js';
import { spawnPeds } from './pedestrians.js';
import { addWanted } from './police.js';
import { startMission } from './missions.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './hud.js';

function simulate(G, seconds, drive) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (drive) {
      G.input.keys.up = true;
      G.input.keys.right = i % 240 < 120;
    }
    G.stepGame(STEP);
    if (drive) { G.input.keys.up = false; G.input.keys.right = false; }
  }
}

export function stageShot(name, G) {
  // Dunia segar untuk tiap scene.
  G.resetWorld();
  G.clock = 10 * 60; // siang cerah
  G.day = 1;
  if (name === '1') {
    simulate(G, 4, false);
    G.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE };
  }
  if (name === '2') {
    // Nyetir sport di jalan ramai + HUD + minimap.
    const car = makeVehicle(G.rng, 'sport', 1400, 1400, 0);
    G.vehicles.push(car);
    G.player.vehicle = car;
    G.player.onFoot = false;
    car.driver = G.player;
    G.player.x = car.x; G.player.y = car.y;
    spawnTraffic(G, 14);
    spawnParked(G, 6);
    spawnPeds(G, 30);
    G.camera.x = car.x; G.camera.y = car.y;
    simulate(G, 5, true);
    G.screen = SCREEN_PLAY;
    return { screen: SCREEN_PLAY };
  }
  if (name === '3') {
    // Wanted 3, kejar-kejaran polisi.
    const car = makeVehicle(G.rng, 'sedan', 1400, 1400, 0);
    G.vehicles.push(car);
    G.player.vehicle = car;
    G.player.onFoot = false;
    car.driver = G.player;
    G.player.x = car.x; G.player.y = car.y;
    spawnTraffic(G, 10);
    spawnPeds(G, 20);
    addWanted(G, 3);
    G.camera.x = car.x; G.camera.y = car.y;
    simulate(G, 4, true);
    G.screen = SCREEN_PLAY;
    return { screen: SCREEN_PLAY };
  }
  // '4': misi jalan kaki + combat.
  G.player.x = 1250; G.player.y = 1250;
  G.player.weapon = 'pistol';
  G.player.ammoInMag.pistol = 12;
  G.player.ammo.pistol = 48;
  spawnPeds(G, 24);
  spawnParked(G, 4);
  startMission(G, 2); // M3 — Utang Lama (combat)
  G.mission.dialog.shown = G.mission.dialog.text.length; // dialog penuh
  G.camera.x = G.player.x; G.camera.y = G.player.y;
  // Bidik ke musuh terdekat lalu tembak sekali.
  const e = G.enemies[0];
  if (e) {
    G.player.aimAngle = Math.atan2(e.y - G.player.y, e.x - G.player.x);
    G.input.mouse.x = G.viewW / 2 + Math.cos(G.player.aimAngle) * 200;
    G.input.mouse.y = G.viewH / 2 + Math.sin(G.player.aimAngle) * 200;
  }
  simulate(G, 1.2, false);
  G.screen = SCREEN_PLAY;
  return { screen: SCREEN_PLAY };
}
