// Semua suara disintesis WebAudio — tanpa file audio sama sekali.
// AudioContext dibuat malas (setelah interaksi pertama) supaya tidak diblokir browser.
export function createAudio() {
  // Volume + nada dasar. Mengubah angka di sini mengubah semua suara
  // yang memakainya, jadi penyeimbang suara cukup sentuh blok ini.
  const MASTER_VOLUME = 0.5;
  const BLIP_VOLUME = 0.15;
  const NOISE_VOLUME = 0.3;
  const MUSIC_STEP_MS = 240;
  const MUSIC_NOTE_DUR = 0.22;
  const MUSIC_NOTE_VOLUME = 0.1;
  // Bassline looping (0 = jeda): A1, A1, B1, E2, D2 — tempo 240 ms/nada.
  const MUSIC_NOTES = [55, 0, 55, 65.4, 0, 55, 82.4, 0, 73.4, 65.4, 55, 0];
  const MUSIC_HAT_EVERY = 4; // hi-hat tiap 4 nada
  const ENGINE_BASE_FREQ = 60;
  const ENGINE_FREQ_SPAN = 140;
  const ENGINE_BASE_GAIN = 0.03;
  const ENGINE_GAIN_MIN = 0.02;
  const ENGINE_GAIN_SPAN = 0.05;
  const SIREN_FREQ_LOW = 660;
  const SIREN_FREQ_HIGH = 880;
  const SIREN_SWAP_MS = 450;
  const SIREN_GAIN = 0.04;

  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let noteIndex = 0;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  // Satu nada oscillator dengan envelope turun eksponensial.
  function tone(freq, dur, type, vol) {
    if (!ensure() || muted) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || BLIP_VOLUME, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(master);
      o.start(); o.stop(ctx.currentTime + dur);
    } catch { /* suara opsional */ }
  }

  // Satu semburan noise putih (memudar) lewat lowpass filter.
  function burst(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
      const g = ctx.createGain();
      g.gain.value = vol || NOISE_VOLUME;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
    } catch { /* suara opsional */ }
  }

  // Oscillator looping (mesin/sirene): dibuat sekali, lalu hanya
  // frekuensi/gain-nya yang diubah tiap frame; dimatikan lewat stopLoop().
  function startLoop(type, gainValue) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    gain.gain.value = gainValue;
    osc.connect(gain); gain.connect(master);
    osc.start();
    return { osc, gain };
  }

  function stopLoop(loop) {
    loop.osc.stop();
    loop.osc.disconnect();
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : MASTER_VOLUME; },
    isMuted() { return muted; },
    shoot() { burst(0.12, 0.35, 2500); },
    punch() { burst(0.08, 0.3, 500); tone(90, 0.1, 'sine', 0.25); },
    pickup() { tone(660, 0.08, 'sine', 0.2); tone(990, 0.12, 'sine', 0.2); },
    crash() { burst(0.3, 0.4, 700); },
    explosion() { burst(0.7, 0.5, 400); tone(50, 0.5, 'sine', 0.4); },
    missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.22), i * 110)); },
    wantedUp() { tone(220, 0.15, 'sawtooth', 0.2); tone(165, 0.2, 'sawtooth', 0.2); },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTimer = setInterval(() => {
        if (muted) return;
        const f = MUSIC_NOTES[noteIndex % MUSIC_NOTES.length];
        noteIndex += 1;
        if (f) tone(f, MUSIC_NOTE_DUR, 'triangle', MUSIC_NOTE_VOLUME);
        if (noteIndex % MUSIC_HAT_EVERY === 0) burst(0.03, 0.05, 6000);
      }, MUSIC_STEP_MS);
    },
    stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } },
    engine(on, speedRatio) {
      if (!ensure()) return;
      try {
        if (on && !muted) {
          if (!engineOsc) {
            ({ osc: engineOsc, gain: engineGain } = startLoop('sawtooth', ENGINE_BASE_GAIN));
          }
          engineOsc.frequency.value = ENGINE_BASE_FREQ + speedRatio * ENGINE_FREQ_SPAN;
          engineGain.gain.value = ENGINE_GAIN_MIN + speedRatio * ENGINE_GAIN_SPAN;
        } else if (engineOsc) {
          stopLoop({ osc: engineOsc, gain: engineGain });
          engineOsc = null; engineGain = null;
        }
      } catch { /* abaikan */ }
    },
    siren(on) {
      if (!ensure()) return;
      try {
        if (on && !muted) {
          if (!sirenOsc) {
            ({ osc: sirenOsc, gain: sirenGain } = startLoop('sine', SIREN_GAIN));
            let hi = false;
            sirenOsc._t = setInterval(() => {
              if (sirenOsc) { hi = !hi; sirenOsc.frequency.value = hi ? SIREN_FREQ_HIGH : SIREN_FREQ_LOW; }
            }, SIREN_SWAP_MS);
          }
        } else if (sirenOsc) {
          clearInterval(sirenOsc._t);
          stopLoop({ osc: sirenOsc, gain: sirenGain });
          sirenOsc = null; sirenGain = null;
        }
      } catch { /* abaikan */ }
    },
  };
}
