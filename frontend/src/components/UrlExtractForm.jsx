import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { apiFetch } from '../api';
import ErrorText from './ErrorText';

// onExtracted(data, imageFile) — imageFile is always null here, since a
// URL-extracted recipe's photo (if any) comes from image_url, not an upload.
function UrlExtractForm({ onExtracted }) {
  const [url, setUrl] = useState('');
  // Optional typed-out recipe sent alongside the link — for videos whose
  // caption doesn't include the recipe, so the link still supplies the
  // video/photo while the prompt supplies the ingredients and steps.
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/recipes/extract-url/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prompt: showPrompt ? prompt.trim() : '' }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Extraction failed');
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
      <input
        type="text"
        placeholder="https://example.com/some-recipe"
        aria-label="Recipe URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full p-1 rounded-lg bg-white box-border text-body-1 placeholder:text-gray-400 mt-2"
      />

      {showPrompt ? (
        <>
          <div className="flex items-center justify-between mt-2">
            <label htmlFor="link-prompt" className="ml-0.5 text-body-2 text-dark-green">
              Describe the recipe
            </label>
            <button
              type="button"
              onClick={() => { setShowPrompt(false); setPrompt(''); }}
              className="flex items-center gap-0.5 text-blue hover:text-blue-dark text-body-2 cursor-pointer"
            >
              <X size={14} aria-hidden="true" />
              Remove
            </button>
          </div>
          <textarea
            id="link-prompt"
            placeholder="Add 1 egg and 4 cups of flour and mix together, then bake"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            maxLength={5000}
            className="w-full p-1 rounded-lg bg-white box-border text-body-1 placeholder:text-gray-400 mt-0.5 resize-y"
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowPrompt(true)}
          className="self-start flex items-center gap-0.5 mt-1.5 text-blue hover:text-blue-dark text-body-2 cursor-pointer"
        >
          <Plus size={14} aria-hidden="true" />
          Add prompt
        </button>
      )}

      <ErrorText>{error}</ErrorText>

      <button
        onClick={handleSubmit}
        disabled={!url.trim() || loading}
        title={!url.trim() ? 'Enter a URL first' : undefined}
        className="block mt-4 bg-blue hover:bg-blue-dark text-beige text-body-1 px-2 py-1 mb-2 rounded-full
          cursor-pointer disabled:opacity-50"
      >
        {loading ? 'Extracting...' : 'Extract Recipe'}
      </button>
    </div>
  );
}

export default UrlExtractForm;