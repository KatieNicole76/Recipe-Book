import { useState } from 'react';
import { Link } from 'react-router-dom';
import Pill from './Pill';
import CheckboxModal from './CheckboxModal';
import SearchIcon from '../assets/search.png';
import Filter from '../assets/filter.png';

const RECIPE_TYPES = ['dinner', 'lunch', 'breakfast', 'dessert', 'side', 'snack', 'other'];
const TYPE_LABELS = {
  dinner: 'Dinner',
  lunch: 'Lunch',
  breakfast: 'Breakfast',
  dessert: 'Desert',
  side: 'Side',
  snack: 'Snack',
  other: 'Other',
};

/**
 * Search + tag/type filter + recipe card grid, shared by the home page
 * (your own cookbook), Browse (the combined family cookbook), and the meal
 * plan's recipe picker — each just hands it a different `recipes` list.
 *
 * Pass `selectedIds`/`onToggleSelect` to switch tiles from "tap to open
 * the recipe" into "tap to check/uncheck it" (a checkbox badge appears
 * top-left) — used by the meal plan picker to multi-select recipes
 * instead of navigating.
 */
function RecipeGrid({ recipes, emptyMessage = 'No recipes found.', selectedIds = null, onToggleSelect }) {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const allTags = [...new Set(recipes.flatMap((r) => r.tags || []))].sort();

  const labelFor = (value) => TYPE_LABELS[value] || value;

  const modalOptions = [
    ...RECIPE_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] })),
    ...allTags.map((t) => ({ value: t, label: t })),
  ];

  const toggleFilter = (value) => {
    setActiveFilters((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  };

  const filtered = recipes.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      activeFilters.length === 0 ||
      activeFilters.includes(r.recipe_type) ||
      activeFilters.some((f) => (r.tags || []).includes(f));
    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <div className="flex flex-row">
        <div className="relative inline-block mx-1 flex-1">
          <input
            type="text"
            aria-label="Search recipes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-4 px-2 pr-6 rounded-full text-body-2 bg-white border border-gray box-border"
          />
          <img
            src={SearchIcon}
            alt=""
            className="max-h-[18px] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
          />
        </div>
        <button onClick={() => setShowTagPicker((s) => !s)} aria-label="Add tag filter" className="cursor-pointer">
          <img src={Filter} alt="" className="max-h-[20px] cursor-pointer mr-2" />
        </button>
      </div>

      <CheckboxModal
        open={showTagPicker}
        onClose={() => setShowTagPicker(false)}
        title="Filters"
        options={modalOptions}
        selected={activeFilters}
        onToggle={toggleFilter}
      />

      <div className="flex gap-2 overflow-x-auto px-1 py-2
      [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]
      [scrollbar-width:none]">
        {activeFilters.map((value) => (
          <Pill
            key={value}
            label={labelFor(value)}
            active
            onRemove={() => toggleFilter(value)}
          />
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 p-1">
        {filtered.map((recipe) => {
          const tileClassName = 'relative rounded-xl overflow-hidden aspect-square max-w-[200px] w-full mx-auto block';
          const tileContent = (
            <>
              <img
                src={recipe.image || 'https://placehold.co/300x300?text=No+Image'}
                alt={recipe.title}
                className="w-full h-full object-cover block"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-dark-green/85
                text-white px-1 py-1 text-body-2 leading-tight">
                {recipe.title}
              </div>
              {selectedIds && (
                <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-beige flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(recipe.id)}
                    readOnly
                    aria-hidden="true"
                    tabIndex={-1}
                    className="w-2 h-2 accent-blue pointer-events-none"
                  />
                </div>
              )}
            </>
          );

          return selectedIds ? (
            <button
              type="button"
              onClick={() => onToggleSelect(recipe.id)}
              aria-pressed={selectedIds.includes(recipe.id)}
              className={tileClassName + ' cursor-pointer'}
              key={recipe.id}
            >
              {tileContent}
            </button>
          ) : (
            <Link to={`/recipe/${recipe.id}`} className={tileClassName} key={recipe.id}>
              {tileContent}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-dark-green text-body-1 text-center mt-8">
          {emptyMessage}
        </p>
      )}
    </>
  );
}

export default RecipeGrid;
