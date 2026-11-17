// Input keyboard + mouse. Aksi sekali-tekan dikonsumsi lewat takeActions()
// supaya menu dan interaksi tidak ke-trigger dua kali.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_STEAL = 8;
export const ACTION_RELOAD = 16;
export const ACTION_MUTE = 32;

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
      if (!e.repeat) {
        if (name === 'confirm') actions |= ACTION_CONFIRM;
        if (name === 'pause') actions |= ACTION_PAUSE;
        if (name === 'enter') actions |= ACTION_ENTER;
        if (name === 'steal') actions |= ACTION_STEAL;
        if (name === 'reload') actions |= ACTION_RELOAD;
        if (name === 'mute') actions |= ACTION_MUTE;
      }
      keys[name] = true;
      if (['up', 'down', 'left', 'right', 'brake'].includes(name)) e.preventDefault();
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

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });

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
