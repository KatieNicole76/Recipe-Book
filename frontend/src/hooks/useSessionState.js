import { useEffect, useState } from 'react';

/**
 * useState that survives leaving and coming back to a screen (e.g. a
 * search or filter selection), by mirroring the value into sessionStorage
 * under `key`. It lasts for the browser tab's session and resets when the
 * app is fully closed. Pass a null key to fall back to plain useState.
 */
export function useSessionState(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (!key) return initialValue;
    try {
      const stored = sessionStorage.getItem(key);
      return stored != null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (!key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable (private mode, quota) — state still works in memory
    }
  }, [key, value]);

  return [value, setValue];
}
