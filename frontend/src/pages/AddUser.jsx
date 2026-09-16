import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import UserForm from '../components/UserForm';

function AddUser() {
  const navigate = useNavigate();

  return (
    <div className="m-1">
      <PageHeader title="Add User" backTo="/" />

      <UserForm onSaved={() => navigate('/')} />
    </div>
  );
}

export default AddUser;
