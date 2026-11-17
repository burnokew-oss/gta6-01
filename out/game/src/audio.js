// Semua suara disintesis WebAudio — tanpa file audio sama sekali.
// AudioContext dibuat malas (setelah interaksi pertama) supaya tidak diblokir browser.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
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
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol) {
    if (!ensure() || muted) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(master);
      o.start(); o.stop(ctx.currentTime + dur);
    } catch { /* suara opsional */ }
  }

  function noise(dur, vol, filterFreq) {
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
      g.gain.value = vol || 0.3;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
    } catch { /* suara opsional */ }
  }

  const NOTES = [55, 0, 55, 65.4, 0, 55, 82.4, 0, 73.4, 65.4, 55, 0];
  let noteIndex = 0;

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
    isMuted() { return muted; },
    shoot() { noise(0.12, 0.35, 2500); },
    punch() { noise(0.08, 0.3, 500); blip(90, 0.1, 'sine', 0.25); },
    pickup() { blip(660, 0.08, 'sine', 0.2); blip(990, 0.12, 'sine', 0.2); },
    crash() { noise(0.3, 0.4, 700); },
    explosion() { noise(0.7, 0.5, 400); blip(50, 0.5, 'sine', 0.4); },
    missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.22), i * 110)); },
    wantedUp() { blip(220, 0.15, 'sawtooth', 0.2); blip(165, 0.2, 'sawtooth', 0.2); },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTimer = setInterval(() => {
        if (muted) return;
        const f = NOTES[noteIndex % NOTES.length];
        noteIndex += 1;
        if (f) blip(f, 0.22, 'triangle', 0.1);
        if (noteIndex % 4 === 0) noise(0.03, 0.05, 6000);
      }, 240);
    },
    stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } },
    engine(on, speedRatio) {
      if (!ensure()) return;
      try {
        if (on && !muted) {
          if (!engineOsc) {
            engineOsc = ctx.createOscillator();
            engineGain = ctx.createGain();
            engineOsc.type = 'sawtooth';
            engineGain.gain.value = 0.03;
            engineOsc.connect(engineGain); engineGain.connect(master);
            engineOsc.start();
          }
          engineOsc.frequency.value = 60 + speedRatio * 140;
          engineGain.gain.value = 0.02 + speedRatio * 0.05;
        } else if (engineOsc) {
          engineOsc.stop(); engineOsc.disconnect();
          engineOsc = null; engineGain = null;
        }
      } catch { /* abaikan */ }
    },
    siren(on) {
      if (!ensure()) return;
      try {
        if (on && !muted) {
          if (!sirenOsc) {
            sirenOsc = ctx.createOscillator();
            sirenGain = ctx.createGain();
            sirenOsc.type = 'sine';
            sirenGain.gain.value = 0.04;
            sirenOsc.connect(sirenGain); sirenGain.connect(master);
            sirenOsc.start();
            let hi = false;
            sirenOsc._t = setInterval(() => {
              if (sirenOsc) { hi = !hi; sirenOsc.frequency.value = hi ? 880 : 660; }
            }, 450);
          }
        } else if (sirenOsc) {
          clearInterval(sirenOsc._t);
          sirenOsc.stop(); sirenOsc.disconnect();
          sirenOsc = null; sirenGain = null;
        }
      } catch { /* abaikan */ }
    },
  };
}
