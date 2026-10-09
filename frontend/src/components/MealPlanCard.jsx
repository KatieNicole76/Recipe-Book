import { Link } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';

/**
 * A meal assigned to a day — a full-width dark-green bar (thumbnail +
 * wrapping title), matching the title bar on the normal recipe tiles.
 *
 * The image is the only tap-to-open-the-recipe target; everything else on
 * the card (title, padding) is the drag surface. Keeping the Link off the
 * drag surface is what avoids dnd-kit and the Link fighting over the same
 * click, and the image stops its pointer events from reaching the drag
 * listeners so pressing it never starts a drag.
 */
function MealPlanCard({ entry, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative flex items-center gap-2 bg-dark-green rounded-xl p-1 cursor-grab active:cursor-grabbing select-none [-webkit-touch-callout:none] ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <Link
        to={`/recipe/${entry.recipe.id}`}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`Open ${entry.recipe.title}`}
        className="shrink-0 cursor-pointer"
      >
        <img
          src={entry.recipe.image || 'https://placehold.co/100x100?text=No+Image'}
          alt=""
          draggable={false}
          className="w-12 h-12 rounded-lg object-cover block"
        />
      </Link>
      <span className="flex-1 min-w-0 pr-6 py-1 text-white text-body-1 break-words">
        {entry.recipe.title}
      </span>
      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`Remove ${entry.recipe.title} from meal plan`}
        className="absolute top-1 right-1 bg-beige/80 hover:bg-beige rounded-full p-1 cursor-pointer"
      >
        <X size={14} className="text-dark-green" />
      </button>
    </div>
  );
}

export default MealPlanCard;
