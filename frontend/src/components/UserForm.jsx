import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import ErrorText from './ErrorText';
import { createUser, updateUser, deleteUser } from '../utils/userApi';

/**
 * Add/edit user form.
 *
 * Props:
 * - userId: optional — pass this when editing an existing user
 * - initialData: { username, is_superuser } to prefill when editing
 * - onSaved(user): called after a successful create/update
 * - onDeleted(): called after a successful delete
 */
function UserForm({ userId = null, initialData = null, onSaved, onDeleted }) {
  const { username: ownUsername } = useAuth();
  const [username, setUsername] = useState(initialData?.username || '');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(initialData?.is_superuser || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditing = userId != null;
  const isOwnAccount = isEditing && initialData?.username === ownUsername;

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const data = { username: username.trim(), password, is_superuser: isAdmin };
      const saved = isEditing ? await updateUser(userId, data) : await createUser(data);
      onSaved?.(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteUser(userId);
      onDeleted?.();
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="pt-5">
      <label htmlFor="user-username" className="block mb-0.5 ml-0.5 text-body-2 text-dark-green">Username</label>
      <input
        id="user-username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full p-2 text-body-1 rounded-lg bg-white box-border mb-4"
      />

      <label htmlFor="user-password" className="block mb-0.5 ml-0.5 text-body-2 text-dark-green">
        Password{isEditing ? ' (leave blank to keep current password)' : ''}
      </label>
      <input
        id="user-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 text-body-1 rounded-lg bg-white box-border mb-4"
      />

      <label className="flex items-center gap-1 mb-4 ml-0.5 text-body-1 text-dark-green">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
          className="w-2 h-2 accent-blue cursor-pointer"
        />
        Admin
      </label>

      <ErrorText>{error}</ErrorText>

      <button
        onClick={handleSave}
        disabled={saving || !username.trim()}
        title={!username.trim() ? 'Username is required' : undefined}
        className="w-full bg-blue hover:bg-blue-dark text-body-1 text-beige py-1 rounded-full font-bold mt-5 cursor-pointer disabled:opacity-50"
      >
        {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
      </button>

      {isEditing && !isOwnAccount && (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full text-danger text-body-1 py-1 mb-3
          rounded-full font-bold mt-2 cursor-pointer border border-danger"
        >
          Delete User
        </button>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete User"
        message={`Are you sure you want to delete "${initialData?.username}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        error={deleteError}
      />
    </div>
  );
}

export default UserForm;
