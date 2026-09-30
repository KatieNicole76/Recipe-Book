import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import MealPlanCard from '../components/MealPlanCard';
import MealPlanUnplannedTile from '../components/MealPlanUnplannedTile';
import MealPlanDropZone from '../components/MealPlanDropZone';
import ErrorText from '../components/ErrorText';
import { queryKeys } from '../queryKeys';
import { fetchMealPlan, updateMealPlanEntryDate, deleteMealPlanEntry } from '../utils/mealPlanApi';
import { getWeekDays } from '../utils/mealPlanDates';

const UNPLANNED = 'unplanned';

function MealPlan() {
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [error, setError] = useState(null);
  // Shows the Unplanned strip while a drag is in flight even if it's
  // otherwise empty, so there's always a place to drop a card back onto —
  // it's only hidden at rest when there's genuinely nothing in it.
  const [isDragActive, setIsDragActive] = useState(false);
  const { data: entries = [] } = useQuery({
    queryKey: queryKeys.mealPlan,
    queryFn: fetchMealPlan,
  });

  const sensors = useSensors(
    // Mouse/trackpad: a small drag threshold so a plain click still
    // navigates instead of starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Touch: a genuine press-and-hold, so scrolling the page or tapping
    // through to a recipe doesn't accidentally pick a card up.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );

  const weekDays = getWeekDays(weekOffset);
  const unplanned = entries.filter((e) => !e.date);
  const entriesByDate = (iso) => entries.filter((e) => e.date === iso);

  const moveEntry = (entryId, date) => {
    queryClient.setQueryData(queryKeys.mealPlan, (prev = []) =>
      prev.map((e) => (e.id === entryId ? { ...e, date } : e))
    );
    updateMealPlanEntryDate(entryId, date).catch((err) => {
      setError(err.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlan });
    });
  };

  const handleDragStart = () => {
    setIsDragActive(true);
  };

  const handleDragEnd = ({ active, over }) => {
    setIsDragActive(false);
    if (!over) return;
    const newDate = over.id === UNPLANNED ? null : over.id;
    moveEntry(active.id, newDate);
  };

  const handleRemove = async (entryId) => {
    setError(null);
    const previous = entries;
    queryClient.setQueryData(queryKeys.mealPlan, (prev = []) => prev.filter((e) => e.id !== entryId));
    try {
      await deleteMealPlanEntry(entryId);
    } catch (err) {
      setError(err.message);
      queryClient.setQueryData(queryKeys.mealPlan, previous);
    }
  };

  return (
    <div className="m-1 pb-10">
      <div className="flex items-center">
        <Link
          to="/"
          aria-label="Back"
          className="bg-blue hover:bg-blue-dark rounded-full p-1 flex items-center justify-center w-3.5 h-3.5"
        >
          <ChevronLeft size={12} className="text-beige" />
        </Link>
        <h1 className="text-dark-green text-h2 my-3 flex-1 text-center">Meal Planning</h1>
        <Link
          to="/meal-plan/add"
          aria-label="Add meals to plan"
          className="bg-blue hover:bg-blue-dark rounded-full p-1 flex items-center justify-center w-3.5 h-3.5"
        >
          <Plus size={12} className="text-beige" />
        </Link>
      </div>

      <ErrorText>{error}</ErrorText>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div>
          {(unplanned.length > 0 || isDragActive) && (
            <>
              <h2 className="text-dark-green text-h4 mb-1 mt-2">Unplanned</h2>
              <MealPlanDropZone id={UNPLANNED} horizontal>
                {unplanned.map((entry) => (
                  <MealPlanUnplannedTile key={entry.id} entry={entry} onRemove={handleRemove} />
                ))}
              </MealPlanDropZone>
            </>
          )}

          <div className="flex items-center justify-between mt-5 mb-2">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
              disabled={weekOffset === 0}
              aria-label="Previous week"
              className="text-dark-green disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-dark-green text-body-1">
              {weekOffset === 0 ? 'This Week' : `${weekDays[0].shortDate} – ${weekDays[6].shortDate}`}
            </span>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Next week"
              className="text-dark-green cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex flex-col divide-y divide-gray">
            {weekDays.map((day) => (
              <div key={day.iso} className="py-3 first:pt-0">
                <h2 className="text-dark-green text-h4 mb-1">
                  {day.weekday}
                  <span className="text-body-2 opacity-60 ml-1">
                    {day.shortDate}
                    {day.isToday ? ' (Today)' : ''}
                  </span>
                </h2>
                <MealPlanDropZone id={day.iso}>
                  {entriesByDate(day.iso).map((entry) => (
                    <MealPlanCard key={entry.id} entry={entry} onRemove={handleRemove} />
                  ))}
                </MealPlanDropZone>
              </div>
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}

export default MealPlan;
