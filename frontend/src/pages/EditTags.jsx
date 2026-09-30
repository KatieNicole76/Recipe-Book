import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { apiFetch, apiFetchJson } from '../api';
import { queryKeys } from '../queryKeys';
import PageHeader from '../components/PageHeader';
import ConfirmModal from '../components/ConfirmModal';

function EditTags() {
  const queryClient = useQueryClient();
  const { data: tags = [] } = useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => apiFetchJson('/api/recipes/tags/'),
  });
  const [error, setError] = useState(null);
  const [tagToDelete, setTagToDelete] = useState(null);

  const handleDelete = async () => {
    setError(null);
    try {
      const response = await apiFetch(`/api/recipes/tags/${tagToDelete.id}/`, { method: 'DELETE' });
      if (!response.ok) {
        setError(`Could not delete tag (status ${response.status})`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
      setTagToDelete(null);
    } catch {
      setError('Could not delete tag (network error)');
    }
  };

  return (
    <div className="m-1">
      <PageHeader title="Edit Recipe Tags" backTo="/" />

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
                className="shrink-0 text-danger cursor-pointer px-2"
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
        error={error}
      />
    </div>
  );
}

export default EditTags;
