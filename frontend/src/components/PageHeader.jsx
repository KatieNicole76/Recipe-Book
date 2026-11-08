import { ChevronLeft } from 'lucide-react';
import { useGoBack } from '../hooks/useGoBack';

/**
 * Shared page header: a back button, a centered title, and a spacer to
 * keep the title truly centered. Used by every page that isn't the main
 * recipe list or a full-screen recipe detail view.
 *
 * Props:
 * - title: the page heading text
 * - backTo: where the back button goes when there's no previous screen to
 *   return to (e.g. the page was opened directly) — otherwise it returns
 *   to whatever screen the user was on before
 * - onBack: optional — when set, the back button calls this instead
 *   (for stepping back within a single page)
 * - action: optional element shown on the right (e.g. a + button);
 *   defaults to an empty spacer so the title stays centered
 */
// Shared round blue icon-button look (back arrow, header actions) so they're all the same size.
export const HEADER_ICON_BUTTON_CLASSES = `bg-blue hover:bg-blue-dark rounded-full p-1 flex items-center justify-center
  z-20 w-3.5 h-3.5 cursor-pointer`;

function PageHeader({ title, backTo = '/', onBack, action = null }) {
  const goBack = useGoBack(backTo);
  return (
    <div className="flex items-center">
      <button type="button" onClick={onBack || goBack} aria-label="Back" className={HEADER_ICON_BUTTON_CLASSES}>
        <ChevronLeft size={12} className="text-beige" />
      </button>

      <h1 className="text-dark-green text-h2 my-3 flex-1 text-center">{title}</h1>

      {action || <div className="w-3.5 h-3.5" />}
    </div>
  );
}

export default PageHeader;
