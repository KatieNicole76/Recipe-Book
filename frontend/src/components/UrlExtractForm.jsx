import { useState } from 'react';
import { apiFetch } from '../api';
import ErrorText from './ErrorText';

// onExtracted(data, imageFile) — imageFile is always null here, since a
// URL-extracted recipe's photo (if any) comes from image_url, not an upload.
function UrlExtractForm({ onExtracted }) {
  const [url, setUrl] = useState('');
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
        body: JSON.stringify({ url }),
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