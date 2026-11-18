// Helikopter polisi "GARUDA-1": muncul di wanted >= 3, terbang mengikuti
// pemain dari atas-belakang, menyorot dengan spotlight, suara rotor,
// dan sedikit guncangan kamera saat dekat. Hilang saat wanted turun.
import { HELI_MIN_WANTED, HELI_SPEED, HELI_HOVER_DIST, HELI_NAME } from './config.js';

export function updateHelicopter(G, dt) {
  if (G.wanted >= HELI_MIN_WANTED) {
    if (!G.heli) {
      const a = G.rng.range(0, Math.PI * 2);
      G.heli = {
        x: G.player.x + Math.cos(a) * 700,
        y: G.player.y + Math.sin(a) * 700,
        angle: 0, rotor: 0, spotAngle: 0,
        name: HELI_NAME, status: 'SPOTLIGHT',
      };
      if (G.audio) G.audio.rotor(true);
    }
    const h = G.heli;
    h.rotor += dt * 28;
    // Terbang ke titik hover di atas-belakang pemain, lalu ikuti.
    const tx = G.player.x - Math.cos(G.player.angle) * HELI_HOVER_DIST;
    const ty = G.player.y - Math.sin(G.player.angle) * HELI_HOVER_DIST;
    const dx = tx - h.x; const dy = ty - h.y;
    const d = Math.hypot(dx, dy);
    const sp = Math.min(HELI_SPEED, 120 + d * 0.6);
    if (d > 8) {
      h.x += (dx / d) * sp * dt;
      h.y += (dy / d) * sp * dt;
    }
    h.angle = Math.atan2(G.player.y - h.y, G.player.x - h.x);
    h.spotAngle = h.angle;
    // Sorot lampu bikin kamera sedikit bergetar saat heli dekat.
    const pd = Math.hypot(G.player.x - h.x, G.player.y - h.y);
    if (pd < 420) G.shake = Math.max(G.shake, 2.5);
  } else if (G.heli) {
    G.heli = null;
    if (G.audio) G.audio.rotor(false);
  }
}
