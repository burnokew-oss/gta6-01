// Input keyboard + mouse. Aksi sekali-tekan dikonsumsi lewat takeActions()
// supaya menu dan interaksi tidak ke-trigger dua kali.
//
// Satu tombol fisik bisa memetakan ke satu nama aksi (KEYMAP) dan satu nama
// aksi bisa memetakan ke satu bit aksi sekali-tekan (ACTION_BIT). Tombol
// gerak + rem menahan scroll halaman, jadi default browser-nya dicegah.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_STEAL = 8;
export const ACTION_RELOAD = 16;
export const ACTION_MUTE = 32;

// Nama aksi yang menghasilkan satu bit aksi sekali-tekan saat ditekan
// (bukan saat ditahan / repeat).
const ACTION_BIT = {
  confirm: ACTION_CONFIRM,
  pause: ACTION_PAUSE,
  enter: ACTION_ENTER,
  steal: ACTION_STEAL,
  reload: ACTION_RELOAD,
  mute: ACTION_MUTE,
};

// Tombol yang default browser-nya dicegah (panah + spasi = scroll halaman).
const PREVENT_DEFAULT_ACTIONS = new Set(['up', 'down', 'left', 'right', 'brake']);

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'brake',
  KeyE: 'enter',
  KeyF: 'steal',
  KeyR: 'reload',
  KeyM: 'mute',
  KeyT: 'taxi',
  KeyG: 'rampage',
  Enter: 'confirm',
  Escape: 'pause',
};

export function createInput(canvas) {
  const keys = {};
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  let actions = 0;

  function onKeyDown(e) {
    const name = KEYMAP[e.code];
    if (name) {
      if (!e.repeat && ACTION_BIT[name]) actions |= ACTION_BIT[name];
      keys[name] = true;
      if (PREVENT_DEFAULT_ACTIONS.has(name)) e.preventDefault();
    }
    if (e.code === 'Space') e.preventDefault();
  }
  function onKeyUp(e) {
    const name = KEYMAP[e.code];
    if (name) keys[name] = false;
  }
  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  }
  function onMouseDown(e) {
    onMouseMove(e);
    mouse.down = true;
    mouse.clicked = true;
    actions |= ACTION_CONFIRM;
  }
  function onMouseUp() { mouse.down = false; }

  function clearKeys() {
    for (const k in keys) keys[k] = false;
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', clearKeys);

  return {
    keys, mouse,
    axisX() { return (keys.right ? 1 : 0) - (keys.left ? 1 : 0); },
    axisY() { return (keys.down ? 1 : 0) - (keys.up ? 1 : 0); },
    running() { return !!keys.run; },
    braking() { return !!keys.brake; },
    firing() { return mouse.down; },
    takeActions() {
      const a = actions;
      actions = 0;
      mouse.clicked = false;
      return a;
    },
  };
}
