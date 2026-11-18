// Teluk Cerah — konfigurasi dunia, kendaraan, senjata, dan misi.
// Semua nilai disetel di sini supaya penyeimbang game tinggal ubah satu file.
//
// Konvensi: angka yang dipakai di lebih dari satu tempat (atau yang
// menentukan identitas sebuah lokasi) diberi nama di sini, bukan ditulis
// mentah di kode. Nilai-nilainya tidak boleh diubah tanpa sengaja —
// layout kota dan screenshot deterministik diturunkan dari angka-angka ini.
export const STEP = 1 / 60;
export const WORLD = 3200;
export const ROAD_SPACING = 500;
export const ROAD_WIDTH = 120;
export const ROAD_OFFSET = 400; // jalan pertama di x/y = 400

// Batas distrik (dipakai districtAt di city.js). Pelabuhan adalah pita
// selatan (y besar); sisanya dipisah garis vertikal dari barat ke timur.
export const DISTRICT_PORT_Y = 2400;
export const DISTRICT_MARINA_X = 800;
export const DISTRICT_OLD_TOWN_X = 1700;
export const DISTRICT_CBD_X = 2600;

// Jarak bangunan dari tepi jalan di dalam satu blok kota.
export const BLOCK_INSET = 24;

// Generasi kontainer pelabuhan: jumlah, area, dan ukuran.
export const CONTAINER_COUNT = 40;
export const CONTAINER_AREA = { xMin: 200, xMax: 3000, yMin: 2500, yMax: 3100 };
export const CONTAINER_SIZE = { wMin: 50, wMax: 90, h: 26 };
export const CONTAINER_COLORS = ['#c25e3a', '#3a7d5e', '#7a5ea8', '#b8a03a'];

// Ukuran bangunan per blok dan pohon di sudut blok.
export const BUILDING_SIZE = { wMin: 70, wMax: 150, hMin: 60, hMax: 130 };
export const BUILDINGS_PER_BLOCK = { min: 1, max: 3 };
export const TREES_PER_BLOCK = { min: 2, max: 5 };
export const TREE_RADIUS = { min: 8, max: 14 };

// Lokasi-lokasi penting di peta, dipakai sebagai tujuan langkah misi.
// Koordinatnya sengaja bernama supaya MISSION_DEFS di bawah terbaca
// sebagai cerita, bukan deretan angka.
export const LOCATIONS = {
  marinaWarung: { x: 430, y: 2750 }, // warung Bu Sari di Marina
  marinaMeet: { x: 430, y: 450 }, // titik temu Marina (utara)
  portWarehouse: { x: 2900, y: 2900 }, // gudang pelabuhan
  oldTownSquare: { x: 1250, y: 1250 }, // tempat nongkrong penagih, Kota Tua
  cbdShop: { x: 2150, y: 1450 }, // toko kelontong CBD
  eastSafehouse: { x: 2900, y: 450 }, // safehouse Perumahan (timur)
  cbdPlaza: { x: 2150, y: 950 }, // plaza CBD (tengah-timur)
  northGate: { x: 950, y: 450 }, // gerbang utara Perumahan
  portGate: { x: 1650, y: 2900 }, // gerbang pelabuhan
  marinaBeach: { x: 430, y: 1950 }, // pantai Marina
};
export const GOTO_RADIUS = 90;
export const SAFEHOUSE_RADIUS = 110;

export const COLORS = {
  grass: '#7fae62',
  sand: '#e8d39a',
  water: '#3f8fbf',
  road: '#3a3a40',
  roadLine: '#e8e4c8',
  sidewalk: '#9a9a92',
  buildingOld: '#b08968',
  buildingCbd: '#6b7f99',
  buildingHouse: '#c98f7a',
  buildingPort: '#8a7d6b',
};

export const VEHICLE_TYPES = {
  sedan: { name: 'Sedan', color: '#4a7fb5', accel: 260, top: 320, turn: 2.6, len: 44, wid: 22 },
  taxi: { name: 'Taksi', color: '#f2c200', accel: 240, top: 300, turn: 2.6, len: 44, wid: 22 },
  truck: { name: 'Truk', color: '#8a6d3b', accel: 140, top: 210, turn: 1.9, len: 62, wid: 26 },
  sport: { name: 'Sport', color: '#c22e2e', accel: 380, top: 430, turn: 3.1, len: 46, wid: 22 },
  van: { name: 'Van', color: '#5b8a72', accel: 190, top: 260, turn: 2.2, len: 52, wid: 24 },
  police: { name: 'Patroli', color: '#1c2f6e', accel: 320, top: 380, turn: 3.0, len: 46, wid: 22 },
};

export const WEAPONS = {
  fist: { name: 'Tinju', range: 34, damage: 12, rate: 0.38, ammo: Infinity, auto: false },
  pistol: { name: 'Pistol', range: 420, damage: 22, rate: 0.22, ammo: 12, reload: 1.1, speed: 720 },
  shotgun: { name: 'Shotgun', range: 260, damage: 14, rate: 0.8, ammo: 6, reload: 1.6, speed: 560, pellets: 6, spread: 0.32 },
};

export const WANTED_DECAY_SECONDS = [0, 25, 40, 60, 90, 120];
export const COP_COUNTS = [0, 1, 2, 3, 4, 6];
export const COP_CAR_COUNTS = [0, 0, 1, 2, 2, 3];

export const MISSION_DEFS = [
  {
    id: 1, title: 'M1 — Pulang Kampung', giver: 'Bu Sari',
    intro: 'Raka, akhirnya pulang juga. Mobil pinjaman ada di parkiran dekat rumah. Ambil, lalu temui aku di warung ujung Marina.',
    steps: [
      { type: 'enterCar', text: 'Naik ke mobil pinjaman di parkiran' },
      { type: 'goto', ...LOCATIONS.marinaWarung, r: GOTO_RADIUS, text: 'Temui Bu Sari di warung Marina' },
    ],
    reward: 150,
  },
  {
    id: 2, title: 'M2 — Titipan', giver: 'Bu Sari',
    intro: 'Ada paket di gudang pelabuhan. Ambil cepat, jangan sampai polisi curiga. Kalau ketahuan, lari!',
    steps: [
      { type: 'goto', ...LOCATIONS.portWarehouse, r: GOTO_RADIUS, text: 'Ambil paket di gudang pelabuhan' },
      { type: 'escape', wanted: 2, seconds: 20, text: 'Kabur dari polisi selama 20 detik' },
    ],
    reward: 300,
  },
  {
    id: 3, title: 'M3 — Utang Lama', giver: 'Bu Sari',
    intro: 'Tiga penagih utang nongkrong di Kota Tua. Beri mereka pelajaran — tinju atau pistol, terserah kamu.',
    steps: [
      { type: 'kill', count: 3, ...LOCATIONS.oldTownSquare, text: 'Hadapi 3 penagih di Kota Tua' },
      { type: 'goto', ...LOCATIONS.marinaWarung, r: GOTO_RADIUS, text: 'Kembali ke warung Bu Sari' },
    ],
    reward: 450,
  },
  {
    id: 4, title: 'M4 — Balapan Liar', giver: 'Raka',
    intro: 'Balapan liar di jalan lingkar. Delapan checkpoint, tiga pembalap. Jangan kalah, Raka.',
    steps: [
      { type: 'race', checkpoints: 8, text: 'Lewati 8 checkpoint sebelum lawan' },
    ],
    reward: 600,
  },
  {
    id: 5, title: 'M5 — Rampok Toko', giver: 'Bu Sari',
    intro: 'Toko kelontong di CBD menyimpan uang tunai. Ambil, lalu kabur ke safehouse sebelum polisi mengepung.',
    steps: [
      { type: 'goto', ...LOCATIONS.cbdShop, r: GOTO_RADIUS, text: 'Ambil uang di toko CBD' },
      { type: 'goto', ...LOCATIONS.eastSafehouse, r: SAFEHOUSE_RADIUS, wanted: 4, text: 'Kabur ke safehouse Perumahan (wanted 4!)' },
    ],
    reward: 900,
  },
  {
    id: 6, title: 'M6 — Puncak', giver: 'Bu Sari',
    intro: 'Geng rival berkumpul di gudang pelabuhan. Habisi mereka semua, lalu pergi sebelum polisi datang.',
    steps: [
      { type: 'kill', count: 6, ...LOCATIONS.portWarehouse, text: 'Habisi 6 anggota geng rival' },
      { type: 'goto', ...LOCATIONS.marinaMeet, r: SAFEHOUSE_RADIUS, text: 'Kabur ke titik temu Marina' },
    ],
    reward: 1500,
  },
  {
    id: 7, title: 'M7 — Kurir Malam', giver: 'Bu Sari',
    intro: 'Paket ini harus sampai ke tiga titik sebelum tengah malam: plaza CBD, gerbang utara, lalu pantai Marina. Jangan berhenti, jangan ditangkap.',
    steps: [
      { type: 'route', points: [LOCATIONS.cbdPlaza, LOCATIONS.northGate, LOCATIONS.marinaBeach], r: GOTO_RADIUS, text: 'Antar paket ke 3 titik (sisa: %n)' },
    ],
    reward: 700,
  },
  {
    id: 8, title: 'M8 — Bayangan', giver: 'Dimas',
    intro: 'Ada mobil sport merah keliling kota — itu kurir geng rival. Ikuti dari dekat tanpa ketahuan, sampai aku tahu ke mana dia pergi.',
    steps: [
      { type: 'tail', ...LOCATIONS.cbdPlaza, seconds: 12, radius: 230, text: 'Ikuti mobil merah dari dekat (jangan sampai hilang)' },
    ],
    reward: 800,
  },
  {
    id: 9, title: 'M9 — Heist Pelabuhan', giver: 'Bu Sari',
    intro: 'Brankas pelabuhan penuh malam ini. Bersihkan penjaganya, ambil isinya, lalu kabur ke safehouse — polisi pasti mengepung.',
    steps: [
      { type: 'kill', count: 5, ...LOCATIONS.portWarehouse, text: 'Habisi 5 penjaga brankas pelabuhan' },
      { type: 'goto', ...LOCATIONS.eastSafehouse, r: SAFEHOUSE_RADIUS, wanted: 4, text: 'Kabur ke safehouse Perumahan (wanted 4!)' },
    ],
    reward: 1200,
  },
  {
    id: 10, title: 'M10 — Raja Teluk', giver: 'Bu Sari',
    intro: 'Ini puncaknya, Raka. Bos geng dan pengawalnya berkumpul di gudang. Habisi mereka, lalu pergi dari pelabuhan — Teluk Cerah jadi milikmu.',
    steps: [
      { type: 'kill', count: 6, ...LOCATIONS.portWarehouse, text: 'Habisi bos geng dan 5 pengawalnya' },
      { type: 'goto', ...LOCATIONS.eastSafehouse, r: SAFEHOUSE_RADIUS, wanted: 3, text: 'Kabur ke safehouse — jangan tertangkap!' },
    ],
    reward: 2000,
  },
];

// Respect / Rep: poin dari misi (+150), takedown (+10), lolos kejaran (+50).
// Tier bernama tampil di HUD, peta, dan ringkasan Continue.
export const REP_TIERS = [
  { name: 'Anak Baru', need: 0 },
  { name: 'Pengemudi Dikenal', need: 300 },
  { name: 'Pembalap Teluk', need: 800 },
  { name: 'Raja Jalanan', need: 1500 },
  { name: 'Legenda Teluk', need: 2600 },
];
export function repTier(rep) {
  let tier = 0;
  for (let i = 0; i < REP_TIERS.length; i += 1) {
    if (rep >= REP_TIERS[i].need) tier = i;
  }
  const next = REP_TIERS[tier + 1] || null;
  return { index: tier, name: REP_TIERS[tier].name, next };
}

// Nama unit polisi (burung Indonesia, ala IBIS/TARPON rank 1).
export const COP_CAR_NAMES = ['ELANG-11', 'MERAK-23', 'BANGAU-18', 'KAKATUA-31', 'CENDRAWASIH-07', 'JALAK-42'];
export const COP_FOOT_NAMES = ['GARUDA-02', 'MERPATI-15', 'PERKUTUT-09', 'KENARI-27', 'BONDOL-33', 'CIBLEK-51'];
export const HELI_NAME = 'GARUDA-1';

// Kolektibel: Kerang Teluk di pinggir jalan (24 di seluruh kota).
export const SHELL_COUNT = 24;

// Hari dalam seminggu game (hari 1 = Jumat, seperti suasana akhir pekan).
export const WEEKDAYS = ['Jum', 'Sab', 'Min', 'Sen', 'Sel', 'Rab', 'Kam'];

// Garage upgrades (sistem unik v2 — ber-harga, ada respect gate).
export const GARAGE_UPGRADES = {
  engine: { label: 'Mesin Balap', price: 5000, repTier: 3, desc: '+15% top speed (permanen)' },
  armor: { label: 'Pelat Baja', price: 1800, repTier: 1, desc: 'Armor penuh + tahan benturan' },
  nitro: { label: 'Nitro Ganda', price: 3000, repTier: 2, desc: 'Tangki NOS 2x lipat' },
};

// NOS: boost mobil (Shift saat nyetir). Nilai dalam persen tangki.
export const NOS_MAX = 100;
export const NOS_DRAIN_PER_SEC = 30;
export const NOS_REFILL_PER_SEC = 9;
export const NOS_TOP_MULT = 1.45;
export const NOS_ACCEL_MULT = 1.8;

// Helikopter polisi: muncul di wanted >= 3.
export const HELI_MIN_WANTED = 3;
export const HELI_SPEED = 260;
export const HELI_HOVER_DIST = 130;

export const SAVE_KEY = 'teluk-cerah-save';
export const BEST_KEY = 'teluk-cerah-best';
