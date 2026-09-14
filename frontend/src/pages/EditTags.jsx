import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { apiFetch } from '../api';
import ConfirmModal from '../components/ConfirmModal';

function EditTags() {
  const [tags, setTags] = useState([]);
  const [error, setError] = useState(null);
  const [tagToDelete, setTagToDelete] = useState(null);

  useEffect(() => {
    apiFetch('/api/recipes/tags/')
      .then((res) => res.json())
      .then((data) => setTags(Array.isArray(data) ? data : []))
      .catch(() => setTags([]));
  }, []);

  const handleDelete = async () => {
    const response = await apiFetch(`/api/recipes/tags/${tagToDelete.id}/`, { method: 'DELETE' });
    if (!response.ok) {
      setError('Could not delete tag');
      return;
    }
    setTags((prev) => prev.filter((t) => t.id !== tagToDelete.id));
    setTagToDelete(null);
  };

  return (
    <div className="m-1">
      {/******* HEADER ******/}
      <div className="flex items-center">
        <Link
          to="/"
          aria-label="Back"
          className="bg-blue rounded-full p-1 flex items-center justify-center
           z-20 w-3.5 h-3.5"
        >
          <ChevronLeft size={12} className="text-beige" />
        </Link>

        <h1 className="text-dark-green text-h2 my-3 flex-1 text-center">Edit Recipe Tags</h1>

        <div className="w-3.5 h-3.5" />
      </div>

      {error && <p className="text-red-600 text-body-2 text-center mb-2">{error}</p>}

      {tags.length === 0 ? (
        <p className="text-dark-green text-body-1 text-center mt-8">No tags yet.</p>
      ) : (
        <div className="flex flex-col gap-1 mt-3">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-1">
              <input
                type="text"
                value={tag.name}
                disabled
                className="flex-1 p-1 text-body-2 rounded-lg bg-white box-border text-dark-green"
              />
              <button
                type="button"
                onClick={() => setTagToDelete(tag)}
                aria-label={`Delete ${tag.name}`}
                className="shrink-0 text-red-800 cursor-pointer px-2"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={tagToDelete != null}
        onClose={() => setTagToDelete(null)}
        title="Delete Tag"
        message={`Are you sure you want to delete "${tagToDelete?.name}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default EditTags;
