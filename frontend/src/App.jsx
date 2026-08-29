import { useState } from 'react';

const RECIPE_TYPES = ['dinner', 'lunch', 'breakfast', 'dessert', 'snack', 'side', 'other'];
const UNITS = ['tsp', 'tbsp', 'cup', 'fl_oz', 'g', 'oz', 'pinch', 'piece', 'can', 'package', 'whole', ''];

function App() {
  const [mode, setMode] = useState('photo');

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [url, setUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setSaveMessage(null);
    }
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setResult(null);
    setError(null);
    setSaveMessage(null);
  };

  const handlePhotoSubmit = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setSaveMessage(null);

    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/recipes/extract/', {
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
    setSaveMessage(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/recipes/extract-url/', {
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

  // ---- editing helpers ----

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
  setSaveMessage(null);
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

      response = await fetch('http://127.0.0.1:8000/api/recipes/save/', {
        method: 'POST',
        body: formData,
      });
    } else {
      response = await fetch('http://127.0.0.1:8000/api/recipes/save/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
    }

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(JSON.stringify(errData));
    }

    const saved = await response.json();
    setSaveMessage(`Saved "${saved.title}"!`);
  } catch (err) {
    setError(err.message);
  } finally {
    setSaving(false);
  }
};

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Recipe Extraction</h1>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => handleModeSwitch('photo')}
          style={{ padding: '8px 16px', fontWeight: mode === 'photo' ? 'bold' : 'normal', borderBottom: mode === 'photo' ? '2px solid black' : 'none' }}
        >
          Upload Photo
        </button>
        <button
          onClick={() => handleModeSwitch('url')}
          style={{ padding: '8px 16px', fontWeight: mode === 'url' ? 'bold' : 'normal', borderBottom: mode === 'url' ? '2px solid black' : 'none' }}
        >
          Paste URL
        </button>
      </div>

      {mode === 'photo' && (
        <div>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {preview && (
            <div style={{ marginTop: '16px' }}>
              <img src={preview} alt="preview" style={{ maxWidth: '300px', display: 'block' }} />
            </div>
          )}
          <button onClick={handlePhotoSubmit} disabled={!image || loading} style={{ marginTop: '16px', padding: '8px 16px' }}>
            {loading ? 'Extracting...' : 'Extract Recipe'}
          </button>
        </div>
      )}

      {mode === 'url' && (
        <div>
          <input
            type="text"
            placeholder="https://example.com/some-recipe"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
          <button onClick={handleUrlSubmit} disabled={!url.trim() || loading} style={{ marginTop: '16px', padding: '8px 16px' }}>
            {loading ? 'Extracting...' : 'Extract Recipe'}
          </button>
        </div>
      )}

      {error && <p style={{ color: 'red', marginTop: '16px' }}>Error: {error}</p>}
      {saveMessage && <p style={{ color: 'green', marginTop: '16px' }}>{saveMessage}</p>}

      {result && (
        <div style={{ marginTop: '24px', borderTop: '1px solid #ccc', paddingTop: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Title</label>
          <input
            type="text"
            value={result.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
          />

          <label style={{ display: 'block', marginBottom: '4px' }}>Recipe Type</label>
          <select
            value={result.recipe_type || 'other'}
            onChange={(e) => updateField('recipe_type', e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
          >
            {RECIPE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label style={{ display: 'block', marginBottom: '4px' }}>
            <input
              type="checkbox"
              checked={result.is_meal_preppable || false}
              onChange={(e) => updateField('is_meal_preppable', e.target.checked)}
            />
            {' '}Meal preppable
          </label>

          <h3 style={{ marginTop: '20px' }}>Ingredients</h3>
          {result.ingredients?.map((ing, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <input
                type="number"
                placeholder="amt"
                value={ing.amount ?? ''}
                onChange={(e) => updateIngredient(i, 'amount', e.target.value === '' ? null : parseFloat(e.target.value))}
                style={{ width: '60px', padding: '6px' }}
              />
              <select
                value={ing.unit || ''}
                onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                style={{ padding: '6px' }}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u || 'N/A'}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="ingredient name"
                value={ing.name || ''}
                onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                style={{ flex: 1, padding: '6px' }}
              />
              <input
                type="text"
                placeholder="notes"
                value={ing.notes || ''}
                onChange={(e) => updateIngredient(i, 'notes', e.target.value)}
                style={{ flex: 1, padding: '6px' }}
              />
              <button onClick={() => removeIngredient(i)} style={{ padding: '6px 10px' }}>✕</button>
            </div>
          ))}
          <button onClick={addIngredient} style={{ padding: '6px 12px', marginTop: '4px' }}>+ Add Ingredient</button>

          <h3 style={{ marginTop: '20px' }}>Steps</h3>
          <textarea
            value={result.steps || ''}
            onChange={(e) => updateField('steps', e.target.value)}
            rows={8}
            style={{ width: '100%', padding: '8px', fontFamily: 'inherit' }}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ marginTop: '20px', padding: '10px 20px', fontWeight: 'bold' }}
          >
            {saving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;