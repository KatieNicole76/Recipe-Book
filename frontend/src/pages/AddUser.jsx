import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import UserForm from '../components/UserForm';

function AddUser() {
  const navigate = useNavigate();

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

        <h1 className="text-dark-green text-h2 my-3 flex-1 text-center">Add User</h1>

        <div className="w-3.5 h-3.5" />
      </div>

      <UserForm onSaved={() => navigate('/')} />
    </div>
  );
}

export default AddUser;
