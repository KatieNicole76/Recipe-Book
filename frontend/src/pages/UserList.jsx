import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { fetchUsers } from '../utils/userApi';

function UserList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, []);

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

        <h1 className="text-dark-green text-h2 my-3 flex-1 text-center">Select User</h1>

        <div className="w-3.5 h-3.5" />
      </div>

      {error && <p className="text-red-600 text-body-2 text-center">{error}</p>}

      <div className="flex flex-col gap-1 mt-3">
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => navigate(`/admin/users/${user.id}/edit`)}
            className="w-full text-left px-2 py-2 rounded-lg text-dark-green text-body-1 cursor-pointer bg-white flex items-center justify-between"
          >
            {user.username}
            {user.is_superuser && <span className="text-body-2 text-blue">Admin</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default UserList;
