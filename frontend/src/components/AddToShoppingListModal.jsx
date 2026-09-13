import { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import { unitConversion } from '../utils/UnitConversion';
import { fetchShoppingLists, addIngredientsToList } from '../utils/shoppingListApi';

/**
 * Modal for picking which of a recipe's ingredients to add to one of the
 * user's shopping lists. All ingredients start checked.
 *
 * The caller should only render this component while it's meant to be
 * open (e.g. `{showAddToList && <AddToShoppingListModal ... />}`) so each
 * open is a fresh mount with checkedIds correctly defaulted.
 *
 * Props:
 * - onClose: called when the backdrop, Cancel, or a successful Add is clicked
 * - ingredients: recipe.ingredients array ({ id, name, amount, unit, notes })
 */
function AddToShoppingListModal({ onClose, ingredients }) {
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState(null);
  const [checkedIds, setCheckedIds] = useState(() => new Set(ingredients.map((ing) => ing.id)));
  const [saving, setSaving] = useState(false);

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

  return (
    <div
      className="fixed inset-0 p-1 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-beige rounded-xl p-2 w-full max-w-[320px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-dark-green text-h3 mb-2">Add to Shopping List</h2>

        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setCheckedIds(new Set(ingredients.map((ing) => ing.id)))}
            className="text-blue text-body-2 cursor-pointer underline"
          >
            Check all
          </button>
          <button
            type="button"
            onClick={() => setCheckedIds(new Set())}
            className="text-blue text-body-2 cursor-pointer underline"
          >
            Clear all
          </button>
        </div>

        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto mb-2">
          {ingredients.map((ing) => (
            <label
              key={ing.id}
              className="flex items-center gap-2 text-dark-green text-body-1 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checkedIds.has(ing.id)}
                onChange={() => toggleIngredient(ing.id)}
                className="w-2 h-2 accent-blue cursor-pointer"
              />
              {unitConversion(ing.amount)} {ing.unit} {ing.name}
            </label>
          ))}
        </div>

        {lists.length === 0 ? (
          <p className="text-dark-green text-body-2 opacity-60 mb-2">
            Create a shopping list first.
          </p>
        ) : (
          <div className="mb-2">
            <CustomSelect
              value={selectedListId != null ? String(selectedListId) : ''}
              onChange={(val) => setSelectedListId(Number(val))}
              options={lists.map((l) => ({ value: String(l.id), label: l.name }))}
              size="compact"
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || lists.length === 0 || checkedIds.size === 0}
          className="w-full bg-blue text-beige p-1 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Adding...' : 'Add'}
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

export default AddToShoppingListModal;
