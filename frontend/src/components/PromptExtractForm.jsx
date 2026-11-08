import { useState } from 'react';
import { apiFetch } from '../api';
import ErrorText from './ErrorText';

// onExtracted(data, imageFile) — imageFile is always null here, since a
// typed-out recipe has no photo until the user adds one in the review form.
function PromptExtractForm({ onExtracted }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/recipes/extract-prompt/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Could not turn that into a recipe');
      }
      const data = await response.json();
      onExtracted(data, null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-5 flex flex-col">
      <textarea
        placeholder="Add 1 egg and 4 cups of flour and mix together, then bake"
        aria-label="Describe your recipe"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={6}
        maxLength={5000}
        className="w-full p-1 rounded-lg bg-white box-border text-body-1 placeholder:text-gray-400 mt-2 resize-y"
      />

      <ErrorText>{error}</ErrorText>

      <button
        onClick={handleSubmit}
        disabled={!prompt.trim() || loading}
        title={!prompt.trim() ? 'Describe your recipe first' : undefined}
        className="block mt-4 bg-blue hover:bg-blue-dark text-beige text-body-1 px-2 py-1 mb-2 rounded-full
          cursor-pointer disabled:opacity-50"
      >
        {loading ? 'Building recipe...' : 'Create Recipe'}
      </button>
    </div>
  );
}

export default PromptExtractForm;
