import { useState, useId } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';

/**
 * Generic action-list modal. Centered overlay with one full-width button
 * per option, plus a Cancel button.
 *
 * Props:
 * - open: whether the modal is visible
 * - onClose: called when the backdrop or Cancel is clicked
 * - title: heading shown at the top of the modal
 * - options: array of { label, onClick, destructive }
 */
function OptionsModal({ open, onClose, title, options }) {
  const [submitting, setSubmitting] = useState(false);
  const titleId = useId();
  const panelRef = useModalA11y(open, onClose);

  if (!open) return null;

  const handleOptionClick = async (onClick) => {
    setSubmitting(true);
    try {
      await onClick();
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
        <div className="flex flex-col gap-1">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => handleOptionClick(opt.onClick)}
              disabled={submitting}
              className={`w-full text-left px-2 py-1 rounded-lg text-body-1 cursor-pointer hover:bg-white/50 disabled:opacity-50 ${
                opt.destructive ? 'text-danger' : 'text-dark-green'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          disabled={submitting}
          className="w-full bg-blue hover:bg-blue-dark text-beige text-body-1 p-1 rounded-full mt-2 cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default OptionsModal;
