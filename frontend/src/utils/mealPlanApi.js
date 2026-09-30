import { apiFetch, apiFetchJson } from '../api';

export function fetchMealPlan() {
  return apiFetchJson('/api/recipes/meal-plan/');
}

/**
 * Adds one or more of the user's own recipes to the meal plan, unplanned
 * (no day assigned yet).
 */
export async function addToMealPlan(recipeIds) {
  const response = await apiFetch('/api/recipes/meal-plan/add/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe_ids: recipeIds }),
  });
  if (!response.ok) throw new Error('Could not add to meal plan');
  return response.json();
}

/**
 * Moves an entry to a day (an ISO date string), or back to unplanned when
 * `date` is null.
 */
export async function updateMealPlanEntryDate(id, date) {
  const response = await apiFetch(`/api/recipes/meal-plan/${id}/update/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
  if (!response.ok) throw new Error('Could not move that meal');
  return response.json();
}

export async function deleteMealPlanEntry(id) {
  const response = await apiFetch(`/api/recipes/meal-plan/${id}/delete/`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Could not remove that meal');
}
