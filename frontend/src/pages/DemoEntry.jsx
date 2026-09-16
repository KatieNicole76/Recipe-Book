import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorText from '../components/ErrorText';

/**
 * One-click demo entry point for linking directly from an external site —
 * no login screen, no button. Provisions a fresh guest account and drops
 * straight into the app.
 */
function DemoEntry() {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    loginDemo()
      .then(() => navigate('/'))
      .catch((err) => setError(err.message));
  }, [loginDemo, navigate]);

  return (
    <div className="flex items-center justify-center h-screen m-2">
      <p className="text-dark-green text-body-1">
        {error ? <ErrorText>{error}</ErrorText> : 'Starting your demo...'}
      </p>
    </div>
  );
}

export default DemoEntry;
