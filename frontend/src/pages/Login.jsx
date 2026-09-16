import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorText from '../components/ErrorText';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (  
    <div className="flex items-center justify-center font-mono h-screen m-2">
      <form
        onSubmit={handleSubmit}
        className=""
      >
        <h1 className="text-blue text-h1 mb-6">Recipe Book</h1>

        <label htmlFor='username' className="text-dark-green text-body-1 mb-2">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 text-body-1 rounded-lg bg-white box-border mb-4 mt-1"
          autoFocus
          id="username"
        />

        <label htmlFor='password' className="text-dark-green text-body-1 mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 text-body-1 rounded-lg bg-white box-border mb-4 mt-1"
          id="password"
        />

        <ErrorText>{error ? `${error}. Call Katie if you need help.` : null}</ErrorText>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue hover:bg-blue-dark text-beige text-body-1 py-2 rounded-full font-bold my-3 cursor-pointer"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;