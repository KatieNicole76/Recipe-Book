import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ErrorText from '../components/ErrorText';
import UserForm from '../components/UserForm';
import { fetchUser } from '../utils/userApi';

function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUser(id)
      .then(setUser)
      .catch((err) => setError(err.message));
  }, [id]);

  return (
    <div className="m-1">
      <PageHeader title="Edit User" backTo="/admin/users" />

      <ErrorText>{error}</ErrorText>

      {user && (
        <UserForm
          userId={id}
          initialData={user}
          onSaved={() => navigate('/admin/users')}
          onDeleted={() => navigate('/admin/users')}
        />
      )}
    </div>
  );
}

export default EditUser;
