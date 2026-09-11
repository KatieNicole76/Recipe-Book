import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { motion } from 'framer-motion';

const RECIPE_TYPES = ['dinner', 'lunch', 'breakfast', 'dessert', 'side', 'snack', 'other'];
const UNITS = ['tsp', 'tbsp', 'cup', 'fl_oz', 'g', 'oz', 'pinch', 'piece', 'can', 'package', 'whole', ''];

function AddRecipe() {
  const [mode, setMode] = useState('photo');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [url, setUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setResult(null);
    setError(null);
  };

  const handlePhotoSubmit = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await apiFetch('/api/recipes/extract/', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Extraction failed');
      }
      setResult(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/recipes/extract-url/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Extraction failed');
      }
      setResult(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      let response;

      if (mode === 'photo' && image) {
        const formData = new FormData();
        formData.append('title', result.title || '');
        formData.append('recipe_type', result.recipe_type || 'other');
        formData.append('is_meal_preppable', result.is_meal_preppable || false);
        formData.append('steps', result.steps || '');
        formData.append('ingredients', JSON.stringify(result.ingredients || []));
        formData.append('image_file', image);

        response = await apiFetch('/api/recipes/save/', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await apiFetch('/api/recipes/save/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
        });
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(JSON.stringify(errData));
      }

      await response.json();
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="m-1">
      {/******* HEADER ******/}
      <h1 className="text-dark-green text-h2 my-3 text-center">Add a Recipe</h1>

      <div className="relative flex bg-dark-green rounded-full p-1 my-5">
        {['url', 'photo'].map((m) => (
          <button
            key={m}
            onClick={() => handleModeSwitch(m)}
            className="relative flex-1 py-1 rounded-full text-body-1 cursor-pointer z-10"
          >
            {mode === m && (
              <motion.div
                layoutId="toggle-highlight"
                className="absolute inset-0 bg-beige rounded-full -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
              />
            )}
            <span className={mode === m ? 'text-dark-green' : 'text-beige'}>
              {m === 'url' ? 'Link' : 'Photo'}
            </span>
          </button>
        ))}
      </div>

      {/******* PHOTO ******/}
      {mode === 'photo' && (
        <div className="mb-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-row gap-1 items-center">
            <button
              onClick={() => fileInputRef.current.click()}
              className="bg-blue text-beige px-2 py-0.5 rounded-xl cursor-pointer text-body-2 mt-2">
              Choose
            </button>
            <p className="text-dark-green text-body-2 mt-2 opacity-70 truncate max-w-[200px]">
              {image ? image.name : 'No file selected'}
            </p>
          </div>

          <div className="flex flex-col justify-center items-center">
            {preview && (
              <img src={preview} alt="preview" className="mt-4 max-w-[200px] rounded-lg block" />
            )}

            <button
              onClick={handlePhotoSubmit}
              disabled={!image || loading}
              className="block mt-15 bg-blue text-beige text-body-1  px-2 py-1 mb-2 rounded-full 
                cursor-pointer disabled:opacity-50 w-full"
            >
              {loading ? 'Extracting...' : 'Extract Recipe'}
            </button>
          </div>
        </div>
      )}

      {/******* URL ******/}
      {mode === 'url' && (
        <div className="mb-5 flex flex-col">
          <input
            type="text"
            placeholder="https://example.com/some-recipe"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-1 rounded-lg bg-white box-border text-body-1 mt-2"
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!url.trim() || loading}
            className="block mt-15 bg-blue text-beige text-body-1 px-2 py-1 mb-2 rounded-full 
              cursor-pointer disabled:opacity-50"          >
            {loading ? 'Extracting...' : 'Extract Recipe'}
          </button>
        </div>
      )}

      {error && <p className="text-red-600 text-body-1 mb-4 text-center">{error}</p>}


      {/******* RESULT ******/}
      {result && (
        <div className="border-t border-dark-green pt-5">
          <label className="block mb-0.5 ml-0.5 text-body-2 text-dark-green">Title</label>
          <input
            type="text"
            value={result.title || ''} 
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full p-1 text-body-1 rounded-lg bg-white mb-4"
          />

          <label className="block mb-0.5 ml-0.5 text-body-2 text-dark-green">Recipe Type</label>
          <select
            value={result.recipe_type || 'other'}
            onChange={(e) => updateField('recipe_type', e.target.value)}
            className="w-full p-1.5  text-body-1 rounded-lg bg-white mb-4"
          >
            {RECIPE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 mb-4 text-body-1 text-dark-green">
            <input
              type="checkbox"
              checked={result.is_meal_preppable || false}
              onChange={(e) => updateField('is_meal_preppable', e.target.checked)}
              className="w-4 h-4"
            />
            Meal preppable
          </label>

          <h3 className="text-dark-green text-h3 mb-2">Ingredients</h3>
          {result.ingredients?.map((ing, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <input
                type="number"
                placeholder="amt"
                value={ing.amount ?? ''}
                onChange={(e) => updateIngredient(i, 'amount', e.target.value === '' ? null : parseFloat(e.target.value))}
                className="w-16 p-1 rounded bg-white box-border"
              />
              <select
                value={ing.unit || ''}
                onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                className="p-1 rounded bg-white"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u || 'N/A'}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="ingredient"
                value={ing.name || ''}
                onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                className="flex-1 p-1 rounded bg-white box-border"
              />
              <input
                type="text"
                placeholder="notes"
                value={ing.notes || ''}
                onChange={(e) => updateIngredient(i, 'notes', e.target.value)}
                className="flex-1 p-1 rounded bg-white box-border"
              />
              <button onClick={() => removeIngredient(i)} className="text-dark-green cursor-pointer">✕</button>
            </div>
          ))}
          <button onClick={addIngredient} className="text-blue text-body-1 cursor-pointer mt-1">
            + Add Ingredient
          </button>

          <h3 className="text-dark-green text-h3 mt-5 mb-2">Steps</h3>
          <textarea
            value={result.steps || ''}
            onChange={(e) => updateField('steps', e.target.value)}
            rows={8}
            className="w-full p-2 rounded-lg bg-white box-border font-mono"
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue text-beige py-2 rounded-full font-bold mt-5 cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      )}
    </div>
  );
}

export default AddRecipe;