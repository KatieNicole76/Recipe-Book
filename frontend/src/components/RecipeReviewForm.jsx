import { useState, useEffect, useRef } from 'react';
import CustomSelect from './CustomSelect';
import Pill from './Pill';
import CheckboxModal from './CheckboxModal';
import { apiFetch } from '../api';
import { parseAmountInput, roundAmount, unitConversion } from '../utils/UnitConversion';
import { prepareRecipeForSave, saveRecipe } from '../utils/recipeApi';

const RECIPE_TYPES = ['dinner', 'lunch', 'breakfast', 'dessert', 'side', 'snack', 'other'];
const UNITS = ['tsp', 'tbsp', 'cup', 'fl_oz', 'g', 'oz', 'pinch', 'piece', 'can', 'package', 'whole', ''];

/**
 * Generic recipe review/edit form.
 *
 * Props:
 * - initialData: recipe-shaped object (title, recipe_type, is_meal_preppable,
 *   steps, ingredients, tags) to start the form from. Works whether that data
 *   just came from an extraction, or from an existing saved recipe you're editing.
 * - imageFile: optional File to upload alongside the save (only relevant
 *   right after a photo extraction — omit when editing an existing recipe).
 * - recipeId: optional — pass this when editing an existing recipe so a
 *   future update endpoint can be wired in without changing this form again.
 * - onSaved(savedRecipe): called after a successful save.
 * - onDiscard(): optional — if provided, shows a "Discard" button that calls it.
 * - saveButtonLabel: optional override for the save button's default text.
 */

function RecipeReviewForm({
  initialData,
  imageFile = null,
  recipeId = null,
  onSaved,
  onDiscard,
  saveButtonLabel = 'Save Recipe',
  discardLabel = 'Discard & Start Over',
}) {
  const [result, setResult] = useState(() => ({
    tags: [],
    ...initialData,
    ingredients: (initialData.ingredients || []).map((ing) => ({
      ...ing,
      amount: ing.amount != null ? roundAmount(ing.amount) : null,
    })),
  }));
  const [existingTags, setExistingTags] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [photoFile, setPhotoFile] = useState(imageFile);
  const [photoPreview, setPhotoPreview] = useState(
    imageFile ? URL.createObjectURL(imageFile) : initialData.image_url || initialData.image || null
  );
  const photoInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    apiFetch('/api/recipes/tags/')
      .then((res) => res.json())
      .then((data) => setExistingTags(Array.isArray(data) ? data.map((t) => t.name) : []))
      .catch(() => setExistingTags([]));
  }, []);

  const updateField = (field, value) => {
    setResult((prev) => ({ ...prev, [field]: value }));
  };

  const updateIngredient = (index, field, value) => {
    setResult((prev) => {
      const ingredients = [...prev.ingredients];
      ingredients[index] = { ...ingredients[index], [field]: value };
      return { ...prev, ingredients };
    });
  };

  const removeIngredient = (index) => {
    setResult((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const addIngredient = () => {
    setResult((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: null, unit: '', notes: '' }],
    }));
  };

  const addTag = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setResult((prev) => {
      const current = prev.tags || [];
      if (current.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
        return prev; // no duplicates
      }
      return { ...prev, tags: [...current, trimmed] };
    });
    setExistingTags((prev) =>
      prev.some((t) => t.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]
    );
  };

  const toggleTag = (tag) => {
    setResult((prev) => {
      const current = prev.tags || [];
      const alreadyAdded = current.some((t) => t.toLowerCase() === tag.toLowerCase());
      return {
        ...prev,
        tags: alreadyAdded
          ? current.filter((t) => t.toLowerCase() !== tag.toLowerCase())
          : [...current, tag],
      };
    });
  };

  const removeTag = (tag) => {
    setResult((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tag),
    }));
  };

  const handleSave = async () => {
    setSaveError(null);

    const { cleanedData, errors } = prepareRecipeForSave(result);
    if (errors.length > 0) {
      setSaveError(errors.join(' | '));
      return;
    }

    setSaving(true);
    try {
      const saved = await saveRecipe(cleanedData, { imageFile: photoFile, recipeId });
      onSaved?.(saved);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-5">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
      />

      {photoPreview && (
        <img src={photoPreview} alt="Recipe" className="mx-auto max-w-[120px] rounded-lg block mb-2" />
      )}

      <div className="flex flex-row gap-1 items-center justify-center mb-4">
        <button
          type="button"
          onClick={() => photoInputRef.current.click()}
          className="bg-blue text-beige px-2 py-0.5 rounded-xl cursor-pointer text-body-2"
        >
          Choose
        </button>
        <p className="text-dark-green text-body-2 opacity-70 truncate max-w-[200px]">
          {photoFile ? photoFile.name : photoPreview ? 'Current photo' : 'No photo selected'}
        </p>
      </div>

      <label className="block mb-0.5 ml-0.5 text-body-2 text-dark-green">Title</label>
      <input
        type="text"
        value={result.title || ''}
        onChange={(e) => updateField('title', e.target.value)}
        className="w-full p-2 text-body-1 rounded-lg bg-white mb-4"
      />

      <label className="block mb-0.5 ml-0.5 text-body-2 text-dark-green">Recipe Type</label>
      <div className="mb-4">
        <CustomSelect
          value={result.recipe_type || 'other'}
          onChange={(val) => updateField('recipe_type', val)}
          options={RECIPE_TYPES}
          labelFor={(t) => t.charAt(0).toUpperCase() + t.slice(1)}
        />
      </div>

      <label className="flex items-center gap-1 mb-4 ml-0.5 text-body-1 text-dark-green">
        <input
          type="checkbox"
          checked={result.is_meal_preppable || false}
          onChange={(e) => updateField('is_meal_preppable', e.target.checked)}
          className="w-2 h-2 accent-blue cursor-pointer"
        />
        Meal preppable
      </label>

      <label className="text-dark-green text-h3">Tags</label>

      {result.tags?.length > 0 && (
        <div className="flex gap-1 flex-wrap my-2">
          {result.tags.map((tag) => (
            <Pill key={tag} label={tag} active onRemove={() => removeTag(tag)} onClick={() => { }} />
          ))}
        </div>
      )}

      <button onClick={() => setShowTagModal(true)} 
        className="text-blue text-body-1 cursor-pointer ml-1 mb-3">
        + Add Tag
      </button>

      <CheckboxModal
        open={showTagModal}
        onClose={() => setShowTagModal(false)}
        title="Your Tags"
        options={existingTags.map((t) => ({ value: t, label: t }))}
        selected={result.tags || []}
        onToggle={toggleTag}
        emptyMessage="No tags yet — use + Add New to create one"
        onAddNew={addTag}
        addNewLabel="+ Add New"
      />

      <h3 className="text-dark-green text-h3 mb-2">Ingredients</h3>
      {result.ingredients?.map((ing, i) => (
        <div key={i} className="pb-3">
          <div className="flex gap-1 items-center mb-1 mt-2">
            <input
              type="text"
              placeholder="amt"
              defaultValue={unitConversion(ing.amount)}
              onBlur={(e) => updateIngredient(i, 'amount', parseAmountInput(e.target.value))}
              className="w-8 p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400"
            />
            <div className="w-20">
              <CustomSelect
                value={ing.unit || ''}
                onChange={(val) => updateIngredient(i, 'unit', val)}
                options={UNITS}
                labelFor={(u) => u || 'N/A'}
                size="compact"
                maxHeight="232px"
              />
            </div>
            <button
              onClick={() => removeIngredient(i)}
              className="ml-auto text-dark-green cursor-pointer px-2"
              aria-label="Remove ingredient"
            >
              ✕
            </button>
          </div>

          <input
            type="text"
            placeholder="Ingredient name"
            value={ing.name || ''}
            onChange={(e) => updateIngredient(i, 'name', e.target.value)}
            className="w-full p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400 mb-1"
          />

          <input
            type="text"
            placeholder="Notes (optional)"
            value={ing.notes || ''}
            onChange={(e) => updateIngredient(i, 'notes', e.target.value)}
            className="w-full p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400"
          />
        </div>
      ))}
      <button onClick={addIngredient} className="text-blue text-body-1 cursor-pointer">
        + Add Ingredient
      </button>

      <h3 className="text-dark-green text-h3 mt-5 mb-2">Steps</h3>
      <textarea
        value={result.steps || ''}
        onChange={(e) => updateField('steps', e.target.value)}
        rows={8}
        className="w-full p-2 rounded-lg bg-white box-border font-mono"
      />

      {saveError && <p className="text-red-600 text-body-2 mt-4 mb-2 text-center">{saveError}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue text-body-1 text-beige py-1 rounded-full font-bold mt-5 cursor-pointer disabled:opacity-50"
      >
        {saving ? 'Saving...' : saveButtonLabel}
      </button>

      {onDiscard && (
        <button
          onClick={onDiscard}
          className="w-full text-dark-green text-body-1 py-1 mb-3 
          rounded-full font-bold mt-2 cursor-pointer border border-dark-green"
        >
          {discardLabel}
        </button>
      )}
    </div>
  );
}

export default RecipeReviewForm;