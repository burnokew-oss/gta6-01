// Combat: senjata pemain (tinju/pistol/shotgun), peluru, musuh geng,
// partikel (darah, asap, api), dan damage.
import { WEAPONS } from './config.js';

export function makeEnemy(rng, x, y, hp) {
  return {
    x, y, angle: rng.range(0, Math.PI * 2), health: hp || 60,
    dead: false, shootTimer: rng.range(0.5, 1.5), speed: 110,
    color: '#7a2e8a', kind: 'rival',
  };
}

export function spawnEnemies(G, x, y, count, hp) {
  for (let i = 0; i < count; i += 1) {
    G.enemies.push(makeEnemy(G.rng, x + G.rng.range(-90, 90), y + G.rng.range(-90, 90), hp));
  }
}

export function fireWeapon(G) {
  const p = G.player;
  const w = WEAPONS[p.weapon];
  if (!w || p.fireTimer > 0 || p.reloadTimer > 0) return;
  if (p.weapon === 'fist') {
    p.fireTimer = w.rate;
    if (G.audio) G.audio.punch();
    // Tinju: kena musuh/pejalan/polisi dalam jangkauan depan.
    const hx = p.x + Math.cos(p.aimAngle) * 28;
    const hy = p.y + Math.sin(p.aimAngle) * 28;
    let hit = false;
    for (const e of G.enemies) {
      if (!e.dead && Math.hypot(e.x - hx, e.y - hy) < 30) { hurtEnemy(G, e, w.damage); hit = true; }
    }
    for (const c of G.cops) {
      if (!c.dead && Math.hypot(c.x - hx, c.y - hy) < 30) { c.health -= w.damage; hit = true; if (c.health <= 0) { c.dead = true; G.events.push('copKilled'); } }
    }
    for (const ped of G.peds) {
      if (!ped.dead && Math.hypot(ped.x - hx, ped.y - hy) < 30) { ped.dead = true; G.events.push('pedKilled'); hit = true; }
    }
    if (hit) G.events.push('hitLanded');
    return;
  }
  if (p.ammoInMag[p.weapon] <= 0) {
    reloadWeapon(G);
    return;
  }
  p.fireTimer = w.rate;
  p.ammoInMag[p.weapon] -= 1;
  G.shotsFiredTimer = 1.5;
  const pellets = w.pellets || 1;
  for (let i = 0; i < pellets; i += 1) {
    const spread = (G.rng.range(-1, 1) * (w.spread || 0.05));
    G.bullets.push({
      x: p.x + Math.cos(p.aimAngle) * 20, y: p.y + Math.sin(p.aimAngle) * 20,
      angle: p.aimAngle + spread, speed: w.speed, damage: w.damage,
      life: w.range / w.speed, from: 'player',
    });
  }
  // Muzzle flash.
  G.particles.push({ x: p.x + Math.cos(p.aimAngle) * 26, y: p.y + Math.sin(p.aimAngle) * 26, vx: 0, vy: 0, life: 0.06, max: 0.06, size: 10, color: '#ffd23f', kind: 'flash' });
  if (G.audio) G.audio.shoot();
}

export function reloadWeapon(G) {
  const p = G.player;
  const w = WEAPONS[p.weapon];
  if (!w || !w.reload || p.reloadTimer > 0) return;
  const reserve = p.ammo[p.weapon] || 0;
  if (reserve <= 0 || p.ammoInMag[p.weapon] >= w.ammo) return;
  p.reloadTimer = w.reload;
  p.reloadPending = p.weapon;
}

export function updateCombat(G, dt) {
  const p = G.player;
  if (p.reloadPending && p.reloadTimer <= 0) {
    const w = WEAPONS[p.reloadPending];
    const need = w.ammo - p.ammoInMag[p.reloadPending];
    const take = Math.min(need, p.ammo[p.reloadPending]);
    p.ammoInMag[p.reloadPending] += take;
    p.ammo[p.reloadPending] -= take;
    p.reloadPending = null;
  }
  if (G.shotsFiredTimer > 0) G.shotsFiredTimer -= dt;

  // Peluru.
  for (let i = G.bullets.length - 1; i >= 0; i -= 1) {
    const b = G.bullets[i];
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead) {
      if (b.from === 'player') {
        for (const e of G.enemies) {
          if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < 16) { hurtEnemy(G, e, b.damage); dead = true; break; }
        }
        if (!dead) for (const c of G.cops) {
          if (!c.dead && Math.hypot(c.x - b.x, c.y - b.y) < 16) {
            c.health -= b.damage; dead = true;
            if (c.health <= 0) { c.dead = true; G.events.push('copKilled'); }
            break;
          }
        }
        if (!dead) for (const ped of G.peds) {
          if (!ped.dead && Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
            ped.dead = true; dead = true; G.events.push('pedKilled'); break;
          }
        }
      } else {
        if (Math.hypot(G.player.x - b.x, G.player.y - b.y) < 14) {
          damagePlayer(G, b.damage);
          dead = true;
        }
      }
    }
    if (dead) {
      G.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.15, max: 0.15, size: 4, color: '#ffdd55', kind: 'spark' });
      G.bullets.splice(i, 1);
    }
  }

  // Musuh geng: kejar pemain dan menembak.
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = G.player.x - e.x;
    const dy = G.player.y - e.y;
    const d = Math.hypot(dx, dy);
    e.angle = Math.atan2(dy, dx);
    if (d > 140) {
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
    } else if (d > 60) {
      e.x += Math.cos(e.angle) * e.speed * 0.4 * dt;
      e.y += Math.sin(e.angle) * e.speed * 0.4 * dt;
    }
    if (d < 420) {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = 1.3 + G.rng.range(0, 0.9);
        G.bullets.push({
          x: e.x, y: e.y, angle: e.angle + G.rng.range(-0.1, 0.1),
          speed: 620, damage: 8, life: 1.2, from: 'enemy',
        });
        if (G.audio) G.audio.shoot();
      }
    }
  }
  for (let i = G.enemies.length - 1; i >= 0; i -= 1) {
    if (G.enemies[i].dead) G.enemies.splice(i, 1);
  }

  // Partikel.
  for (let i = G.particles.length - 1; i >= 0; i -= 1) {
    const pt = G.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.98; pt.vy *= 0.98;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.skid.length - 1; i >= 0; i -= 1) {
    G.skid[i].life -= dt;
    if (G.skid[i].life <= 0) G.skid.splice(i, 1);
  }
}

function hurtEnemy(G, e, dmg) {
  e.health -= dmg;
  for (let i = 0; i < 6; i += 1) {
    G.particles.push({ x: e.x, y: e.y, vx: G.rng.range(-80, 80), vy: G.rng.range(-80, 80), life: 0.4, max: 0.4, size: 4, color: '#c22e2e', kind: 'blood' });
  }
  if (e.health <= 0) {
    e.dead = true;
    G.events.push('enemyKilled');
    G.cashFloaters.push({ x: e.x, y: e.y, text: '+$25', life: 1 });
    G.player.cash += 25;
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
  G.shake = Math.max(G.shake, 5);
  if (G.player.health <= 0) {
    G.player.health = 0;
    G.events.push('wasted');
  }
}
