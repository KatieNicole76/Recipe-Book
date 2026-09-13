import { apiFetch } from '../api';

export async function fetchShoppingLists() {
  const response = await apiFetch('/api/recipes/shopping-lists/');
  if (!response.ok) throw new Error('Could not load shopping lists');
  return response.json();
}

export async function createShoppingList(name) {
  const response = await apiFetch('/api/recipes/shopping-lists/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error('Could not create list');
  return response.json();
}

export async function deleteShoppingList(listId) {
  const response = await apiFetch(`/api/recipes/shopping-lists/${listId}/`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Could not delete list');
}

export async function clearAllItems(listId) {
  const response = await apiFetch(`/api/recipes/shopping-lists/${listId}/clear-all/`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Could not clear list');
  return response.json();
}

export async function clearCheckedItems(listId) {
  const response = await apiFetch(`/api/recipes/shopping-lists/${listId}/clear-checked/`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Could not clear marked items');
  return response.json();
}

export async function addShoppingItem(listId, name) {
  const response = await apiFetch(`/api/recipes/shopping-lists/${listId}/items/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error('Could not add item');
  return response.json();
}

export async function addIngredientsToList(listId, ingredients) {
  const response = await apiFetch(`/api/recipes/shopping-lists/${listId}/add-ingredients/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients }),
  });
  if (!response.ok) throw new Error('Could not add ingredients');
  return response.json();
}

export async function toggleShoppingItem(itemId, isChecked) {
  const response = await apiFetch(`/api/recipes/shopping-list-items/${itemId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_checked: isChecked }),
  });
  if (!response.ok) throw new Error('Could not update item');
  return response.json();
}
