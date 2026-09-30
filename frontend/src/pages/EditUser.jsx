import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ErrorText from '../components/ErrorText';
import UserForm from '../components/UserForm';
import { queryKeys } from '../queryKeys';
import { fetchUser } from '../utils/userApi';

function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: user, isError, error } = useQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => fetchUser(id),
  });

  return (
    <div className="m-1">
      <PageHeader title="Edit User" backTo="/admin/users" />

      <ErrorText>{isError ? error.message : null}</ErrorText>

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
