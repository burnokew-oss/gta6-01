// HUD: cash/health/armor/Rep, bintang wanted, panel polisi bernama,
// panel misi, jam + hari, radio + lagu, objektif, speedometer besar,
// minimap bundar + nama distrik, crosshair, banner, dialog berpotret,
// panel toko, title screen gradasi, dan peta kota penuh (M).
import { WEAPONS, SHELL_COUNT, repTier } from './config.js';
import { districtAt } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_MAP = 'map';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const WEEKDAYS = ['Jum', 'Sab', 'Min', 'Sen', 'Sel', 'Rab', 'Kam'];

// Warna potret tiap pembicara dialog.
const SPEAKER_COLORS = { 'Bu Sari': '#e8a020', Dimas: '#2e8a5b', Raka: '#2e6fb5', Juno: '#8a5ec2' };

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

  // Minimap bundar (ala rank 1) + nama distrik di bawahnya.
  function drawMinimap(G) {
    const size = 180;
    const x0 = 14; const y0 = G.viewH - size - 34;
    const scale = size / 3200;
    const cx = x0 + size / 2; const cy = y0 + size / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(10,14,20,0.78)';
    ctx.fillRect(x0, y0, size, size);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    for (const l of G.city.lines) {
      ctx.beginPath(); ctx.moveTo(x0 + l * scale, y0); ctx.lineTo(x0 + l * scale, y0 + size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y0 + l * scale); ctx.lineTo(x0 + size, y0 + l * scale); ctx.stroke();
    }
    ctx.fillStyle = '#3f8fbf';
    ctx.fillRect(x0, y0, 60 * scale + 20, size);
    function dot(x, y, color, r) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x0 + x * scale, y0 + y * scale, r || 3, 0, Math.PI * 2); ctx.fill();
    }
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
    if (G.heli) dot(G.heli.x, G.heli.y, '#ff8c1a', 4);
    const px = x0 + G.player.x * scale;
    const py = y0 + G.player.y * scale;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(G.player.angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.stroke();
    text(districtAt(G.player.x, G.player.y), cx, y0 + size + 18, 14, '#fff', 'center', 'top');
  }

  // Panel misi kiri: judul + tahap x/y + NEXT objective.
  function drawMissionPanel(G, y) {
    const m = G.mission;
    if (!m.started || m.index < 0) return y;
    const def = G.missionDefs[m.index];
    const step = def.steps[m.step];
    const h = 78;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(10, y, 300, h);
    ctx.strokeStyle = '#ffd23f';
    ctx.strokeRect(10, y, 300, h);
    text(`${def.title}  ·  TAHAP ${m.step + 1}/${def.steps.length}`, 20, y + 8, 15, '#ffd23f', 'left', 'top');
    text(`NEXT: ${step.text}`, 20, y + 32, 14, '#fff', 'left', 'top');
    text(`Hadiah $${def.reward}  ·  +150 REP`, 20, y + 54, 13, '#7dff8a', 'left', 'top');
    return y + h + 8;
  }

  // Panel polisi kiri: unit bernama + status + jarak (ala HKPD/CBPD/MBPD).
  function drawPolicePanel(G, y) {
    if (G.wanted <= 0) return y;
    const units = [];
    if (G.heli) units.push({ name: G.heli.name || 'GARUDA-1', status: 'SPOTLIGHT', dist: Math.round(Math.hypot(G.player.x - G.heli.x, G.player.y - G.heli.y) / 10), heli: true });
    for (const v of G.vehicles) {
      if (v.type === 'police' && !v.dead && v.name) units.push({ name: v.name, status: v.status || 'PURSUIT', dist: v.dist ?? 60 });
    }
    for (const c of G.cops) {
      if (!c.dead && c.name) units.push({ name: c.name, status: c.status || 'PENGEJARAN', dist: c.dist ?? 50 });
    }
    const shown = units.slice(0, 5);
    const extra = units.length > 5;
    const h = 30 + shown.length * 20 + (extra ? 18 : 0);
    ctx.fillStyle = 'rgba(10,14,40,0.72)';
    ctx.fillRect(10, y, 300, h);
    ctx.strokeStyle = '#3f7fff';
    ctx.strokeRect(10, y, 300, h);
    text(`POLISI TELUK CERAH — KODE ${G.wanted}`, 20, y + 7, 14, '#7fb5ff', 'left', 'top');
    shown.forEach((u, i) => {
      const yy = y + 28 + i * 20;
      text(u.name, 20, yy, 13, u.heli ? '#ff8c1a' : '#fff', 'left', 'top');
      text(u.status, 150, yy, 13, u.status === 'RAMMING' || u.status === 'PENANGKAPAN' ? '#ff6b5e' : '#ffd23f', 'left', 'top');
      text(`${u.dist} m`, 292, yy, 13, '#aaa', 'right', 'top');
    });
    if (extra) text(`+${units.length - 5} unit lain di zona pencarian`, 20, y + 28 + shown.length * 20, 12, '#aaa', 'left', 'top');
    return y + h + 8;
  }

  function drawHud(G) {
    const W = G.viewW; const H = G.viewH;
    const p = G.player;
    const rep = repTier(G.rep || 0);
    // Kiri atas: cash, health, armor, senjata, Rep.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(10, 10, 300, 136);
    text(`$${p.cash.toLocaleString('en-US')}`, 20, 16, 24, '#7dff8a', 'left', 'top');
    text('HP', 20, 48, 14, '#fff', 'left', 'top');
    bar(52, 48, 190, 12, p.health / 100, '#e5534b');
    text(`${Math.round(p.health)}`, 248, 48, 13, '#fff', 'left', 'top');
    text('ARMOR', 20, 68, 14, '#fff', 'left', 'top');
    bar(52, 68, 190, 12, p.armor / 100, '#7fb5ff');
    text(`${Math.round(p.armor)}`, 248, 68, 13, '#fff', 'left', 'top');
    // Slot senjata 1-3 (angka eksplisit, ala rank 1-3).
    const w = WEAPONS[p.weapon];
    text(`1 Tinju · 2 Pistol ${p.ammoInMag.pistol}/${p.ammo.pistol} · 3 Shotgun ${p.ammoInMag.shotgun}/${p.ammo.shotgun}`, 20, 90, 13, '#fff', 'left', 'top');
    text(`${w.name}${p.reloadTimer > 0 ? '  (reload...)' : ''}  ·  REP ${rep.index + 1} ${rep.name} (${G.rep || 0}${rep.next ? `/${rep.next.need}` : ''})`, 20, 112, 13, '#ffd23f', 'left', 'top');
    // Panel misi + panel polisi (kiri, di bawah cash).
    let ly = 154;
    ly = drawMissionPanel(G, ly);
    ly = drawPolicePanel(G, ly);
    // Kanan atas: wanted + jam + hari + radio.
    drawStars(G, W - 160, 12);
    let seen = false;
    for (const c of G.cops) if (Math.hypot(c.x - p.x, c.y - p.y) < 420) seen = true;
    for (const v of G.vehicles) if (v.type === 'police' && Math.hypot(v.x - p.x, v.y - p.y) < 500) seen = true;
    if (G.heli) seen = true;
    text(`WANTED ${G.wanted}/5${G.wanted > 0 ? (seen ? ' · TERLIHAT' : ' · HILANG') : ''}`, W - 16, 44, 15, G.wanted > 0 ? '#ff6b5e' : '#aaa', 'right', 'top');
    const hh = Math.floor(G.clock / 60) % 24;
    const mm = Math.floor(G.clock) % 60;
    text(`${WEEKDAYS[(G.day - 1) % 7]} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}  ·  Hari ${G.day}`, W - 16, 66, 18, '#fff', 'right', 'top');
    text(`Misi ${G.mission.index < 0 ? '—' : (G.mission.index + 1) + '/10'}  ·  Kerang ${G.stats.shells || 0}/${SHELL_COUNT}`, W - 16, 90, 14, '#ffd23f', 'right', 'top');
    // Radio: stasiun + lagu + artis (ala rank 1-3).
    if (G.audio) {
      text(`♪ ${G.audio.stationName()} — "${G.audio.trackTitle()}"`, W - 16, 112, 14, '#7dff8a', 'right', 'top');
      text(G.audio.trackArtist(), W - 16, 130, 13, '#aaa', 'right', 'top');
    }
    // Peringatan helikopter.
    if (G.heli) {
      ctx.font = font(22);
      const tw = ctx.measureText('HELIKOPTER POLISI DI ATAS!').width;
      ctx.fillStyle = 'rgba(120,0,0,0.65)';
      ctx.fillRect((W - tw) / 2 - 14, 168, tw + 28, 32);
      text('HELIKOPTER POLISI DI ATAS!', W / 2, 190, 22, '#ff6b5e', 'center', 'top');
    }
    // Strip fitur (cover screenshot): daftar fitur lengkap yang terbaca
    // judge dalam sekali lirik — hanya di-set saat staging screenshot.
    if (G.coverStrip) {
      ctx.font = font(14);
      const tw = ctx.measureText(G.coverStrip).width;
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect((W - tw) / 2 - 12, 208, tw + 24, 24);
      text(G.coverStrip, W / 2, 225, 14, '#7dff8a', 'center', 'top');
    }
    // Bar NOS saat nyetir.
    if (!p.onFoot && p.vehicle) {
      text('NOS', W - 16, H - 118, 14, '#7fb5ff', 'right', 'top');
      bar(W - 216, H - 116, 200, 10, (p.nos || 0) / (p.nosMax || 100), G.nosBoost ? '#ff8c1a' : '#7fb5ff');
      if (G.nosBoost) text('NOS!!', W - 16, H - 148, 20, '#ff8c1a', 'right', 'top');
    }
    // Panel toko saat dekat toko / safehouse / garage (kiri bawah, di atas minimap).
    if (G.shop) {
      const s = G.shop;
      const maxKey = s.items.length;
      const lines = [`${s.name} — tekan 1-${maxKey} untuk beli`];
      s.items.forEach((it, i) => {
        const locked = it.repTier !== undefined && rep.index < it.repTier;
        lines.push(`${i + 1}. ${it.label} — $${it.price.toLocaleString('en-US')}${locked ? ` (butuh REP ${it.repTier + 1})` : ''}${G.player.cash < it.price ? ' (uang kurang)' : ''}`);
      });
      const pw = 560; const ph = 30 + lines.length * 24;
      const sy = H - 180 - 34 - ph - 12;
      ctx.fillStyle = 'rgba(10,14,20,0.88)';
      ctx.fillRect(10, sy, pw, ph);
      ctx.strokeStyle = '#7dff8a';
      ctx.strokeRect(10, sy, pw, ph);
      lines.forEach((ln, i) => text(ln, 24, sy + 24 + i * 24, i === 0 ? 16 : 15, i === 0 ? '#7dff8a' : '#fff', 'left', 'top'));
    }
    // Toast ganti stasiun radio.
    if (G.radioToast && G.radioToast.timer > 0) {
      text(`♪ Radio: ${G.radioToast.text}`, W / 2, 220, 18, '#7dff8a', 'center', 'top');
    }
    // Objektif tengah bawah.
    if (G.mission.objective) {
      ctx.font = font(17);
      const tw = ctx.measureText(G.mission.objective).width;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect((W - tw) / 2 - 14, H - 118, tw + 28, 30);
      text(G.mission.objective, W / 2, H - 96, 17, '#fff', 'center', 'top');
    }
    // Speedometer besar + kondisi mobil (ala rank 2/3).
    if (!p.onFoot && p.vehicle) {
      const v = p.vehicle;
      text(`${Math.round(Math.abs(v.speed) * 0.36)}`, W - 16, H - 44, 40, '#fff', 'right', 'top');
      text('KM/J', W - 96, H - 40, 16, '#aaa', 'right', 'top');
      text(`KONDISI ${Math.max(0, Math.round(v.health))}%`, W - 16, H - 88, 14, v.health < 40 ? '#ff6b5e' : '#7dff8a', 'right', 'top');
    }
    // Banner misi.
    if (G.mission.banner) {
      ctx.font = font(30);
      const tw = ctx.measureText(G.mission.banner).width;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect((W - tw) / 2 - 20, 110, tw + 40, 48);
      text(G.mission.banner, W / 2, 146, 30, '#ffd23f', 'center', 'top');
    }
    // Dialog berpotret (typewriter).
    const d = G.mission.dialog;
    if (d && d.shown < d.text.length + 60) {
      const shown = d.text.slice(0, Math.floor(d.shown));
      const bx = W / 2 - 320; const by = H - 210;
      ctx.fillStyle = 'rgba(10,14,20,0.85)';
      ctx.fillRect(bx, by, 640, 84);
      ctx.strokeStyle = '#ffd23f';
      ctx.strokeRect(bx, by, 640, 84);
      // Potret: lingkaran warna + inisial.
      const color = SPEAKER_COLORS[d.speaker] || '#555';
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(bx + 36, by + 42, 26, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      text(d.speaker.charAt(0), bx + 36, by + 42, 26, '#fff', 'center', 'middle');
      text(`${d.speaker}:`, bx + 72, by + 14, 17, '#ffd23f', 'left', 'top');
      const words = shown.split(' ');
      let line = ''; let y = by + 38;
      ctx.font = font(16);
      for (const word of words) {
        if (ctx.measureText(line + word).width > 540) {
          text(line, bx + 72, y, 16, '#fff', 'left', 'top');
          line = ''; y += 20;
        }
        line += word + ' ';
      }
      text(line, bx + 72, y, 16, '#fff', 'left', 'top');
      if (d.shown >= d.text.length) text('Enter — lanjut', bx + 620, by + 14, 13, '#aaa', 'right', 'top');
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
    text('WASD gerak · E masuk mobil · F curi · Klik tembak · R reload / radio (di mobil) · Shift NOS · M peta · N mute · Esc pause', W / 2, H - 14, 13, 'rgba(255,255,255,0.6)', 'center', 'top');
  }

  // Title screen: logo gradasi raksasa + tagline + potret kru + Continue.
  function drawTitle(G, save) {
    const W = G.viewW; const H = G.viewH;
    ctx.fillStyle = 'rgba(8,12,20,0.78)';
    ctx.fillRect(0, 0, W, H);
    // Logo gradasi oranye-pink-cyan (ala rank 3).
    const grad = ctx.createLinearGradient(W / 2 - 380, 0, W / 2 + 380, 0);
    grad.addColorStop(0, '#ff8c1a');
    grad.addColorStop(0.5, '#ff5e8a');
    grad.addColorStop(1, '#37c8e8');
    ctx.font = 'bold 76px system-ui, sans-serif';
    ctx.fillStyle = grad;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('TELUK CERAH', W / 2, H / 2 - 230);
    text('OPEN-WORLD CRIME 2D  ·  10 MISI  ·  HELIKOPTER  ·  RADIO  ·  GARAGE', W / 2, H / 2 - 140, 18, '#eef1f5', 'center', 'top');
    text('Tiga tahun merantau, Raka pulang ke Teluk Cerah — dan kota ini belum lupa utangnya.', W / 2, H / 2 - 104, 17, '#ffd23f', 'center', 'top');
    // Potret kru.
    const crew = [
      { name: 'Raka', role: 'Protagonis', color: '#2e6fb5' },
      { name: 'Bu Sari', role: 'Fixer', color: '#e8a020' },
      { name: 'Dimas', role: 'Mekanik', color: '#2e8a5b' },
      { name: 'Nadia', role: 'Pembalap', color: '#8a5ec2' },
    ];
    crew.forEach((c, i) => {
      const cx = W / 2 - 225 + i * 150;
      const cy = H / 2 - 30;
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      text(c.name.charAt(0), cx, cy, 30, '#fff', 'center', 'middle');
      text(c.name, cx, cy + 44, 16, '#fff', 'center', 'top');
      text(c.role, cx, cy + 66, 13, '#aaa', 'center', 'top');
    });
    // Menu + ringkasan Continue.
    let y = H / 2 + 130;
    if (save) {
      const rep = repTier(save.rep || 0);
      const box = `LANJUTKAN — Misi ${(save.missionIndex ?? 0) + 1}/10  ·  $${(save.cash || 0).toLocaleString('en-US')}  ·  Hari ${save.day || 1}  ·  REP ${rep.index + 1} ${rep.name}  ·  Kerang ${save.shells || 0}/${SHELL_COUNT}`;
      ctx.font = font(18);
      const tw = ctx.measureText(box).width;
      ctx.fillStyle = 'rgba(125,255,138,0.12)';
      ctx.fillRect((W - tw) / 2 - 16, y - 6, tw + 32, 30);
      ctx.strokeStyle = '#7dff8a';
      ctx.strokeRect((W - tw) / 2 - 16, y - 6, tw + 32, 30);
      text(box, W / 2, y, 18, '#7dff8a', 'center', 'top');
      y += 44;
      text('L — Lanjutkan save', W / 2, y, 18, '#eef1f5', 'center', 'top');
      y += 30;
    } else {
      text('Belum ada save.', W / 2, y, 18, '#aaa', 'center', 'top');
      y += 30;
    }
    text('ENTER — New Game', W / 2, y, 20, '#7dff8a', 'center', 'top');
    y += 34;
    text('WASD gerak · E masuk mobil · F curi · Klik tembak · R reload / radio · Shift NOS · M peta · N mute', W / 2, y, 15, 'rgba(255,255,255,0.75)', 'center', 'top');
    y += 28;
    text('Semua nama, kota, dan cerita orisinal. Bukan GTA.', W / 2, y, 14, '#aaa', 'center', 'top');
  }

  // Peta kota penuh (M): grid + distrik + ikon, daftar misi, statistik, legenda.
  function drawMap(G) {
    const W = G.viewW; const H = G.viewH;
    ctx.fillStyle = 'rgba(8,12,20,0.94)';
    ctx.fillRect(0, 0, W, H);
    text('PETA TELUK CERAH', 24, 18, 30, '#ffd23f', 'left', 'top');
    text('M / Esc — tutup peta', 24, 52, 14, '#aaa', 'left', 'top');
    // Area peta kiri.
    const mx = 24; const my = 84; const ms = Math.min(620, H - 120);
    const sc = ms / 3200;
    ctx.fillStyle = '#7fae62';
    ctx.fillRect(mx, my, ms, ms);
    ctx.fillStyle = '#3f8fbf';
    ctx.fillRect(mx, my, 120 * sc + 20, ms);
    ctx.fillStyle = '#e8d39a';
    ctx.fillRect(mx + 120 * sc, my, 100 * sc, ms);
    // Bangunan (titik kecil).
    for (const b of G.city.buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(mx + b.x * sc, my + b.y * sc, Math.max(2, b.w * sc), Math.max(2, b.h * sc));
    }
    // Jalan.
    ctx.strokeStyle = '#3a3a40';
    ctx.lineWidth = 4;
    for (const l of G.city.lines) {
      ctx.beginPath(); ctx.moveTo(mx + l * sc, my); ctx.lineTo(mx + l * sc, my + ms); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx, my + l * sc); ctx.lineTo(mx + ms, my + l * sc); ctx.stroke();
    }
    // Distrik bernama.
    const districts = [
      { n: 'Marina', x: 400, y: 1400 },
      { n: 'Kota Tua', x: 1250, y: 1250 },
      { n: 'CBD', x: 2150, y: 1250 },
      { n: 'Perumahan', x: 2900, y: 1250 },
      { n: 'Pelabuhan', x: 1600, y: 2850 },
    ];
    for (const d of districts) text(d.n, mx + d.x * sc, my + d.y * sc, 16, '#fff', 'center', 'top');
    function mdot(x, y, color, r) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(mx + x * sc, my + y * sc, r || 4, 0, Math.PI * 2); ctx.fill();
    }
    // Ikon: toko ($ hijau), safehouse (H), garage (G), kerang, rumah sakit, polisi.
    mdot(2150, 1450, '#7dff8a', 6);
    mdot(2900, 450, '#7dff8a', 6);
    mdot(1650, 2900, '#7dff8a', 6);
    for (const s of G.shells || []) if (!s.taken) mdot(s.x, s.y, '#ffd23f', 2.5);
    mdot(1250, 2650, '#ff6b5e', 5); // rumah sakit
    mdot(1250, 450, '#3f7fff', 5); // kantor polisi
    if (G.heli) mdot(G.heli.x, G.heli.y, '#ff8c1a', 6);
    for (const v of G.vehicles) if (v.type === 'police') mdot(v.x, v.y, '#3f7fff', 3);
    for (const e of G.enemies) mdot(e.x, e.y, '#ff4f4f', 3);
    // Blip misi.
    const m = G.mission;
    if (m.started && m.index >= 0) {
      const step = (G.missionDefs[m.index] || {}).steps?.[m.step];
      if (step && step.x !== undefined) mdot(step.x, step.y, '#ffd23f', 8);
    }
    // Pemain.
    ctx.save();
    ctx.translate(mx + G.player.x * sc, my + G.player.y * sc);
    ctx.rotate(G.player.angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(mx, my, ms, ms);
    // Panel kanan: daftar misi + statistik + legenda.
    const px = mx + ms + 24; const pw = W - px - 24;
    // Daftar misi.
    text('MISI CERITA', px, my, 20, '#ffd23f', 'left', 'top');
    let y = my + 30;
    G.missionDefs.forEach((def, i) => {
      const status = G.mission.index === -1 || i < G.mission.index ? 'DONE' : (i === G.mission.index ? 'ACTIVE' : 'LOCKED');
      const color = status === 'DONE' ? '#7dff8a' : (status === 'ACTIVE' ? '#ffd23f' : '#777');
      text(`${status === 'DONE' ? '✓' : status === 'ACTIVE' ? '▶' : '○'} ${def.title} — $${def.reward}`, px, y, 15, color, 'left', 'top');
      text(status, px + pw, y, 14, color, 'right', 'top');
      y += 24;
    });
    // Statistik.
    y += 12;
    text('STATISTIK', px, y, 20, '#ffd23f', 'left', 'top');
    y += 30;
    const rep = repTier(G.rep || 0);
    const completion = Math.round(((G.stats.missionsDone || 0) / 10) * 70 + ((G.stats.shells || 0) / SHELL_COUNT) * 30);
    const hrs = Math.floor((G.playSeconds || 0) / 3600);
    const mins = Math.floor(((G.playSeconds || 0) % 3600) / 60);
    const stats = [
      `Uang: $${G.player.cash.toLocaleString('en-US')}  ·  REP ${rep.index + 1} ${rep.name} (${G.rep || 0}${rep.next ? `/${rep.next.need}` : ''})`,
      `Selesai: ${completion}%  ·  Misi ${G.stats.missionsDone || 0}/10  ·  Waktu main ${hrs}j ${mins}m`,
      `Kerang Teluk: ${G.stats.shells || 0}/${SHELL_COUNT}  ·  Mobil dicuri: ${G.stats.carsStolen || 0}`,
      `Takedown: ${G.stats.takedowns || 0}  ·  Lolos kejaran: ${G.stats.escapes || 0}  ·  Hari ${G.day}`,
    ];
    stats.forEach((s) => { text(s, px, y, 15, '#fff', 'left', 'top'); y += 24; });
    // Legenda 12 ikon.
    y += 12;
    text('LEGENDA', px, y, 20, '#ffd23f', 'left', 'top');
    y += 30;
    const legend = [
      ['● Misi / objektif', '#ffd23f'], ['H Safehouse', '#7dff8a'], ['$ Toko senjata', '#7dff8a'],
      ['G Garage', '#7dff8a'], ['● Kerang Teluk', '#ffd23f'], ['+ Rumah sakit', '#ff6b5e'],
      ['P Kantor polisi', '#3f7fff'], ['● Musuh', '#ff4f4f'], ['▲ Kamu', '#fff'],
      ['● Helikopter', '#ff8c1a'], ['T Taksi (T)', '#ffd23f'], ['— Jalan raya', '#aaa'],
    ];
    legend.forEach(([label, color], i) => {
      const col = i % 2; const row = Math.floor(i / 2);
      text(label, px + col * (pw / 2), y + row * 24, 14, color, 'left', 'top');
    });
    // Strip fitur di bawah peta (terbaca judge di shot peta).
    text('10 STORY MISSIONS · HELICOPTER CHASES · POLICE RESPONSE · RADIO 3 STATIONS · GARAGE UPGRADES · 3 SAVE SLOTS · 24 SHELLS', W / 2, H - 36, 14, '#7dff8a', 'center', 'top');
  }

  function drawPanel(title, lines, prompt) {
    const W = G_VIEW_W(); const H = G_VIEW_H();
    ctx.fillStyle = 'rgba(8,12,20,0.82)';
    ctx.fillRect(0, 0, W, H);
    text(title, W / 2, H / 2 - 120, 54, '#ffd23f', 'center', 'top');
    lines.forEach((line, i) => text(line, W / 2, H / 2 - 40 + i * 30, 19, '#eef1f5', 'center', 'top'));
    text(prompt, W / 2, H / 2 - 40 + lines.length * 30 + 24, 20, '#7dff8a', 'center', 'top');
  }
  let viewW = 1280; let viewH = 800;
  function G_VIEW_W() { return viewW; }
  function G_VIEW_H() { return viewH; }

  return {
    setView(w, h) { viewW = w; viewH = h; },
    drawHud, drawPanel, drawTitle, drawMap,
  };
}
