// Generasi kota "Teluk Cerah": grid jalan, blok bangunan per distrik, props.
// Semua deterministik dari seed yang sama.
//
// PERINGATAN: urutan pemanggilan RNG di createCity adalah kontrak —
// layout kota (dan screenshot) diturunkan dari urutan itu. Helper-helper
// di bawah hanya memindahkan blok kode ke fungsi bernama; mereka dipanggil
// dalam urutan yang persis sama seperti sebelumnya, dengan argumen yang sama.
import {
  BLOCK_INSET,
  BUILDINGS_PER_BLOCK,
  BUILDING_SIZE,
  COLORS,
  CONTAINER_AREA,
  CONTAINER_COLORS,
  CONTAINER_COUNT,
  CONTAINER_SIZE,
  DISTRICT_CBD_X,
  DISTRICT_MARINA_X,
  DISTRICT_OLD_TOWN_X,
  DISTRICT_PORT_Y,
  ROAD_OFFSET,
  ROAD_SPACING,
  ROAD_WIDTH,
  TREES_PER_BLOCK,
  TREE_RADIUS,
  WORLD,
} from './config.js';

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
  if (y >= DISTRICT_PORT_Y) return 'Pelabuhan';
  if (x < DISTRICT_MARINA_X) return 'Marina';
  if (x < DISTRICT_OLD_TOWN_X) return 'Kota Tua';
  if (x < DISTRICT_CBD_X) return 'CBD';
  return 'Perumahan';
}

// Warna + ciri bangunan menurut distrik. CBD melempar koin untuk gedung
// tinggi — dan lemparan itu (rng.chance) adalah bagian dari urutan RNG,
// jadi hanya boleh terjadi untuk distrik CBD, persis seperti sebelumnya.
function buildingStyle(rng, district) {
  if (district === 'CBD') {
    return { color: COLORS.buildingCbd, tall: rng.chance(0.5) };
  }
  if (district === 'Perumahan') return { color: COLORS.buildingHouse, tall: false };
  if (district === 'Pelabuhan') return { color: COLORS.buildingPort, tall: false };
  return { color: COLORS.buildingOld, tall: false };
}

// Isi satu blok (x0,y0)-(x1,y1) dengan bangunan. Dipanggil sekali per blok,
// sebelum pohon blok yang sama.
function fillBlockBuildings(rng, x0, y0, x1, y1, district) {
  const out = [];
  const n = rng.int(BUILDINGS_PER_BLOCK.min, BUILDINGS_PER_BLOCK.max);
  for (let k = 0; k < n; k += 1) {
    const w = rng.range(BUILDING_SIZE.wMin, BUILDING_SIZE.wMax);
    const h = rng.range(BUILDING_SIZE.hMin, BUILDING_SIZE.hMax);
    const bx = x0 + rng.range(0, Math.max(1, x1 - x0 - w));
    const by = y0 + rng.range(0, Math.max(1, y1 - y0 - h));
    const { color, tall } = buildingStyle(rng, district);
    out.push({ x: bx, y: by, w, h, color, tall, district });
  }
  return out;
}

// Pohon di sudut blok. Dipanggil sekali per blok, setelah bangunannya.
function fillBlockTrees(rng, x0, y0, x1, y1) {
  const out = [];
  for (let k = 0; k < rng.int(TREES_PER_BLOCK.min, TREES_PER_BLOCK.max); k += 1) {
    out.push({ x: rng.range(x0, x1), y: rng.range(y0, y1), r: rng.range(TREE_RADIUS.min, TREE_RADIUS.max) });
  }
  return out;
}

// Kontainer di pelabuhan (selatan). Dipanggil terakhir, setelah semua blok.
function fillPortContainers(rng) {
  const out = [];
  for (let i = 0; i < CONTAINER_COUNT; i += 1) {
    out.push({
      x: rng.range(CONTAINER_AREA.xMin, CONTAINER_AREA.xMax),
      y: rng.range(CONTAINER_AREA.yMin, CONTAINER_AREA.yMax),
      w: rng.range(CONTAINER_SIZE.wMin, CONTAINER_SIZE.wMax),
      h: CONTAINER_SIZE.h,
      color: rng.pick(CONTAINER_COLORS),
    });
  }
  return out;
}

export function createCity(rng) {
  const lines = roadLines();
  const buildings = [];
  const trees = [];
  const lamps = [];

  // Bangunan + pohon mengisi tiap blok di antara dua jalan.
  for (let i = 0; i < lines.length - 1; i += 1) {
    for (let j = 0; j < lines.length - 1; j += 1) {
      const x0 = lines[i] + ROAD_WIDTH / 2 + BLOCK_INSET;
      const y0 = lines[j] + ROAD_WIDTH / 2 + BLOCK_INSET;
      const x1 = lines[i + 1] - ROAD_WIDTH / 2 - BLOCK_INSET;
      const y1 = lines[j + 1] - ROAD_WIDTH / 2 - BLOCK_INSET;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const district = districtAt(cx, cy);
      buildings.push(...fillBlockBuildings(rng, x0, y0, x1, y1, district));
      trees.push(...fillBlockTrees(rng, x0, y0, x1, y1));
    }
  }
  // Lampu jalan di tiap persimpangan.
  for (const lx of lines) {
    for (const ly of lines) {
      lamps.push({ x: lx + ROAD_WIDTH / 2 + 8, y: ly + ROAD_WIDTH / 2 + 8 });
    }
  }
  const containers = fillPortContainers(rng);

  return { lines, buildings, trees, lamps, containers };
}

// Titik terdekat pada sebuah persegi (bx,by,bw,bh) dari titik (x,y).
function nearestPointOnRect(bx, by, bw, bh, x, y) {
  return {
    x: Math.max(bx, Math.min(x, bx + bw)),
    y: Math.max(by, Math.min(y, by + bh)),
  };
}

// Dorong lingkaran (x,y,r) keluar dari bangunan; kembalikan posisi terkoreksi.
export function collideBuildings(city, x, y, r) {
  for (const b of city.buildings) {
    const n = nearestPointOnRect(b.x, b.y, b.w, b.h, x, y);
    const dx = x - n.x;
    const dy = y - n.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r && d2 > 0.01) {
      const d = Math.sqrt(d2);
      x = n.x + (dx / d) * r;
      y = n.y + (dy / d) * r;
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
