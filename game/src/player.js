// Pemain: jalan kaki (WASD + lari) dan mengemudi (gas/rem/setir + handbrake).
// Masuk mobil (E), curi mobil (F), keluar mobil (E lagi).
import { WORLD } from './config.js';
import { collideBuildings } from './city.js';
import { damagePlayer, nearestVehicle } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    onFoot: true, vehicle: null,
    health: 100, armor: 0,
    weapon: 'fist', ammo: { pistol: 12, shotgun: 0 },
    ammoInMag: { pistol: 12, shotgun: 0 },
    reloadTimer: 0, fireTimer: 0,
    invuln: 0, cash: 100,
    aimAngle: 0, moving: false,
  };
}

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function updatePlayer(G, dt, input, actions) {
  const p = G.player;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.fireTimer > 0) p.fireTimer -= dt;
  if (p.reloadTimer > 0) p.reloadTimer -= dt;

  // Arah bidik dari mouse (layar -> dunia).
  const cam = G.camera;
  const wx = cam.x + (input.mouse.x - G.viewW / 2) / cam.zoom;
  const wy = cam.y + (input.mouse.y - G.viewH / 2) / cam.zoom;
  p.aimAngle = Math.atan2(wy - p.y, wx - p.x);

  if (p.onFoot) {
    const ax = input.axisX();
    const ay = input.axisY();
    const run = input.running() ? 1.7 : 1;
    const speed = 170 * run;
    p.moving = ax !== 0 || ay !== 0;
    if (p.moving) {
      const len = Math.hypot(ax, ay) || 1;
      p.x += (ax / len) * speed * dt;
      p.y += (ay / len) * speed * dt;
      p.angle = Math.atan2(ay, ax);
    }
    p.x = Math.max(20, Math.min(WORLD - 20, p.x));
    p.y = Math.max(20, Math.min(WORLD - 20, p.y));
    const fixed = collideBuildings(G.city, p.x, p.y, 14);
    p.x = fixed.x; p.y = fixed.y;

    // E: masuk mobil terdekat. F: curi mobil (sopir dipaksa keluar).
    if (actions & 4) { // ACTION_ENTER
      const v = nearestVehicle(G, p.x, p.y, 70, true);
      if (v) enterVehicle(G, v, false);
    }
    if (actions & 8) { // ACTION_STEAL
      const v = nearestVehicle(G, p.x, p.y, 70, true);
      if (v) enterVehicle(G, v, true);
    }
  } else if (p.vehicle) {
    const v = p.vehicle;
    const throttle = input.axisY() * -1; // W = gas
    const steer = input.axisX();
    if (throttle > 0) v.speed += v.accel * dt;
    else if (throttle < 0) v.speed -= v.accel * 1.4 * dt;
    else v.speed -= Math.sign(v.speed) * 60 * dt;
    if (Math.abs(v.speed) < 5 && throttle === 0) v.speed = 0;
    if (input.braking()) {
      v.speed *= Math.max(0, 1 - 3 * dt);
      if (Math.abs(v.speed) > 80 && G.rng.chance(dt * 20)) {
        G.particles.push({ x: v.x, y: v.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 5, color: '#555', kind: 'smoke' });
        G.skid.push({ x: v.x, y: v.y, angle: v.angle, life: 3 });
      }
    }
    v.speed = Math.max(-v.top * 0.45, Math.min(v.top, v.speed));
    const turnRate = v.turn * Math.min(1, Math.abs(v.speed) / 120 + 0.25) * Math.sign(v.speed || 1);
    v.angle += steer * turnRate * dt;
    v.x += Math.cos(v.angle) * v.speed * dt;
    v.y += Math.sin(v.angle) * v.speed * dt;
    v.x = Math.max(30, Math.min(WORLD - 30, v.x));
    v.y = Math.max(30, Math.min(WORLD - 30, v.y));
    const fixed = collideBuildings(G.city, v.x, v.y, v.len / 2 - 4);
    if (fixed.x !== v.x || fixed.y !== v.y) {
      if (Math.abs(v.speed) > 150) {
        v.health -= 8;
        if (G.audio) G.audio.crash();
        G.shake = Math.max(G.shake, 6);
      }
      v.speed *= 0.4;
      v.x = fixed.x; v.y = fixed.y;
    }
    p.x = v.x; p.y = v.y; p.angle = v.angle;
    if (G.audio) G.audio.engine(true, Math.abs(v.speed) / v.top);
    if (actions & 4) exitVehicle(G); // E keluar mobil
    // Tabrak pejalan kaki: wanted naik.
    for (const ped of G.peds) {
      if (ped.dead) continue;
      if (Math.hypot(ped.x - v.x, ped.y - v.y) < 26 && Math.abs(v.speed) > 60) {
        ped.dead = true;
        ped.fleeing = false;
        G.events.push('pedKilled');
        G.cashFloaters.push({ x: ped.x, y: ped.y, text: '!', life: 0.8 });
      }
    }
  }
  if (p.onFoot && G.audio) G.audio.engine(false, 0);
}

export function enterVehicle(G, v, steal) {
  const p = G.player;
  if (v.driver && v.driver !== p) {
    // Sopir lama dipaksa keluar (hanya saat curi).
    const d = v.driver;
    d.x = v.x + Math.cos(v.angle + Math.PI / 2) * 40;
    d.y = v.y + Math.sin(v.angle + Math.PI / 2) * 40;
    d.fleeing = true;
    v.driver = null;
  }
  if (v.ai) { v.ai = null; v.parked = false; }
  v.driver = p;
  p.vehicle = v;
  p.onFoot = false;
  p.x = v.x; p.y = v.y;
  if (steal) {
    G.events.push('stoleCar');
    if (G.audio) G.audio.wantedUp();
  }
}

export function exitVehicle(G) {
  const p = G.player;
  const v = p.vehicle;
  if (!v) return;
  v.driver = null;
  v.speed *= 0.3;
  p.vehicle = null;
  p.onFoot = true;
  p.x = v.x + Math.cos(v.angle + Math.PI / 2) * 34;
  p.y = v.y + Math.sin(v.angle + Math.PI / 2) * 34;
  p.angle = v.angle;
  if (G.audio) G.audio.engine(false, 0);
}

export { damagePlayer };
