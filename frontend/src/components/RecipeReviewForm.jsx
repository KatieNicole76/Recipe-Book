import { useState, useEffect, useRef } from 'react';
import CustomSelect from './CustomSelect';
import Pill from './Pill';
import CheckboxModal from './CheckboxModal';
import PhotoPicker from './PhotoPicker';
import ErrorText from './ErrorText';
import { apiFetch } from '../api';
import { parseAmountInput, roundAmount, unitConversion } from '../utils/UnitConversion';
import { prepareRecipeForSave, saveRecipe, linkRecipeSource, fetchTiktokPreview, isTiktokUrl } from '../utils/recipeApi';

const RECIPE_TYPES = ['dinner', 'lunch', 'breakfast', 'dessert', 'side', 'snack', 'other'];
const UNITS = ['tsp', 'tbsp', 'cup', 'fl_oz', 'g', 'oz', 'pinch', 'piece', 'can', 'package', 'whole', ''];
// Radix Select treats an empty-string item value as "unset" and falls back
// to showing the placeholder — this sentinel stands in for the blank/"N/A"
// unit so it displays and reselects correctly.
const NA_UNIT = '__na__';
const UNIT_OPTIONS = UNITS.map((u) => ({ value: u || NA_UNIT, label: u || 'N/A' }));

const makeIngredientKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ing-${Math.random()}`;

/**
 * Generic recipe review/edit form.
 *
 * Props:
 * - initialData: recipe-shaped object (title, recipe_type, is_meal_preppable,
 *   steps, ingredients, tags) to start the form from. Works whether that data
 *   just came from an extraction, or from an existing saved recipe you're editing.
 * - imageFile: optional File to upload alongside the save (only relevant
 *   right after a photo extraction — omit when editing an existing recipe).
 * - recipeId: optional — pass this when editing an existing recipe so saves
 *   PATCH it and a linked source is attached immediately. When omitted (a
 *   fresh extraction, not yet saved), linking a TikTok source only previews
 *   its thumbnail — the actual link/video is attached at save time.
 * - savedFromId: optional — pass this (with recipeId omitted) when editing
 *   a copy of someone else's recipe before saving it to your own cookbook
 *   ("Edit first" from Browse). Marks the new recipe as a copy so it's
 *   excluded from the combined Browse list.
 * - onSaved(savedRecipe): called after a successful save.
 * - onDiscard(): optional — if provided, shows a "Discard" button that calls it.
 * - saveButtonLabel: optional override for the save button's default text.
 */

function RecipeReviewForm({
  initialData,
  imageFile = null,
  recipeId = null,
  savedFromId = null,
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
      _key: makeIngredientKey(),
      amount: ing.amount != null ? roundAmount(ing.amount) : null,
    })),
  }));
  const [existingTags, setExistingTags] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showSourceInput, setShowSourceInput] = useState(false);
  const [sourceUrlInput, setSourceUrlInput] = useState('');
  const [linkingSource, setLinkingSource] = useState(false);
  const [sourceError, setSourceError] = useState(null);
  const [photoFile, setPhotoFile] = useState(imageFile);
  const initialObjectUrl = imageFile ? URL.createObjectURL(imageFile) : null;
  const [photoPreview, setPhotoPreview] = useState(
    initialObjectUrl || initialData.image_url || initialData.image || null
  );
  // Tracks only the blob URLs *this component* created (never the server's
  // own image/image_url strings), so we know exactly what's safe to revoke.
  const objectUrlRef = useRef(initialObjectUrl);

  const handlePhotoChange = (file) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPhotoFile(file);
    setPhotoPreview(url);
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

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
      ingredients: [...prev.ingredients, { _key: makeIngredientKey(), name: '', amount: null, unit: '', notes: '' }],
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
      const saved = await saveRecipe(cleanedData, { imageFile: photoFile, recipeId, savedFromId });
      onSaved?.(saved);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLinkSource = async () => {
    const trimmed = sourceUrlInput.trim();
    if (!trimmed) return;
    setSourceError(null);
    setLinkingSource(true);
    try {
      if (recipeId) {
        // Editing an already-saved recipe — link it (and fetch the
        // thumbnail/video, for TikTok) right away.
        const updated = await linkRecipeSource(recipeId, trimmed);
        setResult((prev) => ({ ...prev, source_url: updated.source_url, image: updated.image }));
        if (updated.image) setPhotoPreview(updated.image);
      } else if (isTiktokUrl(trimmed)) {
        // Still reviewing before the first save (e.g. a photo extraction) —
        // there's no recipe to attach to yet, so just preview the
        // thumbnail now; the actual video download happens at save time.
        const preview = await fetchTiktokPreview(trimmed);
        setResult((prev) => ({ ...prev, source_url: preview.source_url }));
        if (preview.thumbnail_url) setPhotoPreview(preview.thumbnail_url);
        setPhotoFile(null); // the linked video's thumbnail replaces whatever photo was extracted/picked
      } else {
        setResult((prev) => ({ ...prev, source_url: trimmed }));
      }
      setSourceUrlInput('');
      setShowSourceInput(false);
    } catch (err) {
      setSourceError(err.message);
    } finally {
      setLinkingSource(false);
    }
  };

  return (
    <div className="pt-5">
      {photoPreview && (
        <img
          src={photoPreview}
          alt={result.title ? `Photo of ${result.title}` : 'Recipe photo'}
          className="mx-auto max-w-[120px] rounded-lg block mb-2"
        />
      )}

      <div className="flex justify-center mb-4">
        <PhotoPicker file={photoFile} hasExisting={!!photoPreview} onChange={handlePhotoChange} />
      </div>

      <div className="mb-4">
        <label className="block mb-0.5 ml-0.5 text-body-2 text-dark-green">Source</label>
        {result.source_url && !showSourceInput ? (
          <div className="flex items-center gap-2 ml-1">
            <a
              href={result.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue hover:text-blue-dark text-body-2 truncate flex-1"
            >
              {result.source_url}
            </a>
            <button
              type="button"
              onClick={() => {
                setSourceUrlInput(result.source_url);
                setShowSourceInput(true);
              }}
              className="text-blue hover:text-blue-dark text-body-2 cursor-pointer shrink-0"
            >
              Change
            </button>
          </div>
        ) : showSourceInput ? (
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="https://..."
              aria-label="Source URL"
              value={sourceUrlInput}
              onChange={(e) => setSourceUrlInput(e.target.value)}
              autoFocus
              className="flex-1 p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={handleLinkSource}
              disabled={linkingSource}
              className="bg-blue hover:bg-blue-dark text-beige px-3 rounded-lg cursor-pointer text-body-2 disabled:opacity-50"
            >
              {linkingSource ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSourceInput(true)}
            className="text-blue hover:text-blue-dark text-body-1 cursor-pointer ml-1"
          >
            + Link a Source
          </button>
        )}
        <ErrorText>{sourceError}</ErrorText>
      </div>

      <label htmlFor="recipe-title" className="block mb-0.5 ml-0.5 text-body-2 text-dark-green">Title</label>
      <input
        id="recipe-title"
        type="text"
        value={result.title || ''}
        onChange={(e) => updateField('title', e.target.value)}
        className="w-full p-2 text-body-1 rounded-lg bg-white box-border mb-4"
      />

      <label className="block mb-0.5 ml-0.5 text-body-2 text-dark-green">Recipe Type</label>
      <div className="mb-4">
        <CustomSelect
          value={result.recipe_type || 'other'}
          onChange={(val) => updateField('recipe_type', val)}
          options={RECIPE_TYPES}
          labelFor={(t) => t.charAt(0).toUpperCase() + t.slice(1)}
          ariaLabel="Recipe Type"
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
        className="text-blue hover:text-blue-dark text-body-1 cursor-pointer ml-1 mb-3">
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
        <div key={ing._key} className="pb-3">
          <div className="flex gap-1 items-center mb-1 mt-2">
            <input
              type="text"
              placeholder="amt"
              aria-label="Amount"
              defaultValue={unitConversion(ing.amount)}
              onBlur={(e) => updateIngredient(i, 'amount', parseAmountInput(e.target.value))}
              className="w-8 p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400"
            />
            <div className="w-20">
              <CustomSelect
                value={ing.unit || NA_UNIT}
                onChange={(val) => updateIngredient(i, 'unit', val === NA_UNIT ? '' : val)}
                options={UNIT_OPTIONS}
                size="compact"
                maxHeight="232px"
                ariaLabel="Unit"
              />
            </div>
            <button
              onClick={() => removeIngredient(i)}
              className="ml-auto text-dark-green text-body-1 cursor-pointer px-2"
              aria-label="Remove ingredient"
            >
              ✕
            </button>
          </div>

          <input
            type="text"
            placeholder="Ingredient name"
            aria-label="Ingredient name"
            value={ing.name || ''}
            onChange={(e) => updateIngredient(i, 'name', e.target.value)}
            className="w-full p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400 mb-1"
          />

          <input
            type="text"
            placeholder="Notes (optional)"
            aria-label="Notes"
            value={ing.notes || ''}
            onChange={(e) => updateIngredient(i, 'notes', e.target.value)}
            className="w-full p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400"
          />
        </div>
      ))}
      <button onClick={addIngredient} className="text-blue hover:text-blue-dark text-body-1 cursor-pointer">
        + Add Ingredient
      </button>

      <h3 className="text-dark-green text-h3 mt-5 mb-2">Steps</h3>
      <textarea
        value={result.steps || ''}
        onChange={(e) => updateField('steps', e.target.value)}
        rows={8}
        className="w-full p-2 text-body-1 rounded-lg bg-white box-border font-mono"
      />

      <ErrorText>{saveError}</ErrorText>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue hover:bg-blue-dark text-body-1 text-beige py-1 rounded-full font-bold mt-5 cursor-pointer disabled:opacity-50"
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