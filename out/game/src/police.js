// Wanted 0-5 bintang + AI polisi (jalan kaki + mobil patroli + roadblock).
import { COP_CAR_COUNTS, COP_COUNTS, WANTED_DECAY_SECONDS } from './config.js';
import { makeVehicle } from './vehicles.js';
import { damagePlayer } from './vehicles.js';

export function addWanted(G, n) {
  const before = G.wanted;
  G.wanted = Math.max(0, Math.min(5, G.wanted + n));
  G.wantedTimer = 0;
  G.hiddenTimer = 0;
  if (G.wanted > before && G.audio) G.audio.wantedUp();
}

export function updatePolice(G, dt) {
  // Turun perlahan saat tidak terlihat polisi.
  if (G.wanted > 0) {
    let seen = false;
    for (const c of G.cops) {
      if (Math.hypot(c.x - G.player.x, c.y - G.player.y) < 420) { seen = true; break; }
    }
    for (const v of G.vehicles) {
      if (v.type === 'police' && Math.hypot(v.x - G.player.x, v.y - G.player.y) < 500) { seen = true; break; }
    }
    if (!seen) {
      G.hiddenTimer += dt;
      if (G.hiddenTimer >= WANTED_DECAY_SECONDS[G.wanted]) {
        G.wanted -= 1;
        G.hiddenTimer = 0;
        G.events.push('wantedDown');
      }
    } else {
      G.hiddenTimer = 0;
    }
  }

  // Spawn polisi sesuai bintang.
  const wantFoot = COP_COUNTS[G.wanted];
  const wantCars = COP_CAR_COUNTS[G.wanted];
  let foot = 0; let cars = 0;
  for (const c of G.cops) if (!c.dead) foot += 1;
  for (const v of G.vehicles) if (v.type === 'police' && !v.dead) cars += 1;
  for (let i = foot; i < wantFoot; i += 1) spawnCop(G);
  for (let i = cars; i < wantCars; i += 1) spawnCopCar(G);

  // Polisi jalan kaki: kejar, tangkap saat sangat dekat.
  for (const c of G.cops) {
    if (c.dead) continue;
    const dx = G.player.x - c.x;
    const dy = G.player.y - c.y;
    const d = Math.hypot(dx, dy);
    const sp = 150 + G.wanted * 14;
    if (d > 8) {
      c.angle = Math.atan2(dy, dx);
      c.x += Math.cos(c.angle) * sp * dt;
      c.y += Math.sin(c.angle) * sp * dt;
    }
    if (d < 26) {
      if (G.player.onFoot) {
        G.events.push('busted');
      } else {
        // Polisi coba menarik pemain keluar mobil.
        c.attackTimer -= dt;
        if (c.attackTimer <= 0) {
          c.attackTimer = 1.2;
          damagePlayer(G, 6);
        }
      }
    }
    // Polisi menembak saat wanted >= 3 dan jarak menengah.
    if (G.wanted >= 3 && d > 120 && d < 420) {
      c.shootTimer -= dt;
      if (c.shootTimer <= 0) {
        c.shootTimer = 1.4 + G.rng.range(0, 0.8);
        G.bullets.push({
          x: c.x, y: c.y, angle: Math.atan2(dy, dx) + G.rng.range(-0.12, 0.12),
          speed: 640, damage: 7, life: 1.2, from: 'cop',
        });
        if (G.audio) G.audio.shoot();
      }
    }
  }
  // Mobil polisi: kejar + tabrak.
  for (const v of G.vehicles) {
    if (v.type !== 'police' || v.dead) continue;
    const dx = G.player.x - v.x;
    const dy = G.player.y - v.y;
    const d = Math.hypot(dx, dy);
    const want = Math.atan2(dy, dx);
    let da = want - v.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    v.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, da));
    const target = d > 60 ? v.top : 120;
    v.speed += Math.sign(target - v.speed) * 300 * dt;
    v.x += Math.cos(v.angle) * v.speed * dt;
    v.y += Math.sin(v.angle) * v.speed * dt;
    // Tabrak pemain.
    if (d < 40 && Math.abs(v.speed) > 100) {
      if (G.player.vehicle && G.player.vehicle !== v) {
        G.player.vehicle.health -= 6;
        v.speed *= 0.5;
        G.shake = Math.max(G.shake, 5);
        if (G.audio) G.audio.crash();
      } else if (G.player.onFoot) {
        damagePlayer(G, 14);
        v.speed *= 0.4;
      }
    }
    if (d > 1600) { v.dead = true; }
  }
  for (let i = G.cops.length - 1; i >= 0; i -= 1) {
    if (G.cops[i].dead) G.cops.splice(i, 1);
  }
  // Sirene saat ada polisi dekat.
  let near = false;
  for (const v of G.vehicles) if (v.type === 'police' && Math.hypot(v.x - G.player.x, v.y - G.player.y) < 700) near = true;
  if (G.audio) G.audio.siren(near && G.wanted > 0);
  // Roadblock sederhana di bintang 4-5.
  if (G.wanted >= 4 && !G.roadblock && G.rng.chance(dt * 0.15)) {
    G.roadblock = { x: G.player.x + 500, y: G.player.y, timer: 25 };
    for (let i = 0; i < 2; i += 1) {
      const v = makeVehicle(G.rng, 'police', G.roadblock.x + i * 60 - 30, G.roadblock.y + (i === 0 ? -40 : 40), Math.PI / 2);
      v.parked = true;
      G.vehicles.push(v);
    }
  }
  if (G.roadblock) {
    G.roadblock.timer -= dt;
    if (G.roadblock.timer <= 0) G.roadblock = null;
  }
}

function spawnCop(G) {
  const a = G.rng.range(0, Math.PI * 2);
  const r = G.rng.range(420, 650);
  G.cops.push({
    x: G.player.x + Math.cos(a) * r, y: G.player.y + Math.sin(a) * r,
    angle: 0, dead: false, attackTimer: 0, shootTimer: G.rng.range(0.5, 1.5),
    health: 40,
  });
}

function spawnCopCar(G) {
  const a = G.rng.range(0, Math.PI * 2);
  const r = G.rng.range(500, 700);
  const v = makeVehicle(G.rng, 'police', G.player.x + Math.cos(a) * r, G.player.y + Math.sin(a) * r, 0);
  v.ai = null;
  G.vehicles.push(v);
}
