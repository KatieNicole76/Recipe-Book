import { Link } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

/**
 * A meal assigned to a day — a full-width dark-green bar (thumbnail +
 * wrapping title), matching the title bar on the normal recipe tiles.
 *
 * Dragging is via the small grip handle, not the whole card. Two attempts
 * at letting dnd-kit and React Router's Link share the same click
 * (distance/delay activation constraints, then manual click-suppression on
 * drag end) both still let a completed drag fall through as a tap and
 * navigate to the recipe — a dedicated handle sidesteps the ambiguity
 * entirely and is the only version that's actually held up in testing.
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
      className={`relative flex items-center gap-1 bg-dark-green rounded-xl p-1 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Drag ${entry.recipe.title} to a different day`}
        className="shrink-0 text-white opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing touch-none p-1"
      >
        <GripVertical size={16} />
      </button>
      <Link to={`/recipe/${entry.recipe.id}`} className="flex items-center gap-2 flex-1 min-w-0 pr-6">
        <img
          src={entry.recipe.image || 'https://placehold.co/100x100?text=No+Image'}
          alt={entry.recipe.title}
          className="w-12 h-12 rounded-lg object-cover shrink-0"
        />
        <span className="text-white text-body-1 break-words">{entry.recipe.title}</span>
      </Link>
      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        aria-label={`Remove ${entry.recipe.title} from meal plan`}
        className="absolute top-1 right-1 bg-beige/80 hover:bg-beige rounded-full p-1 cursor-pointer"
      >
        <X size={14} className="text-dark-green" />
      </button>
    </div>
  );
}

export default MealPlanCard;
