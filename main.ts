// Teluk Cerah 3D — entrypoint penyerahan gta6-01 (Node 22, stdlib saja).
//
// Program ini hanya menyerahkan entri: ia memeriksa kelengkapan paket
// (game/index.html ada dan di bawah 1 MiB, Three.js ter-vendor, tepat 4
// screenshot JPG masing-masing tidak lebih dari 256 KiB, folder game/
// di bawah batas file dan byte), lalu menyalin game/ dan screenshots/
// dari sebelah file ini ke direktori output dan menulis dossier.json di
// sana lewat library make.fun yang sudah di-vendor.
//
// Game-nya sendiri statis dan offline: game/index.html + modul ES di
// game/src/ + Three.js r149 di game/vendor/, tanpa satu pun request
// jaringan saat dimainkan.
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
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 50331648;
const INDEX_MAX_BYTES = 1048576;
const SHOT_MAX_BYTES = 262144;

// Validasi 1: entrypoint game harus ada dan di bawah 1 MiB.
const indexPath = join(gameDir, 'index.html');
if (!existsSync(indexPath)) {
  throw new Error('game/index.html tidak ditemukan — entri belum lengkap');
}
const indexBytes = statSync(indexPath).size;
if (indexBytes > INDEX_MAX_BYTES) {
  throw new Error(`game/index.html ${indexBytes} byte — melebihi 1 MiB`);
}

// Validasi 2: Three.js r149 harus ter-vendor (game tidak boleh memuat
// library apa pun dari jaringan).
const threePath = join(gameDir, 'vendor', 'three.min.js');
if (!existsSync(threePath)) {
  throw new Error('game/vendor/three.min.js tidak ditemukan — unduh Three.js r149 dulu');
}

// Validasi 3: tepat 4 screenshot, masing-masing JPG dan <= 256 KiB.
if (!existsSync(shotsDir)) throw new Error('screenshots/ tidak ditemukan');
const shots = readdirSync(shotsDir).filter((f) => f.toLowerCase().endsWith('.jpg')).sort();
if (shots.length !== 4) {
  throw new Error(`butuh tepat 4 screenshot JPG, ketemu ${shots.length}: ${shots.join(', ')}`);
}
for (const shot of shots) {
  const size = statSync(join(shotsDir, shot)).size;
  if (size > SHOT_MAX_BYTES) throw new Error(`screenshot ${shot} ${size} byte — melebihi 256 KiB`);
}

// Validasi 4: game/ di bawah batas file (993) dan byte (48 MiB).
function measure(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = measure(full);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += statSync(full).size;
    }
  }
  return { files, bytes };
}
const gameSize = measure(gameDir);
if (gameSize.files > GAME_MAX_FILES) {
  throw new Error(`game/ berisi ${gameSize.files} file — melebihi 993`);
}
if (gameSize.bytes > GAME_MAX_BYTES) {
  throw new Error(`game/ berisi ${gameSize.bytes} byte — melebihi 48 MiB`);
}

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

console.log(`Teluk Cerah 3D diserahkan: ${gameSize.files} file game (${gameSize.bytes} byte), ${shots.length} screenshot, dossier.json ditulis.`);
