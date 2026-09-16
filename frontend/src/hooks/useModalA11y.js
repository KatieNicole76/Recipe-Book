import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal accessibility behavior: focuses the dialog panel on open,
 * traps Tab navigation inside it, closes on Escape, and returns focus to
 * whatever triggered it on close.
 *
 * Must be called unconditionally (before any early `if (!open) return null`)
 * since it's a hook — it's a no-op internally whenever `open` is false.
 *
 * Returns a ref to attach to the dialog panel element (not the backdrop).
 */
export function useModalA11y(open, onClose) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement;
    panelRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus?.();
    };
  }, [open, onClose]);

  return panelRef;
}
