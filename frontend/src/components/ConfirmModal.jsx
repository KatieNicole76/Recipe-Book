import { useState, useId } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import ErrorText from './ErrorText';

/**
 * Generic "are you sure?" confirmation modal.
 *
 * Props:
 * - open: whether the modal is visible
 * - onClose: called when the backdrop or Cancel is clicked
 * - title: heading shown at the top of the modal
 * - message: body text
 * - confirmLabel: text for the confirm button (default "Confirm")
 * - onConfirm: called when the confirm button is clicked
 * - error: optional error message shown inside the dialog (e.g. after a
 *   failed confirm) — the caller owns this state since only it knows why
 *   its action failed
 */
function ConfirmModal({ open, onClose, title, message, confirmLabel = 'Confirm', onConfirm, error }) {
  const [submitting, setSubmitting] = useState(false);
  const titleId = useId();
  const panelRef = useModalA11y(open, onClose);

  if (!open) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 p-1 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-beige rounded-xl p-2 w-full max-w-[320px] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-dark-green text-h3 mb-2">{title}</h2>
        {message && <p className="text-dark-green text-body-1 mb-3">{message}</p>}
        <ErrorText>{error}</ErrorText>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full bg-danger text-beige text-body-1 p-1 rounded-full cursor-pointer disabled:opacity-50"
        >
          {submitting ? 'Working...' : confirmLabel}
        </button>
        <button
          onClick={onClose}
          disabled={submitting}
          className="w-full text-blue hover:text-blue-dark p-1 rounded-full mt-1 cursor-pointer text-body-2 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ConfirmModal;
