import { useGoBack } from '../hooks/useGoBack';
import PageHeader from '../components/PageHeader';
import UserForm from '../components/UserForm';

function AddUser() {
  const goBack = useGoBack('/');

  return (
    <div className="m-1">
      <PageHeader title="Add User" backTo="/" />

      <UserForm onSaved={goBack} />
    </div>
  );
}

export default AddUser;
