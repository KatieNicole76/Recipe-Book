import { useState, useId } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CustomSelect from './CustomSelect';
import { queryKeys } from '../queryKeys';
import { unitConversion, pluralizeUnit } from '../utils/UnitConversion';
import { fetchShoppingLists, addIngredientsToList } from '../utils/shoppingListApi';
import { addToMealPlan } from '../utils/mealPlanApi';
import { useModalA11y } from '../hooks/useModalA11y';

function AddToShoppingListModal({ onClose, ingredients, recipeId }) {
  const queryClient = useQueryClient();
  const { data: lists = [] } = useQuery({
    queryKey: queryKeys.shoppingLists,
    queryFn: fetchShoppingLists,
  });
  const [selectedListId, setSelectedListId] = useState(null);
  const [checkedIds, setCheckedIds] = useState(() => new Set(ingredients.map((ing) => ing.id)));
  const [addMealPlan, setAddMealPlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const noListsId = useId();
  const panelRef = useModalA11y(true, onClose);

  const effectiveListId = selectedListId ?? lists[0]?.id ?? null;

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

  const wantsShoppingListAdd = checkedIds.size > 0;
  const canSubmit = (wantsShoppingListAdd && effectiveListId) || addMealPlan;

  const handleAdd = async () => {
    setSaving(true);
    try {
      if (wantsShoppingListAdd && effectiveListId) {
        const selected = ingredients.filter((ing) => checkedIds.has(ing.id));
        const updated = await addIngredientsToList(
          effectiveListId,
          selected.map((ing) => ({ name: ing.name, amount: ing.amount, unit: ing.unit }))
        );
        queryClient.setQueryData(queryKeys.shoppingLists, (prev = []) =>
          prev.map((l) => (l.id === updated.id ? updated : l))
        );
      }
      if (addMealPlan && recipeId) {
        await addToMealPlan([recipeId]);
        queryClient.invalidateQueries({ queryKey: queryKeys.mealPlan });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const disabledReason = !canSubmit
    ? (lists.length === 0 ? 'Create a shopping list first, or check "Add to meal plan"' : 'Select at least one ingredient, or check "Add to meal plan"')
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
              {unitConversion(ing.amount)} {pluralizeUnit(ing.unit, ing.amount)} {ing.name}
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
              value={effectiveListId != null ? String(effectiveListId) : ''}
              onChange={(val) => setSelectedListId(Number(val))}
              options={lists.map((l) => ({ value: String(l.id), label: l.name }))}
              size="compact"
              ariaLabel="Shopping list"
            />
          </div>
        )}

        {recipeId && (
          <label className="flex items-center gap-2 text-dark-green text-body-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={addMealPlan}
              onChange={(e) => setAddMealPlan(e.target.checked)}
              className="w-2 h-2 accent-blue cursor-pointer"
            />
            Add to meal plan
          </label>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !canSubmit}
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
