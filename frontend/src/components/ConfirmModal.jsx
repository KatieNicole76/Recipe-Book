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
 */
function ConfirmModal({ open, onClose, title, message, confirmLabel = 'Confirm', onConfirm }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 p-1 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-beige rounded-xl p-2 w-full max-w-[320px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-dark-green text-h3 mb-2">{title}</h2>
        {message && <p className="text-dark-green text-body-1 mb-3">{message}</p>}
        <button
          type="button"
          onClick={onConfirm}
          className="w-full bg-red-800 text-beige p-1 rounded-full cursor-pointer"
        >
          {confirmLabel}
        </button>
        <button
          onClick={onClose}
          className="w-full text-blue p-1 rounded-full mt-1 cursor-pointer text-body-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ConfirmModal;
