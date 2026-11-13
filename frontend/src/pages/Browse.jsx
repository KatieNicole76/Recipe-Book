import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '../api';
import { queryKeys } from '../queryKeys';
import { useAuth } from '../context/AuthContext';
import { useSessionState } from '../hooks/useSessionState';
import { recordBrowseVisit } from '../utils/browseNewRecipes';
import PageHeader from '../components/PageHeader';
import RecipeGrid from '../components/RecipeGrid';
import DemoTip from '../components/DemoTip';

function Browse() {
  const { username } = useAuth();
  const { data: recipes = [] } = useQuery({
    queryKey: queryKeys.browseRecipes,
    queryFn: () => apiFetchJson('/api/recipes/browse/'),
  });
  // Recorded once per visit to this page (see recordBrowseVisit for the
  // next-day buffer that keeps the "new" list stable while reviewing it).
  const [newSince] = useState(() => recordBrowseVisit(username));
  const [onlyNew, setOnlyNew] = useSessionState('browse:onlyNew', false);

  const newRecipes = recipes.filter((r) => new Date(r.created_at).getTime() > newSince);
  const shown = onlyNew ? newRecipes : recipes;

  return (
    <div className="m-1">
      <DemoTip>
        This page will show you a list of recipes from other users. Users can be linked as
        "Families" and share recipes with each other.
      </DemoTip>
      <PageHeader title="Browse" backTo="/" />
      <RecipeGrid
        recipes={shown}
        emptyMessage={onlyNew ? 'No new recipes since your last visit.' : 'No recipes yet.'}
        storageKey="browse"
        toolbarExtra={
          <label className="flex items-center gap-1 mx-1 mt-1.5 text-dark-green text-body-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={onlyNew}
              onChange={(e) => setOnlyNew(e.target.checked)}
              className="w-2 h-2 accent-blue cursor-pointer"
            />
            Show only new ({newRecipes.length})
          </label>
        }
      />
    </div>
  );
}

export default Browse;
