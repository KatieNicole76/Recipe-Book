import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

/**
 * Fullscreen video player modal. Plays our own downloaded copy of the video
 * when we have one; otherwise falls back to TikTok's official embed widget
 * (which loads and plays in the visitor's own browser, so it works
 * regardless of whether our server can reach TikTok).
 *
 * Props:
 * - videoUrl: our own hosted video file, if any
 * - sourceUrl: the original TikTok link, used for the embed fallback
 * - onClose: called when the close button or Escape is pressed
 */
function VideoPlayerModal({ videoUrl, sourceUrl, onClose }) {
  const panelRef = useModalA11y(true, onClose);

  useEffect(() => {
    if (videoUrl) return; // using our own <video> element, no embed script needed
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [videoUrl]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Recipe video"
        tabIndex={-1}
        className="relative w-full h-full flex items-center justify-center outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute top-4 right-2 z-10 w-[32px] h-[32px] bg-blue hover:bg-blue-dark rounded-full flex items-center justify-center cursor-pointer"
        >
          <X size={18} className="text-beige" />
        </button>

        {videoUrl ? (
          <video src={videoUrl} controls autoPlay className="max-w-full max-h-full" />
        ) : (
          <blockquote
            className="tiktok-embed"
            cite={sourceUrl}
            style={{ maxWidth: '605px', minWidth: '325px' }}
          >
            <section />
          </blockquote>
        )}
      </div>
    </div>
  );
}

export default VideoPlayerModal;
