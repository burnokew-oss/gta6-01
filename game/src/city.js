// Generasi kota "Teluk Cerah": grid jalan, blok bangunan per distrik, props.
// Semua deterministik dari seed yang sama.
import { COLORS, ROAD_OFFSET, ROAD_SPACING, ROAD_WIDTH, WORLD } from './config.js';

export function roadLines() {
  const lines = [];
  for (let v = ROAD_OFFSET; v < WORLD; v += ROAD_SPACING) lines.push(v);
  return lines;
}

export function isOnRoad(x, y) {
  const half = ROAD_WIDTH / 2;
  for (let v = ROAD_OFFSET; v < WORLD; v += ROAD_SPACING) {
    if (Math.abs(x - v) <= half) return true;
    if (Math.abs(y - v) <= half) return true;
  }
  return false;
}

export function nearestRoadPoint(x, y) {
  let bx = x; let by = y; let best = Infinity;
  for (let v = ROAD_OFFSET; v < WORLD; v += ROAD_SPACING) {
    const d1 = Math.abs(x - v);
    if (d1 < best) { best = d1; bx = v; by = y; }
    const d2 = Math.abs(y - v);
    if (d2 < best) { best = d2; bx = x; by = v; }
  }
  return { x: bx, y: by };
}

export function districtAt(x, y) {
  if (y >= 2400) return 'Pelabuhan';
  if (x < 800) return 'Marina';
  if (x < 1700) return 'Kota Tua';
  if (x < 2600) return 'CBD';
  return 'Perumahan';
}

export function createCity(rng) {
  const lines = roadLines();
  const buildings = [];
  const trees = [];
  const lamps = [];
  const containers = [];

  // Bangunan mengisi tiap blok di antara dua jalan.
  for (let i = 0; i < lines.length - 1; i += 1) {
    for (let j = 0; j < lines.length - 1; j += 1) {
      const x0 = lines[i] + ROAD_WIDTH / 2 + 24;
      const y0 = lines[j] + ROAD_WIDTH / 2 + 24;
      const x1 = lines[i + 1] - ROAD_WIDTH / 2 - 24;
      const y1 = lines[j + 1] - ROAD_WIDTH / 2 - 24;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const district = districtAt(cx, cy);
      const n = rng.int(1, 3);
      for (let k = 0; k < n; k += 1) {
        const w = rng.range(70, 150);
        const h = rng.range(60, 130);
        const bx = x0 + rng.range(0, Math.max(1, x1 - x0 - w));
        const by = y0 + rng.range(0, Math.max(1, y1 - y0 - h));
        let color = COLORS.buildingOld;
        let tall = false;
        if (district === 'CBD') { color = COLORS.buildingCbd; tall = rng.chance(0.5); }
        else if (district === 'Perumahan') color = COLORS.buildingHouse;
        else if (district === 'Pelabuhan') color = COLORS.buildingPort;
        buildings.push({ x: bx, y: by, w, h, color, tall, district });
      }
      // Pohon di sudut blok.
      for (let k = 0; k < rng.int(2, 5); k += 1) {
        trees.push({ x: rng.range(x0, x1), y: rng.range(y0, y1), r: rng.range(8, 14) });
      }
    }
  }
  // Lampu jalan di tiap persimpangan.
  for (const lx of lines) {
    for (const ly of lines) {
      lamps.push({ x: lx + ROAD_WIDTH / 2 + 8, y: ly + ROAD_WIDTH / 2 + 8 });
    }
  }
  // Kontainer di pelabuhan (selatan).
  for (let i = 0; i < 40; i += 1) {
    containers.push({
      x: rng.range(200, 3000), y: rng.range(2500, 3100),
      w: rng.range(50, 90), h: 26,
      color: rng.pick(['#c25e3a', '#3a7d5e', '#7a5ea8', '#b8a03a']),
    });
  }

  return { lines, buildings, trees, lamps, containers };
}

// Dorong lingkaran (x,y,r) keluar dari bangunan; kembalikan posisi terkoreksi.
export function collideBuildings(city, x, y, r) {
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - nx;
    const dy = y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r && d2 > 0.01) {
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * r;
      y = ny + (dy / d) * r;
    } else if (d2 <= 0.01) {
      // Tepat di dalam bangunan: dorong ke sisi terdekat.
      const left = x - b.x; const right = b.x + b.w - x;
      const top = y - b.y; const bottom = b.y + b.h - y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = b.x - r;
      else if (m === right) x = b.x + b.w + r;
      else if (m === top) y = b.y - r;
      else y = b.y + b.h + r;
    }
  }
  return { x, y };
}
