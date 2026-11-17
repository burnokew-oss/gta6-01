// Teluk Cerah — entrypoint penyerahan gta6-01 (Node 22, stdlib saja).
//
// Tugas program ini kecil dan eksplisit: periksa dulu bahwa entri lengkap
// (game/index.html ada, tepat 4 screenshot JPG dan masing-masing tidak lebih
// dari 256 KiB, folder game/ di bawah batas file), lalu salin game/ dan
// screenshots/ dari sebelah file ini ke direktori output dan tulis
// dossier.json di sana lewat library make.fun yang sudah di-vendor.
// Game-nya sendiri statis dan offline: game/index.html + modul ES di
// game/src/, tanpa library dan tanpa satu pun request jaringan.
//
// Di luar container grader, MAKEFUN_OUTPUT_DIR menggantikan /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

// Validasi 1: entrypoint game harus ada.
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html tidak ditemukan — entri belum lengkap');
}

// Validasi 2: tepat 4 screenshot, masing-masing JPG dan <= 256 KiB.
if (!existsSync(shotsDir)) throw new Error('screenshots/ tidak ditemukan');
const shots = readdirSync(shotsDir).filter((f) => f.toLowerCase().endsWith('.jpg')).sort();
if (shots.length !== 4) {
  throw new Error(`butuh tepat 4 screenshot JPG, ketemu ${shots.length}: ${shots.join(', ')}`);
}
for (const shot of shots) {
  const size = statSync(join(shotsDir, shot)).size;
  if (size > 262144) throw new Error(`screenshot ${shot} ${size} byte — melebihi 256 KiB`);
}

// Validasi 3: game/ di bawah batas file (993 file).
function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}
const gameFiles = countFiles(gameDir);
if (gameFiles > 993) throw new Error(`game/ berisi ${gameFiles} file — melebihi 993`);

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// Batas-batas dari reference/gate.json: hanya text_max_bytes yang membentuk
// byte dossier; sisanya menolak entri yang scorer akan tolak (lebih dari 4
// screenshot atau satu di atas 256 KiB; lebih dari 993 file di game/ atau
// 48 MiB total, atau path di bawah game/ lebih dari 1000 byte).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Teluk Cerah diserahkan: ${gameFiles} file game, ${shots.length} screenshot, dossier.json ditulis.`);
