// RNG ber-seed (mulberry32) supaya kota, traffic, dan scene screenshot
// selalu sama untuk seed yang sama.
//
// Mulberry32 adalah PRNG 32-bit yang murah dan deterministik: satu state
// integer `a` yang dimajukan tiap pemanggilan. Urutan pemanggilan next()
// TIDAK BOLEH berubah — layout kota, traffic, dan screenshot semuanya
// diturunkan dari urutan itu, jadi helper di bawah ini hanya memberi nama
// pada konstanta algoritmanya, bukan mengubah aritmetikanya.
const MULBERRY_INCREMENT = 0x6d2b79f5;
const MULBERRY_MIXER = 61;
const UINT32_MAX_PLUS_ONE = 4294967296;

export function createRandom(seed) {
  let a = seed >>> 0;

  // Majukan state satu langkah dan kembalikan word 32-bit mentahnya.
  // Inilah satu-satunya tempat state berubah; semua method di bawah
  // memanggil fungsi ini tepat satu kali per nilai acak.
  function advance() {
    a |= 0; a = (a + MULBERRY_INCREMENT) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), MULBERRY_MIXER | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  }

  // Nilai float di [0, 1).
  function next() {
    return advance() / UINT32_MAX_PLUS_ONE;
  }

  // Nilai float di [min, max).
  function range(min, max) {
    return min + next() * (max - min);
  }

  // Integer di [min, max] (inklusif kedua ujung).
  function int(min, max) {
    return Math.floor(range(min, max + 1));
  }

  // Satu elemen acak dari daftar.
  function pick(list) {
    return list[Math.floor(next() * list.length)];
  }

  // True dengan peluang p (0 <= p <= 1).
  function chance(p) {
    return next() < p;
  }

  return { next, range, int, pick, chance };
}
