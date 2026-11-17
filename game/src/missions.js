// Misi cerita (6 misi Bu Sari + Raka), dialog typewriter, side activity
// Taksi dan Rampage. Misi dijalankan sebagai state machine langkah-demi-langkah.
import { MISSION_DEFS } from './config.js';
import { spawnEnemies } from './combat.js';
import { addWanted } from './police.js';

export function createMissionState() {
  return {
    index: 0, // misi aktif (0-based), -1 = semua selesai
    step: 0,
    started: false,
    dialog: null, // {text, shown, speaker}
    banner: null,
    objective: 'Temui Bu Sari — tekan Enter untuk mulai misi pertama',
    killCount: 0,
    race: null,
    escapeTimer: 0,
    rampage: null,
    taxi: null,
    done: false,
  };
}

export function startMission(G, index) {
  const def = MISSION_DEFS[index];
  if (!def) return;
  G.mission.index = index;
  G.mission.step = 0;
  G.mission.started = true;
  G.mission.killCount = 0;
  G.mission.race = null;
  G.mission.dialog = { speaker: def.giver, text: def.intro, shown: 0 };
  G.mission.objective = def.steps[0].text;
  G.mission.banner = def.title;
  setupStep(G);
}

function setupStep(G) {
  const def = MISSION_DEFS[G.mission.index];
  const step = def.steps[G.mission.step];
  if (!step) return;
  G.mission.objective = step.text;
  if (step.type === 'kill') {
    spawnEnemies(G, step.x, step.y, step.count, 60);
    G.mission.killCount = 0;
  }
  if (step.type === 'escape') {
    addWanted(G, step.wanted);
    G.mission.escapeTimer = step.seconds;
  }
  if (step.type === 'goto' && step.wanted) addWanted(G, step.wanted);
  if (step.type === 'race') {
    G.mission.race = {
      checkpoints: raceCheckpoints(G),
      next: 0, time: 0, rivals: spawnRacers(G),
    };
  }
}

function raceCheckpoints(G) {
  const pts = [];
  const cx = 1650; const cy = 1650;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * 1100, y: cy + Math.sin(a) * 1100, done: false });
  }
  return pts;
}

function spawnRacers(G) {
  const rivals = [];
  for (let i = 0; i < 3; i += 1) {
    const v = { x: 1650 + 1100 + i * 60, y: 1650 + 60, angle: 0, speed: 0, cp: 0, type: 'sport', color: ['#c22e2e', '#2e8a5b', '#8a5ec2'][i], len: 46, wid: 22, health: 100, dead: false, ai: null, parked: false, driver: null, flash: 0, accel: 340, top: 400, turn: 3 };
    rivals.push(v);
    G.vehicles.push(v);
  }
  return rivals;
}

function advanceStep(G) {
  const def = MISSION_DEFS[G.mission.index];
  G.mission.step += 1;
  if (G.mission.step >= def.steps.length) {
    completeMission(G);
  } else {
    setupStep(G);
  }
}

function completeMission(G) {
  const def = MISSION_DEFS[G.mission.index];
  G.player.cash += def.reward;
  G.mission.banner = `MISI SELESAI — ${def.title}  +$${def.reward}`;
  G.cashFloaters.push({ x: G.player.x, y: G.player.y - 40, text: `+$${def.reward}`, life: 1.5 });
  if (G.audio) G.audio.missionDone();
  G.mission.index += 1;
  G.mission.step = 0;
  G.mission.started = false;
  G.mission.race = null;
  if (G.mission.index >= MISSION_DEFS.length) {
    G.mission.index = -1;
    G.mission.objective = 'Semua misi selesai! Teluk Cerah milikmu, Raka.';
    G.mission.done = true;
  } else {
    G.mission.objective = `Misi berikutnya: ${MISSION_DEFS[G.mission.index].title} — tekan Enter untuk mulai`;
  }
}

export function updateMissions(G, dt) {
  const m = G.mission;
  // Dialog typewriter.
  if (m.dialog) {
    m.dialog.shown = Math.min(m.dialog.text.length, m.dialog.shown + dt * 45);
  }
  if (m.banner) {
    m.bannerTimer = (m.bannerTimer || 0) + dt;
    if (m.bannerTimer > 3.2) { m.banner = null; m.bannerTimer = 0; }
  }
  // Side: Rampage timer.
  if (m.rampage) {
    m.rampage.time -= dt;
    if (m.rampage.time <= 0) {
      G.player.cash += m.rampage.score * 5;
      m.banner = `RAMPAGE SELESAI — skor ${m.rampage.score}  +$${m.rampage.score * 5}`;
      m.rampage = null;
    }
  }
  if (!m.started || m.index < 0) return;
  const def = MISSION_DEFS[m.index];
  const step = def.steps[m.step];
  if (!step) return;
  const p = G.player;

  if (step.type === 'enterCar') {
    if (!p.onFoot) advanceStep(G);
  } else if (step.type === 'goto') {
    const d = Math.hypot(p.x - step.x, p.y - step.y);
    if (d < step.r) advanceStep(G);
  } else if (step.type === 'escape') {
    if (G.wanted <= 0) {
      m.escapeTimer -= dt;
      if (m.escapeTimer <= 0) advanceStep(G);
    } else {
      m.escapeTimer = step.seconds;
    }
    m.objective = `${step.text} — ${Math.ceil(m.escapeTimer)} dtk`;
  } else if (step.type === 'kill') {
    if (m.killCount >= step.count) {
      // Musuh sudah habis: lanjut.
      advanceStep(G);
    }
  } else if (step.type === 'race' && m.race) {
    const race = m.race;
    race.time += dt;
    const cp = race.checkpoints[race.next];
    if (cp && Math.hypot(p.x - cp.x, p.y - cp.y) < 110) {
      cp.done = true;
      race.next += 1;
      if (G.audio) G.audio.pickup();
      if (race.next >= race.checkpoints.length) {
        // Menang jika rival belum selesai.
        const rivalBest = Math.max(...race.rivals.map((r) => r.cp));
        if (race.next > rivalBest) advanceStep(G);
        else m.objective = 'Kalah balapan! Coba lagi — tekan Enter untuk ulang misi';
      }
    }
    // Rival AI: kejar checkpoint berikutnya.
    for (const r of race.rivals) {
      const target = race.checkpoints[Math.min(r.cp, race.checkpoints.length - 1)];
      if (!target) continue;
      const dx = target.x - r.x; const dy = target.y - r.y;
      const d = Math.hypot(dx, dy);
      if (d < 110) { r.cp += 1; continue; }
      const want = Math.atan2(dy, dx);
      let da = want - r.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      r.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, da));
      r.speed = Math.min(r.top, r.speed + r.accel * dt);
      r.x += Math.cos(r.angle) * r.speed * dt;
      r.y += Math.sin(r.angle) * r.speed * dt;
    }
    m.objective = `${step.text} — checkpoint ${race.next}/${race.checkpoints.length} (${Math.floor(race.time)} dtk)`;
  }
}

// Event dari sistem lain (bunuh musuh, curi mobil, dll).
export function onMissionEvent(G, ev) {
  const m = G.mission;
  if (ev === 'enemyKilled' && m.rampage) m.rampage.score += 10;
  if (ev === 'pedKilled' && m.rampage) m.rampage.score += 5;
  if (ev === 'enemyKilled' && m.started && m.index >= 0) {
    const step = MISSION_DEFS[m.index].steps[m.step];
    if (step && step.type === 'kill') {
      m.killCount += 1;
      m.objective = `${step.text} — ${m.killCount}/${step.count} dikalahkan`;
    }
  }
  if (ev === 'copKilled') addWanted(G, 1);
  if (ev === 'pedKilled') addWanted(G, 1);
  if (ev === 'stoleCar') addWanted(G, 1);
  if (ev === 'wasted') {
    G.player.cash = Math.max(0, Math.floor(G.player.cash * 0.9));
    respawn(G, 'hospital');
  }
  if (ev === 'busted') {
    const fine = Math.min(G.player.cash, 100 + G.wanted * 50);
    G.player.cash -= fine;
    G.wanted = 0;
    G.cops.length = 0;
    respawn(G, 'police');
  }
}

function respawn(G, where) {
  const p = G.player;
  p.health = 100;
  p.armor = 0;
  if (p.vehicle) { p.vehicle.driver = null; p.vehicle = null; }
  p.onFoot = true;
  if (where === 'hospital') {
    p.x = 1250; p.y = 2650;
    G.mission.banner = 'WASTED — dirawat di RS, uang dipotong 10%';
  } else {
    p.x = 1250; p.y = 450;
    G.mission.banner = 'BUSTED — ditahan, denda dibayar';
  }
  p.invuln = 2;
}

export function startTaxi(G) {
  if (G.mission.taxi) return;
  G.mission.taxi = { px: 0, py: 0, fare: 0, state: 'pickup' };
  const a = G.rng.range(0, Math.PI * 2);
  G.mission.taxi.px = Math.max(100, Math.min(3100, G.player.x + Math.cos(a) * 600));
  G.mission.taxi.py = Math.max(100, Math.min(3100, G.player.y + Math.sin(a) * 600));
  G.mission.objective = 'Taksi: jemput penumpang (blip kuning)';
}

export function startRampage(G) {
  if (G.mission.rampage) return;
  G.mission.rampage = { time: 60, score: 0 };
  addWanted(G, 2);
  G.mission.banner = 'RAMPAGE! 60 detik chaos — hancurkan sebanyak mungkin!';
}
