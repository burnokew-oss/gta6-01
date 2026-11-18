// Renderer: kamera follow + zoom, gambar kota, kendaraan, pejalan, polisi,
// musuh, partikel, dan tint siang/malam. Semua gambar prosedural (rect/circle).
import { COLORS, ROAD_WIDTH, WORLD } from './config.js';
import { SHOP_DEFS } from './shops.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const fonts = new Map();
  function font(size) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px system-ui, sans-serif`);
    return fonts.get(size);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function drawVehicle(v, night) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);
    const halfL = v.len / 2; const halfW = v.wid / 2;
    // Bayangan.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-halfL + 2, -halfW + 2, v.len, v.wid);
    ctx.fillStyle = v.flash > 0 ? '#ffffff' : v.color;
    ctx.fillRect(-halfL, -halfW, v.len, v.wid);
    // Kaca depan + atap.
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(-halfL + 6, -halfW + 3, 12, v.wid - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-4, -halfW + 4, 14, v.wid - 8);
    // Lampu depan (malam).
    if (night) {
      ctx.fillStyle = '#fff8c0';
      ctx.fillRect(halfL - 2, -halfW + 2, 4, 6);
      ctx.fillRect(halfL - 2, halfW - 8, 4, 6);
    } else {
      ctx.fillStyle = '#fff8c0';
      ctx.fillRect(halfL - 2, -halfW + 2, 3, 5);
      ctx.fillRect(halfL - 2, halfW - 7, 3, 5);
    }
    ctx.fillStyle = '#c22e2e';
    ctx.fillRect(-halfL, -halfW + 2, 3, 5);
    ctx.fillRect(-halfL, halfW - 7, 3, 5);
    if (v.type === 'police') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-halfL + 2, -halfW, v.len - 4, 6);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(-2, -halfW - 3, 5, 5);
      ctx.fillStyle = '#3f7fff';
      ctx.fillRect(4, -halfW - 3, 5, 5);
    }
    if (v.type === 'taxi') {
      ctx.fillStyle = '#111';
      ctx.font = font(9);
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, 3);
    }
    ctx.restore();
    // Asap saat rusak.
    if (v.smoking) {
      ctx.fillStyle = 'rgba(120,120,120,0.6)';
      ctx.beginPath(); ctx.arc(v.x - Math.cos(v.angle) * v.len / 2, v.y - Math.sin(v.angle) * v.len / 2, 8, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawPerson(x, y, angle, color, radius, armed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(2, 3, radius, radius * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(radius * 0.7, 0, radius * 0.55, 0, Math.PI * 2); ctx.fill();
    if (armed) {
      ctx.fillStyle = '#222';
      ctx.fillRect(radius * 0.5, -2, 14, 4);
    }
    ctx.restore();
  }

  function drawWorld(G) {
    const cam = G.camera;
    const vw = G.viewW / cam.zoom;
    const vh = G.viewH / cam.zoom;
    const x0 = cam.x - vw / 2; const y0 = cam.y - vh / 2;
    const x1 = cam.x + vw / 2; const y1 = cam.y + vh / 2;
    const night = G.clock >= 19 * 60 || G.clock < 6 * 60;

    // Latar: rumput, pantai barat (pasir + air).
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(x0, y0, vw, vh);
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(Math.max(x0, 0), y0, 220 - Math.max(x0, 0), vh);
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(x0, y0, Math.min(120, 120 - x0), vh);

    // Trotoar + jalan.
    ctx.fillStyle = '#9a9a92';
    for (const l of G.city.lines) {
      ctx.fillRect(l - ROAD_WIDTH / 2 - 14, y0, ROAD_WIDTH + 28, vh);
      ctx.fillRect(x0, l - ROAD_WIDTH / 2 - 14, vw, ROAD_WIDTH + 28);
    }
    ctx.fillStyle = COLORS.road;
    for (const l of G.city.lines) {
      ctx.fillRect(l - ROAD_WIDTH / 2, y0, ROAD_WIDTH, vh);
      ctx.fillRect(x0, l - ROAD_WIDTH / 2, vw, ROAD_WIDTH);
    }
    // Marka jalan putus-putus.
    ctx.fillStyle = COLORS.roadLine;
    for (const l of G.city.lines) {
      for (let s = 0; s < WORLD; s += 90) {
        if (s < y1 && s + 40 > y0) ctx.fillRect(l - 2, s, 4, 40);
        if (s < x1 && s + 40 > x0) ctx.fillRect(s, l - 2, 40, 4);
      }
    }
    // Zebra di persimpangan.
    ctx.fillStyle = '#eee';
    for (const lx of G.city.lines) {
      for (const ly of G.city.lines) {
        for (let i = -3; i <= 3; i += 1) {
          ctx.fillRect(lx + i * 14 - 5, ly - ROAD_WIDTH / 2 + 6, 10, 16);
        }
      }
    }
    // Kontainer pelabuhan.
    for (const c of G.city.containers) {
      if (c.x < x0 - 100 || c.x > x1 + 100 || c.y < y0 - 100 || c.y > y1 + 100) continue;
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    }
    // Bangunan.
    for (const b of G.city.buildings) {
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 8);
      // Jendela.
      ctx.fillStyle = night ? '#ffd23f' : '#2a3542';
      const cols = Math.max(1, Math.floor(b.w / 26));
      const rows = Math.max(1, Math.floor(b.h / 26));
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          if ((i + j) % 2 === 0) ctx.fillRect(b.x + 8 + i * 26, b.y + 10 + j * 26, 10, 12);
        }
      }
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 6);
      }
    }
    // Pohon.
    for (const t of G.city.trees) {
      if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
      ctx.fillStyle = '#2e6b34';
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a8a4f';
      ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    // Lampu jalan (nyala malam).
    for (const l of G.city.lamps) {
      if (l.x < x0 || l.x > x1 || l.y < y0 || l.y > y1) continue;
      ctx.fillStyle = '#555';
      ctx.fillRect(l.x - 2, l.y - 2, 4, 4);
      if (night) {
        ctx.fillStyle = 'rgba(255,220,120,0.25)';
        ctx.beginPath(); ctx.arc(l.x, l.y, 26, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Skid marks.
    ctx.strokeStyle = 'rgba(20,20,20,0.5)';
    ctx.lineWidth = 4;
    for (const s of G.skid) {
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(s.angle) * 10, s.y - Math.sin(s.angle) * 10);
      ctx.lineTo(s.x + Math.cos(s.angle) * 10, s.y + Math.sin(s.angle) * 10);
      ctx.stroke();
    }
    // Kerang Teluk (kolektibel): titik emas kecil di pinggir jalan.
    if (G.shells) {
      for (const s of G.shells) {
        if (s.taken) continue;
        if (s.x < x0 - 20 || s.x > x1 + 20 || s.y < y0 - 20 || s.y > y1 + 20) continue;
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff8c0';
        ctx.beginPath(); ctx.arc(s.x - 2, s.y - 2, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Marker toko / safehouse / garage (lingkaran + huruf).
    for (const s of SHOP_DEFS) {
      if (s.x < x0 - 60 || s.x > x1 + 60 || s.y < y0 - 60 || s.y > y1 + 60) continue;
      const pulse = 26 + Math.sin(G.time * 3) * 4;
      ctx.fillStyle = 'rgba(10,14,20,0.75)';
      ctx.beginPath(); ctx.arc(s.x, s.y, pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7dff8a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.x, s.y, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#7dff8a';
      ctx.font = font(20);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.icon, s.x, s.y + 1);
      ctx.fillStyle = '#fff';
      ctx.font = font(12);
      ctx.fillText(s.name, s.x, s.y + pulse + 14);
    }
    // Marker rute misi (titik bernomor) + target ekor (M8).
    const m = G.mission;
    if (m.started && m.index >= 0) {
      const step = G.missionDefs[m.index].steps[m.step];
      if (step && step.type === 'route') {
        step.points.forEach((pt, i) => {
          const done = i < m.routeIndex;
          ctx.strokeStyle = done ? '#7dff8a' : '#ffd23f';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 34, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = done ? '#7dff8a' : '#ffd23f';
          ctx.font = font(18);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), pt.x, pt.y);
        });
      }
      if (step && step.type === 'tail' && m.tail) {
        const tv = m.tail.vehicle;
        ctx.strokeStyle = '#ff4f4f';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(tv.x, tv.y, 44, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ff4f4f';
        ctx.font = font(12);
        ctx.textAlign = 'center';
        ctx.fillText('TARGET', tv.x, tv.y - 52);
      }
    }
    if (m.started && m.index >= 0) {
      const step = G.missionDefs[m.index].steps[m.step];
      if (step && step.x !== undefined) {
        const pulse = 60 + Math.sin(G.time * 4) * 10;
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(step.x, step.y, pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.arc(step.x, step.y, 8, 0, Math.PI * 2); ctx.fill();
      }
      if (m.race) {
        const cp = m.race.checkpoints[m.race.next];
        if (cp) {
          ctx.strokeStyle = '#7dff8a';
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(cp.x, cp.y, 70, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
    if (m.taxi) {
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(m.taxi.px, m.taxi.py, 40, 0, Math.PI * 2); ctx.stroke();
    }
    // Panah arah ke objektif (di tepi layar).
    // Kendaraan.
    for (const v of G.vehicles) {
      if (v.x < x0 - 80 || v.x > x1 + 80 || v.y < y0 - 80 || v.y > y1 + 80) continue;
      drawVehicle(v, night);
    }
    // Pejalan kaki.
    for (const ped of G.peds) {
      if (ped.dead) continue;
      if (ped.x < x0 || ped.x > x1 || ped.y < y0 || ped.y > y1) continue;
      drawPerson(ped.x, ped.y, ped.angle, ped.color, 9, false);
    }
    // Polisi jalan kaki.
    for (const c of G.cops) {
      if (c.dead) continue;
      drawPerson(c.x, c.y, c.angle, '#1c2f6e', 10, true);
      if (c.health < 40) {
        ctx.fillStyle = '#111'; ctx.fillRect(c.x - 14, c.y - 22, 28, 4);
        ctx.fillStyle = '#e5534b'; ctx.fillRect(c.x - 14, c.y - 22, 28 * (c.health / 40), 4);
      }
    }
    // Musuh geng.
    for (const e of G.enemies) {
      if (e.dead) continue;
      drawPerson(e.x, e.y, e.angle, e.color, 10, true);
      ctx.fillStyle = '#111'; ctx.fillRect(e.x - 16, e.y - 24, 32, 5);
      ctx.fillStyle = '#e5534b'; ctx.fillRect(e.x - 16, e.y - 24, 32 * Math.max(0, e.health / 60), 5);
    }
    // Helikopter polisi: bayangan di tanah + badan + rotor + sorot lampu.
    if (G.heli) {
      const h = G.heli;
      // Bayangan (di tanah, sedikit bergeser dari posisi heli).
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(h.x + 26, h.y + 34, 34, 20, h.angle, 0, Math.PI * 2); ctx.fill();
      // Sorot lampu: kerucut kuning tembus pandang dari heli ke pemain.
      const px = G.player.x; const py = G.player.y;
      const grad = ctx.createLinearGradient(h.x, h.y, px, py);
      grad.addColorStop(0, 'rgba(255,240,150,0.28)');
      grad.addColorStop(1, 'rgba(255,240,150,0.10)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      const perp = h.spotAngle + Math.PI / 2;
      ctx.moveTo(h.x + Math.cos(perp) * 8, h.y + Math.sin(perp) * 8);
      ctx.lineTo(h.x - Math.cos(perp) * 8, h.y - Math.sin(perp) * 8);
      ctx.lineTo(px - Math.cos(perp) * 46, py - Math.sin(perp) * 46);
      ctx.lineTo(px + Math.cos(perp) * 46, py + Math.sin(perp) * 46);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,150,0.30)';
      ctx.beginPath(); ctx.arc(px, py, 52, 0, Math.PI * 2); ctx.fill();
      // Badan heli.
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.angle);
      ctx.fillStyle = '#1c2f6e';
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f7fff';
      ctx.beginPath(); ctx.arc(16, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c2f6e';
      ctx.fillRect(-52, -3, 26, 6);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(-6, -20, 5, 5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(2, -20, 5, 5);
      // Rotor berputar.
      ctx.strokeStyle = 'rgba(20,20,20,0.85)';
      ctx.lineWidth = 3;
      const ra = h.rotor;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ra) * -44, Math.sin(ra) * -44);
      ctx.lineTo(Math.cos(ra) * 44, Math.sin(ra) * 44);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(Math.cos(ra + Math.PI / 2) * -44, Math.sin(ra + Math.PI / 2) * -44);
      ctx.lineTo(Math.cos(ra + Math.PI / 2) * 44, Math.sin(ra + Math.PI / 2) * 44);
      ctx.stroke();
      ctx.restore();
      ctx.font = font(12);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('POLISI UDARA', h.x, h.y - 52);
    }
    // Peluru.
    ctx.fillStyle = '#ffd23f';
    for (const b of G.bullets) {
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Partikel.
    for (const pt of G.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.max + 0.3), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Pemain.
    const p = G.player;
    if (p.onFoot) {
      drawPerson(p.x, p.y, p.aimAngle, '#2e6fb5', 11, p.weapon !== 'fist');
      // Arah bidik.
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.aimAngle) * 16, p.y + Math.sin(p.aimAngle) * 16);
      ctx.lineTo(p.x + Math.cos(p.aimAngle) * 30, p.y + Math.sin(p.aimAngle) * 30);
      ctx.stroke();
    }
    // Cash floaters.
    ctx.font = font(15);
    ctx.textAlign = 'center';
    for (const f of G.cashFloaters) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = '#7dff8a';
      ctx.fillText(f.text, f.x, f.y - (1 - f.life) * 30);
    }
    ctx.globalAlpha = 1;
    // Tint siang/malam.
    if (night) {
      ctx.fillStyle = 'rgba(10,16,60,0.32)';
      ctx.fillRect(x0, y0, vw, vh);
    } else if (G.clock >= 17 * 60 && G.clock < 19 * 60) {
      ctx.fillStyle = 'rgba(255,140,60,0.10)';
      ctx.fillRect(x0, y0, vw, vh);
    }
  }

  function draw(G, screen) {
    const cam = G.camera;
    const shakeX = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
    const shakeY = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const zoom = cam.zoom;
    ctx.setTransform(zoom, 0, 0, zoom, G.viewW / 2 - cam.x * zoom + shakeX, G.viewH / 2 - cam.y * zoom + shakeY);
    drawWorld(G);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Garis kecepatan saat NOS aktif: streak putih dari tepi layar.
    if (G.nosBoost) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      const cx = G.viewW / 2; const cy = G.viewH / 2;
      for (let i = 0; i < 14; i += 1) {
        const a = (i / 14) * Math.PI * 2 + G.time * 0.7;
        const r1 = Math.min(G.viewW, G.viewH) * 0.42;
        const r2 = r1 + 60 + (i % 3) * 26;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }
    }
  }

  return { draw, resize };
}
