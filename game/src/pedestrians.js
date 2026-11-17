// Pejalan kaki: jalan di trotoar, nyebrang di zebra, lari dari bahaya.
// Jumlah aktif dijaga ~40 di sekitar kamera.
import { WORLD } from './config.js';
import { roadLines } from './city.js';

const SHIRTS = ['#d94f4f', '#4f7fd9', '#4fd97a', '#d9c84f', '#9b4fd9', '#e8e8e8', '#333333', '#e08a3c'];

export function makePed(rng, x, y) {
  return {
    x, y, angle: rng.range(0, Math.PI * 2),
    speed: rng.range(45, 75), color: rng.pick(SHIRTS),
    dead: false, fleeing: false, fleeTimer: 0,
    targetAngle: rng.range(0, Math.PI * 2), retarget: rng.range(1, 4),
    onSidewalk: true,
  };
}

export function spawnPeds(G, count) {
  const lines = roadLines();
  for (let i = 0; i < count; i += 1) {
    const vertical = G.rng.chance(0.5);
    const line = G.rng.pick(lines);
    const along = G.rng.range(100, WORLD - 100);
    const side = G.rng.chance(0.5) ? 1 : -1;
    const x = vertical ? line + side * 78 : along;
    const y = vertical ? along : line + side * 78;
    G.peds.push(makePed(G.rng, x, y));
  }
}

export function updatePeds(G, dt) {
  const px = G.player.x; const py = G.player.y;
  for (const ped of G.peds) {
    if (ped.dead) continue;
    // Lari dari tembakan / ledakan / mobil ngebut di dekatnya.
    let threat = null;
    if (G.shotsFiredTimer > 0) threat = { x: px, y: py };
    for (const v of G.vehicles) {
      if (!v.dead && Math.abs(v.speed) > 140 && Math.hypot(v.x - ped.x, v.y - ped.y) < 160) {
        threat = { x: v.x, y: v.y };
        break;
      }
    }
    if (threat) {
      ped.fleeing = true;
      ped.fleeTimer = 2.5;
      ped.targetAngle = Math.atan2(ped.y - threat.y, ped.x - threat.x);
    }
    if (ped.fleeTimer > 0) {
      ped.fleeTimer -= dt;
      if (ped.fleeTimer <= 0) ped.fleeing = false;
    }
    ped.retarget -= dt;
    if (ped.retarget <= 0) {
      ped.retarget = G.rng.range(2, 6);
      // Tetap di trotoar: pilih arah sejajar jalan terdekat.
      const lines = roadLines();
      let best = null; let bestD = Infinity;
      for (const l of lines) {
        const d = Math.min(Math.abs(ped.x - l), Math.abs(ped.y - l));
        if (d < bestD) { bestD = d; best = l; }
      }
      const vertical = Math.abs(ped.x - best) <= Math.abs(ped.y - best);
      const dir = G.rng.chance(0.5) ? 1 : -1;
      ped.targetAngle = vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    }
    const sp = ped.fleeing ? ped.speed * 2.6 : ped.speed;
    let da = ped.targetAngle - ped.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    ped.angle += Math.max(-3 * dt, Math.min(3 * dt, da));
    ped.x += Math.cos(ped.angle) * sp * dt;
    ped.y += Math.sin(ped.angle) * sp * dt;
    ped.x = Math.max(20, Math.min(WORLD - 20, ped.x));
    ped.y = Math.max(20, Math.min(WORLD - 20, ped.y));
  }
  // Bersihkan yang mati/jauh, isi ulang di sekitar pemain.
  for (let i = G.peds.length - 1; i >= 0; i -= 1) {
    const ped = G.peds[i];
    if (ped.dead) { G.peds.splice(i, 1); continue; }
    if (Math.hypot(ped.x - px, ped.y - py) > 1300) G.peds.splice(i, 1);
  }
  while (G.peds.length < 40) {
    const a = G.rng.range(0, Math.PI * 2);
    const r = G.rng.range(500, 900);
    const x = Math.max(60, Math.min(WORLD - 60, px + Math.cos(a) * r));
    const y = Math.max(60, Math.min(WORLD - 60, py + Math.sin(a) * r));
    G.peds.push(makePed(G.rng, x, y));
  }
}
