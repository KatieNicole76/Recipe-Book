import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import PageHeader from '../components/PageHeader';
import RecipeGrid from '../components/RecipeGrid';
import DemoTip from '../components/DemoTip';

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
      <DemoTip>
        This page will show you a list of recieps from other users. Users can be linked as
        "Families" and share recipes with each other.
      </DemoTip>
      <PageHeader title="Browse" backTo="/" />
      <RecipeGrid recipes={recipes} emptyMessage="No recipes yet." />
    </div>
  );
}

export default Browse;
