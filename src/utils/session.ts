import { SESSION_KEY, SESSION_DURATION_MINUTES } from "../constants/auth";

export function setSessionExpiry(): void {
  const expiresAt = Date.now() + SESSION_DURATION_MINUTES * 60 * 1000;
  try {
    localStorage.setItem(SESSION_KEY, String(expiresAt));
  } catch {
    // ignore
  }
}

export function isSessionExpired(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return true;
    const expiresAt = parseInt(raw, 10);
    if (Number.isNaN(expiresAt)) return true;
    return Date.now() >= expiresAt;
  } catch {
    return true;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function getRemainingMinutes(): number {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return 0;
    const expiresAt = parseInt(raw, 10);
    if (Number.isNaN(expiresAt)) return 0;
    const ms = expiresAt - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (60 * 1000));
  } catch {
    return 0;
  }
}
