import { Link } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';

/**
 * An unplanned meal — a square tile matching the normal recipe grid tiles
 * (image + title overlay), sitting in a horizontally-scrolling strip
 * instead of stacking. Same split as MealPlanCard: the photo opens the
 * recipe, the title bar (which sits on top of the photo's bottom edge) and
 * the rest of the tile are the drag surface.
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
      {...listeners}
      {...attributes}
      className={`relative rounded-xl overflow-hidden shrink-0 w-[150px] aspect-square cursor-grab active:cursor-grabbing select-none [-webkit-touch-callout:none] ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <Link
        to={`/recipe/${entry.recipe.id}`}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`Open ${entry.recipe.title}`}
        className="block w-full h-full cursor-pointer"
      >
        <img
          src={entry.recipe.image || 'https://placehold.co/300x300?text=No+Image'}
          alt=""
          draggable={false}
          className="w-full h-full object-cover block"
        />
      </Link>
      <div className="absolute bottom-0 left-0 right-0 bg-dark-green/85 text-white px-1 py-1 text-body-2 leading-tight">
        {entry.recipe.title}
      </div>
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

export default MealPlanUnplannedTile;
