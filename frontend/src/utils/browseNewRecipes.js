import { getStorageItem, setStorageItem } from './safeStorage';

/**
 * Works out which Browse recipes count as "new" for this user, with a
 * same-day buffer:
 *
 * - "New" means added after `baseline`.
 * - Every Browse visit records `lastVisit`.
 * - The baseline only moves forward (to the previous visit's time) on the
 *   first visit of a new day. So within one day the "new" list stays put
 *   while the user goes back and forth reviewing it, and anything added
 *   in the meantime joins it. The next day, what they already saw drops
 *   off, while recipes added after their last visit stay new.
 * - Before any recorded visit, everything counts as new.
 *
 * Stored per user in this browser's localStorage, so it's per device.
 * Call once per Browse visit; returns the baseline as a timestamp (ms).
 */
export function recordBrowseVisit(username) {
  const key = `browse-visits:${username || 'anonymous'}`;
  let state;
  try {
    state = JSON.parse(getStorageItem(key));
  } catch {
    state = null;
  }

  const now = Date.now();
  let baseline = state?.baseline ?? 0;
  if (state?.lastVisit && !isSameLocalDay(state.lastVisit, now)) {
    baseline = state.lastVisit;
  }

  setStorageItem(key, JSON.stringify({ baseline, lastVisit: now }));
  return baseline;
}

function isSameLocalDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
