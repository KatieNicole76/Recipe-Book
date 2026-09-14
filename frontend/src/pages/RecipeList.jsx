import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Pill from '../components/Pill';
import CheckboxModal from '../components/CheckboxModal';
import OptionsModal from '../components/OptionsModal';
import Book from '../assets/book.png';
import Shopping from '../assets/shopping.png';
import Plus from '../assets/plus.png';
import SearchIcon from '../assets/search.png';
import Filter from '../assets/filter.png';
import AccountIcon from '../assets/account.svg';

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
  const [activeFilters, setActiveFilters] = useState([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const { username, logout, isSuperuser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
    <div>
      <div className="flex flex-row justify-between items-start">
        <h1 className="text-dark-green text-h2 mt-3 ml-1">
          {username}'s <br /> Recipe Book
        </h1>
        <button
          type="button"
          onClick={() => setShowAccountModal(true)}
          aria-label="Account"
          className="w-[32px] h-[32px] mt-3 mr-1 shrink-0"
        >
          <img src={AccountIcon} alt="" className="w-full h-full" />
        </button>
      </div>

      <OptionsModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="Account"
        options={[
          ...(isSuperuser
            ? [
                { label: 'Add User', onClick: () => navigate('/admin/users/new') },
                { label: 'Modify User', onClick: () => navigate('/admin/users') },
              ]
            : []),
          { label: 'Edit Recipe Tags', onClick: () => navigate('/tags/edit') },
          { label: 'Logout', onClick: handleLogout, destructive: true },
        ]}
      />

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