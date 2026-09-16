import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * Shared page header: a back button, a centered title, and a spacer to
 * keep the title truly centered. Used by every page that isn't the main
 * recipe list or a full-screen recipe detail view.
 *
 * Props:
 * - title: the page heading text
 * - backTo: the route the back button links to
 */
function PageHeader({ title, backTo }) {
  return (
    <div className="flex items-center">
      <Link
        to={backTo}
        aria-label="Back"
        className="bg-blue hover:bg-blue-dark rounded-full p-1 flex items-center justify-center
         z-20 w-3.5 h-3.5"
      >
        <ChevronLeft size={12} className="text-beige" />
      </Link>

      <h1 className="text-dark-green text-h2 my-3 flex-1 text-center">{title}</h1>

      <div className="w-3.5 h-3.5" />
    </div>
  );
}

export default PageHeader;
