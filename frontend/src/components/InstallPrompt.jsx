import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getStorageItem, setStorageItem } from '../utils/safeStorage';

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

/**
 * A visible, dismissible banner nudging people to install the app —
 * neither Android Chrome's tiny address-bar icon nor iOS Safari's buried
 * Share-sheet option are discoverable on their own. On Chrome/Edge/etc it
 * triggers the real install prompt directly; iOS has no installable API
 * at all, so it just tells you where to find "Add to Home Screen".
 */
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(getStorageItem('install_prompt_dismissed') === 'true');

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    setStorageItem('install_prompt_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (dismissed || isStandalone()) return null;
  if (!isIos() && !deferredPrompt) return null; // no signal yet that this browser supports installing

  return (
    <div className="relative bg-blue text-beige text-body-2 text-center py-1 pl-2 pr-6 rounded-lg mt-2 mx-1">
      {isIos() ? (
        <span>Install this app: tap the Share button, then "Add to Home Screen".</span>
      ) : (
        <button type="button" onClick={handleInstallClick} className="cursor-pointer underline">
          Install this app for quicker access — tap to install
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-1 right-1 text-beige hover:opacity-70 cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default InstallPrompt;
