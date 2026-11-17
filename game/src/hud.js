// HUD: cash/health/armor, bintang wanted, jam, objektif, minimap,
// crosshair, banner misi, dialog, dan menu (title/pause/game over).
import { WEAPONS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function createHud(canvas) {
  const ctx = canvas.getContext('2d');
  const fonts = new Map();
  function font(size) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    return fonts.get(size);
  }
  function text(value, x, y, size, color, align, baseline) {
    ctx.font = font(size);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = baseline || 'alphabetic';
    ctx.fillText(value, x, y);
  }
  function bar(x, y, w, h, ratio, color, bg) {
    ctx.fillStyle = bg || '#111';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, w * Math.min(1, ratio)), h);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x, y, w, h);
  }

  function drawStars(G, x, y) {
    for (let i = 0; i < 5; i += 1) {
      ctx.font = font(26);
      ctx.fillStyle = i < G.wanted ? '#ffd23f' : '#555';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('★', x + i * 28, y);
    }
  }

  function drawMinimap(G) {
    const size = 180;
    const x0 = 14; const y0 = G.viewH - size - 14;
    const scale = size / 3200;
    ctx.fillStyle = 'rgba(10,14,20,0.78)';
    ctx.fillRect(x0 - 4, y0 - 4, size + 8, size + 8);
    ctx.strokeStyle = '#e8e4c8';
    ctx.lineWidth = 1;
    // Jalan.
    ctx.strokeStyle = '#666';
    for (const l of G.city.lines) {
      ctx.beginPath(); ctx.moveTo(x0 + l * scale, y0); ctx.lineTo(x0 + l * scale, y0 + size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y0 + l * scale); ctx.lineTo(x0 + size, y0 + l * scale); ctx.stroke();
    }
    // Air di barat.
    ctx.fillStyle = '#3f8fbf';
    ctx.fillRect(x0, y0, 60 * scale + 20, size);
    function dot(x, y, color, r) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x0 + x * scale, y0 + y * scale, r || 3, 0, Math.PI * 2); ctx.fill();
    }
    // Blip misi.
    const m = G.mission;
    if (m.started && m.index >= 0) {
      const step = (G.missionDefs[m.index] || {}).steps?.[m.step];
      if (step && step.x !== undefined) dot(step.x, step.y, '#ffd23f', 5);
    }
    if (m.taxi) dot(m.taxi.px, m.taxi.py, '#ffd23f', 5);
    for (const v of G.vehicles) {
      if (v.type === 'police') dot(v.x, v.y, '#3f7fff', 2.5);
      else if (v === G.player.vehicle) dot(v.x, v.y, '#fff', 3);
    }
    for (const c of G.cops) dot(c.x, c.y, '#3f7fff', 2);
    for (const e of G.enemies) dot(e.x, e.y, '#ff4f4f', 2.5);
    // Pemain: panah.
    const px = x0 + G.player.x * scale;
    const py = y0 + G.player.y * scale;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(G.player.angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x0 - 4, y0 - 4, size + 8, size + 8);
  }

  function drawHud(G) {
    const W = G.viewW; const H = G.viewH;
    const p = G.player;
    // Kiri atas: cash, health, armor.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(10, 10, 250, 84);
    text(`$${p.cash}`, 20, 40, 26, '#7dff8a', 'left', 'top');
    text('HP', 20, 52, 14, '#fff', 'left', 'top');
    bar(52, 52, 190, 12, p.health / 100, '#e5534b');
    text('ARMOR', 20, 70, 14, '#fff', 'left', 'top');
    bar(52, 70, 190, 12, p.armor / 100, '#7fb5ff');
    // Senjata + ammo.
    const w = WEAPONS[p.weapon];
    text(`${w.name}  ${p.weapon === 'fist' ? '∞' : `${p.ammoInMag[p.weapon]} / ${p.ammo[p.weapon]}`}${p.reloadTimer > 0 ? '  (reload...)' : ''}`, 20, 88, 15, '#fff', 'left', 'top');
    // Kanan atas: wanted + jam.
    drawStars(G, W - 160, 12);
    const hh = Math.floor(G.clock / 60) % 24;
    const mm = Math.floor(G.clock) % 60;
    text(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}  Hari ${G.day}`, W - 16, 52, 20, '#fff', 'right', 'top');
    text(`Misi ${G.mission.index < 0 ? '—' : (G.mission.index + 1) + '/6'}`, W - 16, 78, 15, '#ffd23f', 'right', 'top');
    // Objektif tengah bawah.
    if (G.mission.objective) {
      ctx.font = font(17);
      const tw = ctx.measureText(G.mission.objective).width;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect((W - tw) / 2 - 14, H - 118, tw + 28, 30);
      text(G.mission.objective, W / 2, H - 96, 17, '#fff', 'center', 'top');
    }
    // Speed saat nyetir.
    if (!p.onFoot && p.vehicle) {
      text(`${Math.round(Math.abs(p.vehicle.speed) * 0.36)} km/j`, W - 16, H - 40, 24, '#fff', 'right', 'top');
    }
    // Banner misi.
    if (G.mission.banner) {
      ctx.font = font(30);
      const tw = ctx.measureText(G.mission.banner).width;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect((W - tw) / 2 - 20, 110, tw + 40, 48);
      text(G.mission.banner, W / 2, 146, 30, '#ffd23f', 'center', 'top');
    }
    // Dialog (typewriter).
    const d = G.mission.dialog;
    if (d && d.shown < d.text.length + 60) {
      const shown = d.text.slice(0, Math.floor(d.shown));
      ctx.fillStyle = 'rgba(10,14,20,0.85)';
      ctx.fillRect(W / 2 - 320, H - 210, 640, 84);
      ctx.strokeStyle = '#ffd23f';
      ctx.strokeRect(W / 2 - 320, H - 210, 640, 84);
      text(`${d.speaker}:`, W / 2 - 300, H - 196, 17, '#ffd23f', 'left', 'top');
      // Bungkus teks sederhana.
      const words = shown.split(' ');
      let line = ''; let y = H - 172;
      ctx.font = font(16);
      for (const word of words) {
        if (ctx.measureText(line + word).width > 600) {
          text(line, W / 2 - 300, y, 16, '#fff', 'left', 'top');
          line = ''; y += 20;
        }
        line += word + ' ';
      }
      text(line, W / 2 - 300, y, 16, '#fff', 'left', 'top');
      if (d.shown >= d.text.length) text('Enter — lanjut', W / 2 + 300, H - 196, 13, '#aaa', 'right', 'top');
    }
    // Crosshair saat bersenjata (jalan kaki).
    if (p.onFoot && p.weapon !== 'fist') {
      const mx = G.input.mouse.x; const my = G.input.mouse.y;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 15, my); ctx.lineTo(mx - 6, my);
      ctx.moveTo(mx + 6, my); ctx.lineTo(mx + 15, my);
      ctx.moveTo(mx, my - 15); ctx.lineTo(mx, my - 6);
      ctx.moveTo(mx, my + 6); ctx.lineTo(mx, my + 15);
      ctx.stroke();
    }
    drawMinimap(G);
    // Flash merah saat kena damage.
    if (G.flashRed > 0) {
      ctx.fillStyle = `rgba(200,30,30,${Math.min(0.4, G.flashRed)})`;
      ctx.fillRect(0, 0, W, H);
    }
    // Hint kontrol.
    text('WASD gerak · E masuk mobil · F curi · Klik tembak · R reload · Esc pause · M mute', W / 2, H - 14, 13, 'rgba(255,255,255,0.6)', 'center', 'top');
  }

  function drawPanel(title, lines, prompt) {
    const W = G_VIEW_W(); const H = G_VIEW_H();
    ctx.fillStyle = 'rgba(8,12,20,0.82)';
    ctx.fillRect(0, 0, W, H);
    text(title, W / 2, H / 2 - 120, 54, '#ffd23f', 'center', 'top');
    lines.forEach((line, i) => text(line, W / 2, H / 2 - 40 + i * 30, 19, '#eef1f5', 'center', 'top'));
    text(prompt, W / 2, H / 2 + 90, 20, '#7dff8a', 'center', 'top');
  }
  let viewW = 1280; let viewH = 800;
  function G_VIEW_W() { return viewW; }
  function G_VIEW_H() { return viewH; }

  return {
    setView(w, h) { viewW = w; viewH = h; },
    drawHud, drawPanel,
  };
}
