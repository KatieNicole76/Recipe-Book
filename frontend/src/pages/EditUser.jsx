import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
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
      {/******* HEADER ******/}
      <div className="flex items-center">
        <Link
          to="/admin/users"
          aria-label="Back"
          className="bg-blue rounded-full p-1 flex items-center justify-center
           z-20 w-3.5 h-3.5"
        >
          <ChevronLeft size={12} className="text-beige" />
        </Link>

        <h1 className="text-dark-green text-h2 my-3 flex-1 text-center">Edit User</h1>

        <div className="w-3.5 h-3.5" />
      </div>

      {error && <p className="text-red-600 text-body-2 text-center">{error}</p>}

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
