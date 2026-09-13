import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function SuperuserRoute({ children }) {
  const { isAuthenticated, isSuperuser } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return isSuperuser ? children : <Navigate to="/" replace />;
}

export default SuperuserRoute;
