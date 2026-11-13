import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function DemoTip({ children, className = '' }) {
  const { isDemo } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  if (!isDemo || dismissed) return null;

  return (
    <div className={`relative bg-blue text-beige text-body-2 text-center py-2 pl-2 pr-3 rounded-lg mt-2 mx-1 ${className}`}>
      {children}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss tip"
        className="absolute top-1 right-1 text-beige hover:opacity-70 cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default DemoTip;
