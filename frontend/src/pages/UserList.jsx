import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ErrorText from '../components/ErrorText';
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
      <PageHeader title="Select User" backTo="/" />

      <ErrorText>{error}</ErrorText>

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
