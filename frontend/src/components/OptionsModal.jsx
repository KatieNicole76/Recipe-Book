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
        <div className="flex flex-col gap-1">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={opt.onClick}
              className={`w-full text-left px-2 py-1 rounded-lg text-body-1 cursor-pointer hover:bg-white/50 ${
                opt.destructive ? 'text-red-600' : 'text-dark-green'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full bg-blue text-beige p-1 rounded-full mt-2 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default OptionsModal;
