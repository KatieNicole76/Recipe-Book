import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '../api';
import { queryKeys } from '../queryKeys';
import PageHeader from '../components/PageHeader';
import RecipeGrid from '../components/RecipeGrid';
import DemoTip from '../components/DemoTip';

function Browse() {
  const { data: recipes = [] } = useQuery({
    queryKey: queryKeys.browseRecipes,
    queryFn: () => apiFetchJson('/api/recipes/browse/'),
  });

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
