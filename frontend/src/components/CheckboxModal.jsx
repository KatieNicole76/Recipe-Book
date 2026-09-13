import { useState } from 'react';

/**
 * Generic checkbox-list modal. Centered overlay with a scrollable list of
 * checkable options and a "Done" button to close.
 *
 * Props:
 * - open: whether the modal is visible
 * - onClose: called when the backdrop or "Done" is clicked
 * - title: heading shown at the top of the modal
 * - options: array of { value, label }
 * - selected: array of currently-checked values
 * - onToggle(value): called when an option's checkbox is toggled
 * - emptyMessage: shown instead of the list when options is empty
 * - onAddNew(value): optional — when provided, shows a "+ Add New" control
 *   at the bottom that reveals a text input for adding a new option
 * - addNewLabel: label for the "+ Add New" control
 */
function CheckboxModal({
  open,
  onClose,
  title,
  options,
  selected,
  onToggle,
  emptyMessage = 'Nothing here yet',
  onAddNew,
  addNewLabel = '+ Add New',
}) {
  const [showNewInput, setShowNewInput] = useState(false);
  const [newValue, setNewValue] = useState('');

  if (!open) return null;

  const submitNew = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    onAddNew(trimmed);
    setNewValue('');
    setShowNewInput(false);
  };

  const handleNewKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitNew();
    }
  };

  return (
    <div
      className="fixed inset-0 p-1 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-beige rounded-xl p-2 w-full max-w-[320px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-dark-green text-h3 mb-2">{title}</h2>

        {options.length === 0 ? (
          <p className="text-dark-green text-body-2 opacity-60 px-1 py-2">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1 text-dark-green text-body-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => onToggle(opt.value)}
                  className="w-2 h-2 cursor-pointer accent-blue"
                />
                {opt.label}
              </label>
            ))}
          </div>
        )}

        {onAddNew && (
          <div className="mt-2">
            {showNewInput ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="New tag name"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={handleNewKeyDown}
                  autoFocus
                  className="flex-1 p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={submitNew}
                  className="bg-blue text-beige px-3 rounded-lg cursor-pointer text-body-2"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewInput(true)}
                className="text-blue text-body-2 cursor-pointer"
              >
                {addNewLabel}
              </button>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-blue text-beige p-1 rounded-full mt-2 cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default CheckboxModal;