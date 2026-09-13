import { useState, useRef } from 'react';
import { apiFetch } from '../api';

// onExtracted(data, imageFile) — called with the extracted recipe data and
// the original File, so the parent can pass both along to the review form.
function PhotoExtractForm({ onExtracted }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async () => {
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
      const data = await response.json();
      onExtracted(data, image);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
          className="bg-blue text-beige px-2 py-0.5 rounded-xl cursor-pointer text-body-2 mt-2"
        >
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

        {error && <p className="text-red-600 text-body-2 mt-4 mb-2 text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!image || loading}
          className="block mt-4 bg-blue text-beige text-body-1 px-2 py-1 mb-2 rounded-full
            cursor-pointer disabled:opacity-50 w-full"
        >
          {loading ? 'Extracting...' : 'Extract Recipe'}
        </button>
      </div>
    </div>
  );
}

export default PhotoExtractForm;