import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../api';
import PhotoPicker from './PhotoPicker';
import ErrorText from './ErrorText';

// onExtracted(data, imageFile) — called with the extracted recipe data and
// the original File, so the parent can pass both along to the review form.
function PhotoExtractForm({ onExtracted }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const objectUrlRef = useRef(null);

  const handleFileChange = (file) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImage(file);
    setPreview(url);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

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
      <div className="mt-2">
        <PhotoPicker file={image} onChange={handleFileChange} />
      </div>

      <div className="flex flex-col justify-center items-center">
        {preview && (
          <img
            src={preview}
            alt={image ? `Selected photo: ${image.name}` : 'Recipe photo preview'}
            className="mt-4 max-w-[200px] rounded-lg block"
          />
        )}

        <ErrorText>{error}</ErrorText>

        <button
          onClick={handleSubmit}
          disabled={!image || loading}
          title={!image ? 'Choose a photo first' : undefined}
          className="block mt-4 bg-blue hover:bg-blue-dark text-beige text-body-1 px-2 py-1 mb-2 rounded-full
            cursor-pointer disabled:opacity-50 w-full"
        >
          {loading ? 'Extracting...' : 'Extract Recipe'}
        </button>
      </div>
    </div>
  );
}

export default PhotoExtractForm;
