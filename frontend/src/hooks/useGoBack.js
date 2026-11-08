import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Returns a function that goes back to whatever screen the user was on
 * before this one. When there's no in-app history to pop (location.key is
 * 'default' — e.g. a fresh page load straight to this URL), it goes to
 * `fallback` instead, replacing the current entry so the browser's own back
 * button doesn't bounce them back here.
 */
export function useGoBack(fallback = '/') {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (location.key === 'default') {
      navigate(fallback, { replace: true });
    } else {
      navigate(-1);
    }
  }, [navigate, location.key, fallback]);
}
