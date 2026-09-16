import { useState, useEffect, useId } from 'react';
import CustomSelect from './CustomSelect';
import { unitConversion } from '../utils/UnitConversion';
import { fetchShoppingLists, addIngredientsToList } from '../utils/shoppingListApi';
import { useModalA11y } from '../hooks/useModalA11y';

function AddToShoppingListModal({ onClose, ingredients }) {
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState(null);
  const [checkedIds, setCheckedIds] = useState(() => new Set(ingredients.map((ing) => ing.id)));
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const noListsId = useId();
  const panelRef = useModalA11y(true, onClose);

  useEffect(() => {
    fetchShoppingLists()
      .then((data) => {
        setLists(data);
        setSelectedListId(data.length > 0 ? data[0].id : null);
      })
      .catch(() => setLists([]));
  }, []);

  const toggleIngredient = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    const selected = ingredients.filter((ing) => checkedIds.has(ing.id));
    if (!selectedListId || selected.length === 0) return;

    setSaving(true);
    try {
      await addIngredientsToList(
        selectedListId,
        selected.map((ing) => ({ name: ing.name, amount: ing.amount, unit: ing.unit }))
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const disabledReason =
    lists.length === 0
      ? 'Create a shopping list first'
      : checkedIds.size === 0
      ? 'Select at least one ingredient'
      : null;

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
        <h2 id={titleId} className="text-dark-green text-h3 mb-2">Add to Shopping List</h2>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setCheckedIds(new Set(ingredients.map((ing) => ing.id)))}
            className="text-blue hover:text-blue-dark text-body-2 cursor-pointer underline"
          >
            Check all
          </button>
          <button
            type="button"
            onClick={() => setCheckedIds(new Set())}
            className="text-blue hover:text-blue-dark text-body-2 cursor-pointer underline"
          >
            Clear all
          </button>
        </div>

        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto mb-2">
          {ingredients.map((ing) => (
            <label
              key={ing.id}
              className="flex gap-2 text-dark-green text-body-1 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checkedIds.has(ing.id)}
                onChange={() => toggleIngredient(ing.id)}
                className="w-2 h-2 accent-blue cursor-pointer mt-0.5"
              />
              {unitConversion(ing.amount)} {ing.unit} {ing.name}
            </label>
          ))}
        </div>

        {lists.length === 0 ? (
          <p id={noListsId} className="text-dark-green text-body-2 opacity-60 mb-2">
            Create a shopping list first.
          </p>
        ) : (
          <div className="mb-2">
            <CustomSelect
              value={selectedListId != null ? String(selectedListId) : ''}
              onChange={(val) => setSelectedListId(Number(val))}
              options={lists.map((l) => ({ value: String(l.id), label: l.name }))}
              size="compact"
              ariaLabel="Shopping list"
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || lists.length === 0 || checkedIds.size === 0}
          title={disabledReason || undefined}
          aria-describedby={lists.length === 0 ? noListsId : undefined}
          className="w-full text-body-1 bg-blue hover:bg-blue-dark text-beige p-1 rounded-full cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Adding...' : 'Add'}
        </button>
        <button
          onClick={onClose}
          className="w-full text-blue p-1 rounded-full
            mt-1 cursor-pointer text-body-2 hover:bg-white/50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default AddToShoppingListModal;
