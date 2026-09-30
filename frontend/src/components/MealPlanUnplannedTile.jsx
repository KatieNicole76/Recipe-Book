import { Link } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

/**
 * An unplanned meal — a square tile matching the normal recipe grid tiles
 * (image + title overlay), sitting in a horizontally-scrolling strip
 * instead of stacking. Drag handle is a small corner badge — see
 * MealPlanCard.jsx for why the whole tile isn't the drag target.
 */
function MealPlanUnplannedTile({ entry, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl overflow-hidden shrink-0 w-[150px] aspect-square ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <Link to={`/recipe/${entry.recipe.id}`} className="block w-full h-full">
        <img
          src={entry.recipe.image || 'https://placehold.co/300x300?text=No+Image'}
          alt={entry.recipe.title}
          className="w-full h-full object-cover block"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-dark-green/85 text-white px-1 py-1 text-body-2 leading-tight">
          {entry.recipe.title}
        </div>
      </Link>
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Drag ${entry.recipe.title} to a day`}
        className="absolute top-1 left-1 bg-beige/80 hover:bg-beige rounded-full p-1 touch-none cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={14} className="text-dark-green" />
      </button>
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

export default MealPlanUnplannedTile;
