import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useGoBack } from '../hooks/useGoBack';
import PageHeader from '../components/PageHeader';
import ErrorText from '../components/ErrorText';
import UserForm from '../components/UserForm';
import { queryKeys } from '../queryKeys';
import { fetchUser } from '../utils/userApi';

function EditUser() {
  const { id } = useParams();
  const goBack = useGoBack('/admin/users');
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
          onSaved={goBack}
          onDeleted={goBack}
        />
      )}
    </div>
  );
}

export default EditUser;
