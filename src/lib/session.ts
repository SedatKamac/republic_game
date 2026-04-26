// Session storage for player identity. Anonymous + display name only.
// Survives reconnects within a tab; cleared on tab close.

const KEY_PLAYER_ID = "consensus.playerId";
const KEY_DISPLAY_NAME = "consensus.displayName";
const KEY_LAST_ROOM = "consensus.lastRoom";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getOrCreatePlayerId(): string {
  if (!isBrowser()) return "";
  let id = sessionStorage.getItem(KEY_PLAYER_ID);
  if (!id) {
    id = `p_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
    sessionStorage.setItem(KEY_PLAYER_ID, id);
  }
  return id;
}

export function getDisplayName(): string {
  if (!isBrowser()) return "";
  return sessionStorage.getItem(KEY_DISPLAY_NAME) ?? "";
}

export function setDisplayName(name: string) {
  if (!isBrowser()) return;
  sessionStorage.setItem(KEY_DISPLAY_NAME, name);
}

export function getLastRoom(): string | null {
  if (!isBrowser()) return null;
  return sessionStorage.getItem(KEY_LAST_ROOM);
}

export function setLastRoom(code: string | null) {
  if (!isBrowser()) return;
  if (code) sessionStorage.setItem(KEY_LAST_ROOM, code);
  else sessionStorage.removeItem(KEY_LAST_ROOM);
}
