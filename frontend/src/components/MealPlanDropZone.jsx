import { useDroppable } from '@dnd-kit/core';

/**
 * One droppable bucket in the meal plan — either the unplanned strip
 * (horizontal) or a specific day (vertical). Highlights while something's
 * dragged over it; deliberately shows no "empty" placeholder text since a
 * whole week of those got cluttered fast — an empty box is enough of a
 * drop target on its own.
 */
function MealPlanDropZone({ id, children, horizontal = false }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const className = horizontal
    ? `flex gap-2 overflow-x-auto px-1 py-1 rounded-xl transition-colors min-h-[150px]
       [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isOver ? 'bg-green/10' : ''}`
    : `flex flex-col gap-1 min-h-[16px] rounded-xl transition-colors ${isOver ? 'bg-green/10' : ''}`;

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

export default MealPlanDropZone;
