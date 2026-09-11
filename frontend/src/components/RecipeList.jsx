import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Pill from './Pill';
import Book from '../assets/book.png';
import Shopping from '../assets/shopping.png';
import Plus from '../assets/plus.png';
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

function RecipeList() {
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState(['dinner', 'lunch', 'breakfast']);
  const [pillRow, setPillRow] = useState(RECIPE_TYPES); // everything that's ever been in the bar
  const [showTagPicker, setShowTagPicker] = useState(false);
  const { username, logout } = useAuth();

  useEffect(() => {
    apiFetch('/api/recipes/')
      .then((res) => res.json())
      .then((data) => setRecipes(Array.isArray(data) ? data : []))
      .catch(() => setRecipes([]));
  }, []);

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
    // once something is toggled on, it joins the pill row permanently
    setPillRow((prev) => (prev.includes(value) ? prev : [...prev, value]));
  };

  // active pills first (in their pillRow order), inactive pills pushed to the end
  const orderedPillRow = [
    ...pillRow.filter((v) => activeFilters.includes(v)),
    ...pillRow.filter((v) => !activeFilters.includes(v)),
  ];

  const filtered = recipes.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      activeFilters.length === 0 ||
      activeFilters.includes(r.recipe_type) ||
      activeFilters.some((f) => (r.tags || []).includes(f));
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div className="flex flex-row justify-between">
        <h1 className="text-dark-green text-h2 mt-3 ml-1">
          {username}'s <br /> Recipe Book
        </h1>
      </div>

      <div className="flex flex-row gap-3 mt-5 mb-3 ml-1">
        <Link to="/browse" aria-label="Recipe Book">
          <img src={Book} alt="" className="max-h-[40px]" />
        </Link>
        <Link to="/shopping-list" aria-label="Shopping List">
          <img src={Shopping} alt="" className="max-h-[40px]" />
        </Link>
        <Link to="/add-recipe" aria-label="Add Recipe">
          <img src={Plus} alt="" className="max-h-[40px]" />
        </Link>
      </div>

      <div className="flex flex-row ">
        <div className="relative inline-block mx-1 flex-1">
          <input
            type="text"
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
        <button onClick={() => setShowTagPicker((s) => !s)} aria-label="Add tag filter">
          <img src={Filter} alt="" className="max-h-[20px] cursor-pointer mr-2" />
        </button>
      </div>

      {showTagPicker && (
        <div
          className="fixed inset-0 p-6 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowTagPicker(false)}>
          <div
            className="bg-beige rounded-xl p-2 w-full max-w-[320px] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-dark-green text-h3 mb-2">Filters</h2>

            <div className="flex flex-col gap-1">
              {modalOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1 text-dark-green text-body-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFilters.includes(opt.value)}
                    onChange={() => toggleFilter(opt.value)}
                    className="w-2 h-2 cursor-pointer accent-blue"
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <button
              onClick={() => setShowTagPicker(false)}
              className="w-full bg-blue text-beige p-1 rounded-full mt-2 cursor-pointer"
            >Done</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto px-1 py-2 mb-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {orderedPillRow.map((value) => (
          <Pill
            key={value}
            label={labelFor(value)}
            active={activeFilters.includes(value)}
            onClick={() => toggleFilter(value)}
          />
        ))} 
      </div>

<div className="grid grid-cols-2 gap-2 p-1">
  {filtered.map((recipe) => (
    <Link
      to={`/recipe/${recipe.id}`}
      className="relative rounded-xl overflow-hidden aspect-square block"
      key={recipe.id}
    >
      <img
        src={recipe.image || 'https://placehold.co/300x300?text=No+Image'}
        alt={recipe.title}
        className="w-full h-full object-cover block"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-dark-green/85 
        text-white px-1 py-1 text-body-2 leading-tight">
        {recipe.title}
      </div>
    </Link>
  ))}
</div>

      {filtered.length === 0 && (
        <p className="text-dark-green text-body-1 text-center mt-8">
          No recipes found.
        </p>
      )}
    </div>
  );
}

export default RecipeList;