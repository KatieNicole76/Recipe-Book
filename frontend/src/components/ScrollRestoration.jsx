import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'scroll-positions';
const MAX_RESTORE_FRAMES = 60; // ~1s — gives cached lists a moment to render

function readPositions() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writePositions(positions) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // storage unavailable — scroll just won't be remembered
  }
}

/**
 * Remembers the window's scroll position for each history entry, so going
 * back (the back arrow or the browser's back) to e.g. the recipe list
 * lands where the user left off instead of at the top. New screens
 * (pushes/replaces) start at the top.
 *
 * Needed because the app uses <BrowserRouter>, where React Router's own
 * <ScrollRestoration> isn't available.
 */
function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(readPositions());

  // Let us control scrolling instead of the browser guessing (it can't,
  // since the page content is rendered after navigation).
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  // Which history entry scroll events belong to. Updated in the layout
  // effect below *before* it scrolls, so the jump to the new screen's
  // position is never saved against the screen being left.
  const currentKey = useRef(location.key);

  // Keep saving the current entry's position while the user scrolls, so
  // it's already recorded by the time they navigate away.
  useEffect(() => {
    let frame = null;
    const save = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        positions.current[currentKey.current] = window.scrollY;
        writePositions(positions.current);
      });
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      window.removeEventListener('scroll', save);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    currentKey.current = location.key;
    const target = navigationType === 'POP' ? positions.current[location.key] : 0;
    if (!target) {
      window.scrollTo(0, 0);
      return undefined;
    }

    // The page may not be tall enough yet on the first frame (lists render
    // from cache or after a fetch), so keep trying briefly until it fits.
    let frames = 0;
    let frame = null;
    const tryRestore = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.min(target, maxScroll));
      if (maxScroll < target && frames++ < MAX_RESTORE_FRAMES) {
        frame = requestAnimationFrame(tryRestore);
      }
    };
    tryRestore();
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [location.key, navigationType]);

  return null;
}

export default ScrollRestoration;
