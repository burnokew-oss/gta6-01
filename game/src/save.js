// Save/load localStorage, 3 slot. Hanya data progres, bukan seluruh dunia.
import { SAVE_KEY } from './config.js';

export function loadSaves() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return [null, null, null];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [null, null, null];
  } catch {
    return [null, null, null];
  }
}

export function writeSave(slot, data) {
  const saves = loadSaves();
  saves[slot] = { ...data, savedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    return true;
  } catch {
    return false;
  }
}

export function readSave(slot) {
  return loadSaves()[slot] || null;
}
