// Kendaraan: fisika arcade, traffic AI yang mengikuti graf jalan,
// spawn/despawn di sekitar kamera, damage + ledakan.
import { VEHICLE_TYPES, WORLD } from './config.js';
import { nearestRoadPoint, roadLines } from './city.js';

let nextId = 1;

export function makeVehicle(rng, type, x, y, angle) {
  const t = VEHICLE_TYPES[type];
  return {
    id: nextId += 1, type, color: t.color,
    x, y, angle: angle ?? 0, speed: 0,
    len: t.len, wid: t.wid, accel: t.accel, top: t.top, turn: t.turn,
    health: 100, smoking: false, driver: null, parked: false,
    ai: null, // {road:'v'|'h', line, dir, lane}
    dead: false, flash: 0,
  };
}

export function spawnTraffic(G, count) {
  const lines = roadLines();
  for (let i = 0; i < count; i += 1) {
    const vertical = G.rng.chance(0.5);
    const line = G.rng.pick(lines);
    const along = G.rng.range(200, WORLD - 200);
    const dir = G.rng.chance(0.5) ? 1 : -1;
    const lane = dir * 30;
    const x = vertical ? line + lane : along;
    const y = vertical ? along : line + lane;
    const type = G.rng.pick(['sedan', 'sedan', 'taxi', 'truck', 'van', 'sport']);
    const v = makeVehicle(G.rng, type, x, y, vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI));
    v.ai = { road: vertical ? 'v' : 'h', line, dir };
    v.speed = G.rng.range(120, 220);
    G.vehicles.push(v);
  }
}

export function spawnParked(G, count) {
  const lines = roadLines();
  for (let i = 0; i < count; i += 1) {
    const vertical = G.rng.chance(0.5);
    const line = G.rng.pick(lines);
    const along = G.rng.range(200, WORLD - 200);
    const side = G.rng.chance(0.5) ? 1 : -1;
    const x = vertical ? line + side * 52 : along;
    const y = vertical ? along : line + side * 52;
    const type = G.rng.pick(['sedan', 'sedan', 'taxi', 'van', 'sport']);
    const v = makeVehicle(G.rng, type, x, y, vertical ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : 0);
    v.parked = true;
    v.driver = null;
    G.vehicles.push(v);
  }
}

// Mobil pinjaman Misi 1: sedan biru di parkiran dekat rumah (Marina barat).
export function spawnLoanerCar(G) {
  const v = makeVehicle(G.rng, 'sedan', 470, 2650, Math.PI / 2);
  v.color = '#2e6fb5';
  v.parked = true;
  v.loaner = true;
  G.vehicles.push(v);
  return v;
}

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function updateVehicles(G, dt) {
  const px = G.player.x; const py = G.player.y;
  for (const v of G.vehicles) {
    if (v.dead) continue;
    if (v.flash > 0) v.flash -= dt;
    if (v.ai) {
      // Traffic AI: melaju di lajur, belok acak di persimpangan.
      const targetSpeed = 170;
      v.speed += Math.sign(targetSpeed - v.speed) * 120 * dt;
      const lines = roadLines();
      const onCross = lines.some((l) => Math.abs((v.ai.road === 'v' ? v.y : v.x) - l) < 14);
      if (onCross && G.rng.chance(dt * 0.5)) {
        // Belok: ganti jalan.
        const cross = lines.reduce((a, l) => (Math.abs((v.ai.road === 'v' ? v.y : v.x) - l) < Math.abs((v.ai.road === 'v' ? v.y : v.x) - a) ? l : a), lines[0]);
        if (v.ai.road === 'v') {
          v.ai = { road: 'h', line: cross, dir: G.rng.chance(0.5) ? 1 : -1 };
          v.y = cross + v.ai.dir * 30;
        } else {
          v.ai = { road: 'v', line: cross, dir: G.rng.chance(0.5) ? 1 : -1 };
          v.x = cross + v.ai.dir * 30;
        }
      }
      const wantAngle = v.ai.road === 'v'
        ? (v.ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
        : (v.ai.dir > 0 ? 0 : Math.PI);
      v.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, angleDiff(v.angle, wantAngle)));
      // Jaga lajur: tarik pelan ke garis lajur.
      if (v.ai.road === 'v') v.x += (v.ai.line + v.ai.dir * 30 - v.x) * Math.min(1, dt * 1.5);
      else v.y += (v.ai.line + v.ai.dir * 30 - v.y) * Math.min(1, dt * 1.5);
      v.x += Math.cos(v.angle) * v.speed * dt;
      v.y += Math.sin(v.angle) * v.speed * dt;
    } else if (v === G.player.vehicle) {
      // Kendaraan pemain: dikemudikan player.js; di sini hanya gesekan + asap.
      if (v.speed > 0) v.speed = Math.max(0, v.speed - 20 * dt);
    }
    // Keluar dunia: bungkus ke sisi lain.
    if (v.x < 40) v.x = 40; if (v.x > WORLD - 40) v.x = WORLD - 40;
    if (v.y < 40) v.y = 40; if (v.y > WORLD - 40) v.y = WORLD - 40;
    // Asap saat rusak parah.
    if (v.health < 40 && !v.smoking) { v.smoking = true; }
    if (v.smoking && G.rng.chance(dt * 8)) {
      G.particles.push({ x: v.x, y: v.y - 10, vx: G.rng.range(-20, 20), vy: G.rng.range(-40, -10), life: 0.7, max: 0.7, size: 8, color: '#888', kind: 'smoke' });
    }
    if (v.health <= 0 && !v.dead) {
      v.dead = true;
      explodeVehicle(G, v);
    }
  }
  // Despawn traffic jauh dari pemain, respawn dekat.
  for (let i = G.vehicles.length - 1; i >= 0; i -= 1) {
    const v = G.vehicles[i];
    if (v.dead) { G.vehicles.splice(i, 1); continue; }
    if (v.ai) {
      const d = Math.hypot(v.x - px, v.y - py);
      if (d > 1400) {
        const p = nearestRoadPoint(px + G.rng.range(-700, 700), py + G.rng.range(-700, 700));
        v.x = p.x; v.y = p.y;
      }
    }
  }
  // Tabrakan antar mobil (dorong sederhana).
  for (let i = 0; i < G.vehicles.length; i += 1) {
    for (let j = i + 1; j < G.vehicles.length; j += 1) {
      const a = G.vehicles[i]; const b = G.vehicles[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x; const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = (a.len + b.len) / 2 - 8;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d; const ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        a.speed *= 0.7; b.speed *= 0.7;
        if (Math.abs(a.speed) > 120 || Math.abs(b.speed) > 120) {
          a.health -= 4; b.health -= 4;
          if (G.audio) G.audio.crash();
        }
      }
    }
  }
  // Near miss: ngebut melewati traffic sangat dekat = +$25 (sekali per mobil).
  const pv = G.player.vehicle;
  if (pv && !G.player.onFoot && Math.abs(pv.speed) > 200) {
    for (const v of G.vehicles) {
      if (!v.ai || v.dead || v.nearMissed) continue;
      const d = Math.hypot(v.x - pv.x, v.y - pv.y);
      if (d < 52 && d > 30) {
        v.nearMissed = true;
        G.player.cash += 25;
        G.cashFloaters.push({ x: pv.x, y: pv.y - 40, text: 'NEAR MISS +$25', life: 1.2 });
        if (G.audio) G.audio.pickup();
      }
    }
  }
}

export function explodeVehicle(G, v) {
  for (let i = 0; i < 26; i += 1) {
    G.particles.push({
      x: v.x, y: v.y,
      vx: G.rng.range(-220, 220), vy: G.rng.range(-220, 220),
      life: G.rng.range(0.4, 1), max: 1, size: G.rng.range(4, 12),
      color: G.rng.pick(['#ff8c1a', '#ffd23f', '#e5534b', '#888']), kind: 'fire',
    });
  }
  G.shake = Math.max(G.shake, 14);
  if (G.audio) G.audio.explosion();
  const d = Math.hypot(G.player.x - v.x, G.player.y - v.y);
  if (d < 120 && G.player.vehicle !== v) damagePlayer(G, Math.round(40 - d / 4));
  if (G.player.vehicle === v) {
    G.player.vehicle = null;
    G.player.onFoot = true;
    damagePlayer(G, 30);
  }
}

export function damagePlayer(G, amount) {
  if (G.player.invuln > 0) return;
  let left = amount;
  if (G.player.armor > 0) {
    const absorbed = Math.min(G.player.armor, left);
    G.player.armor -= absorbed;
    left -= absorbed;
  }
  G.player.health -= left;
  G.player.invuln = 0.5;
  G.flashRed = Math.max(G.flashRed, 0.35);
  if (G.player.health <= 0) {
    G.player.health = 0;
    G.events.push('wasted');
  }
}

export function nearestVehicle(G, x, y, maxDist, includeParked) {
  let best = null; let bestD = maxDist;
  for (const v of G.vehicles) {
    if (v.dead) continue;
    if (v.parked && !includeParked) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}
