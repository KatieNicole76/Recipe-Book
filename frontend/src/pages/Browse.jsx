import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import PageHeader from '../components/PageHeader';
import RecipeGrid from '../components/RecipeGrid';

function Browse() {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    apiFetch('/api/recipes/browse/')
      .then((res) => res.json())
      .then((data) => setRecipes(Array.isArray(data) ? data : []))
      .catch(() => setRecipes([]));
  }, []);

  return (
    <div className="m-1">
      <PageHeader title="Browse" backTo="/" />
      <RecipeGrid recipes={recipes} emptyMessage="No recipes yet." />
    </div>
  );
}

export default Browse;
