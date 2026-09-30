import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '../api';
import { queryKeys } from '../queryKeys';
import { addToMealPlan } from '../utils/mealPlanApi';
import PageHeader from '../components/PageHeader';
import RecipeGrid from '../components/RecipeGrid';
import ErrorText from '../components/ErrorText';

function MealPlanAddRecipes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: recipes = [] } = useQuery({
    queryKey: queryKeys.recipes,
    queryFn: () => apiFetchJson('/api/recipes/'),
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    setError(null);
    setSaving(true);
    try {
      await addToMealPlan(selectedIds);
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlan });
      navigate('/meal-plan');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="m-1 pb-20">
      <PageHeader title="Add to Meal Plan" backTo="/meal-plan" />

      <ErrorText>{error}</ErrorText>

      <RecipeGrid recipes={recipes} selectedIds={selectedIds} onToggleSelect={toggleSelect} />

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] bg-beige border-t border-gray p-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={selectedIds.length === 0 || saving}
          className="w-full bg-blue hover:bg-blue-dark text-beige text-body-1 py-1 rounded-full font-bold cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Adding...' : selectedIds.length > 0 ? `Add ${selectedIds.length} to Plan` : 'Select recipes to add'}
        </button>
      </div>
    </div>
  );
}

export default MealPlanAddRecipes;
