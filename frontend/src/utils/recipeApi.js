import { apiFetch } from '../api';

export function isIngredientEmpty(ing) {
  return !ing.name?.trim() && ing.amount === null && !ing.unit && !ing.notes?.trim();
}

export function validateIngredients(ingredients) {
  const errors = [];
  ingredients.forEach((ing, i) => {
    if (!ing.name?.trim()) {
      errors.push(`Ingredient ${i + 1}: name is required`);
    }
  });
  return errors;
}

export function formatSaveError(errData) {
  const messages = [];

  for (const [field, value] of Object.entries(errData)) {
    if (field === 'ingredients' && typeof value === 'object' && !Array.isArray(value)) {
      // ingredients errors come back keyed by index: {"5": {"name": ["..."]}}
      for (const [index, fieldErrors] of Object.entries(value)) {
        for (const [ingField, msgs] of Object.entries(fieldErrors)) {
          messages.push(`Ingredient ${parseInt(index) + 1}: ${ingField} — ${msgs.join(' ')}`);
        }
      }
    } else if (Array.isArray(value)) {
      messages.push(`${field}: ${value.join(' ')}`);
    } else {
      messages.push(`${field}: ${JSON.stringify(value)}`);
    }
  }

  return messages.join(' | ');
}

/**
 * Cleans a recipe's ingredients (drops fully-blank rows) and validates
 * what's left. Returns { cleanedData, errors }. If errors is non-empty,
 * the caller should show them and not attempt the save.
 */
export function prepareRecipeForSave(data) {
  const cleanedIngredients = (data.ingredients || []).filter((ing) => !isIngredientEmpty(ing));
  const errors = validateIngredients(cleanedIngredients);
  const cleanedData = { ...data, ingredients: cleanedIngredients };
  return { cleanedData, errors };
}

/**
 * Saves a recipe. `imageFile`, if provided, is sent as a real file upload
 * (multipart) — used when the recipe came from a photo extraction and the
 * original photo should be attached. Otherwise sends plain JSON (covers
 * URL-extracted recipes, and recipes with no photo at all).
 *
 * `data.tags` (a plain array of tag name strings, if present) is sent to
 * the backend as `tag_names` — the serializer's write-only field. The
 * backend's read-only `tags` field is what comes back in the response.
 *
 * recipeId is accepted for future edit/update support (PATCH to an existing
 * recipe) but isn't wired up on the backend yet — omitting it always creates
 * a new recipe via POST, same as today.
 */
export async function saveRecipe(data, { imageFile = null, recipeId = null } = {}) {
  const tagNames = data.tags || [];
  let response;

  if (imageFile) {
    const formData = new FormData();
    formData.append('title', data.title || '');
    formData.append('recipe_type', data.recipe_type || 'other');
    formData.append('is_meal_preppable', data.is_meal_preppable || false);
    formData.append('steps', data.steps || '');
    formData.append('ingredients', JSON.stringify(data.ingredients || []));
    formData.append('tag_names', JSON.stringify(tagNames));
    formData.append('image_file', imageFile);

    response = await apiFetch('/api/recipes/save/', {
      method: 'POST',
      body: formData,
    });
  } else {
    const payload = { ...data, tag_names: tagNames };
    delete payload.tags; // backend's read field is 'tags', write field is 'tag_names' — don't send both

    response = await apiFetch('/api/recipes/save/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(formatSaveError(errData));
  }

  return response.json();
}