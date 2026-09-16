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
  const cleanedIngredients = (data.ingredients || [])
    .filter((ing) => !isIngredientEmpty(ing))
    .map((ing) => {
      // _key is a client-only React list key, not part of the saved shape
      const { _key, ...rest } = ing;
      void _key;
      return rest;
    });
  const errors = validateIngredients(cleanedIngredients);
  const cleanedData = { ...data, ingredients: cleanedIngredients };
  return { cleanedData, errors };
}

/**
 * Saves a recipe. `imageFile`, if provided, is sent as a real file upload
 * (multipart) — used when the recipe came from a photo extraction (or the
 * user picked a replacement photo while reviewing/editing) and it should be
 * attached. Otherwise sends plain JSON (covers URL-extracted recipes,
 * recipes with no photo at all, and edits that don't touch the photo).
 *
 * `data.tags` (a plain array of tag name strings, if present) is sent to
 * the backend as `tag_names` — the serializer's write-only field. The
 * backend's read-only `tags` field is what comes back in the response.
 *
 * recipeId, if provided, PATCHes that existing recipe instead of creating
 * a new one via POST.
 *
 * savedFromId, if provided (and recipeId is not), marks the new recipe as
 * a copy of that recipe — used by the "Edit first" save-from-Browse flow,
 * so it's excluded from the combined Browse list like any other saved copy.
 */
export async function saveRecipe(data, { imageFile = null, recipeId = null, savedFromId = null } = {}) {
  const tagNames = data.tags || [];
  const isUpdate = recipeId != null;
  const url = isUpdate ? `/api/recipes/${recipeId}/update/` : '/api/recipes/save/';
  const method = isUpdate ? 'PATCH' : 'POST';
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
    if (data.source_url) formData.append('source_url', data.source_url);
    if (savedFromId) formData.append('saved_from', savedFromId);

    response = await apiFetch(url, { method, body: formData });
  } else {
    const payload = { ...data, tag_names: tagNames };
    delete payload.tags; // backend's read field is 'tags', write field is 'tag_names' — don't send both
    delete payload.image; // never send the existing image URL back as a write
    delete payload.video; // video is server-managed (read-only) — never send it back as a write
    if (isUpdate) {
      delete payload.image_url; // no fetch-from-url support on update — only a fresh file upload changes the photo
    }
    if (savedFromId) payload.saved_from = savedFromId;

    response = await apiFetch(url, {
      method,
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

export async function deleteRecipe(id) {
  const response = await apiFetch(`/api/recipes/${id}/delete/`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Could not delete recipe');
}

/**
 * Saves another user's recipe into your own cookbook verbatim (Browse's
 * "Save to your cookbook" option) — no edits, straight copy.
 */
export async function saveRecipeCopy(id) {
  const response = await apiFetch(`/api/recipes/${id}/save-copy/`, { method: 'POST' });
  if (!response.ok) throw new Error('Could not save that recipe');
  return response.json();
}

/**
 * Attaches a reference link to an existing recipe. Doesn't touch the
 * recipe's title/ingredients/steps — for a TikTok link, the backend also
 * fetches the thumbnail and video (best-effort; failures don't block the
 * link itself from being saved).
 */
export async function linkRecipeSource(id, url) {
  const response = await apiFetch(`/api/recipes/${id}/link-source/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Could not link that source');
  }
  return response.json();
}

/**
 * Metadata-only lookup for a TikTok link before a recipe exists yet (e.g.
 * linking a source while reviewing a fresh extraction, before the first
 * save). Returns { source_url, thumbnail_url } — no video download.
 */
export async function fetchTiktokPreview(url) {
  const response = await apiFetch('/api/recipes/tiktok-preview/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Could not fetch that TikTok video');
  }
  return response.json();
}

export function isTiktokUrl(url) {
  try {
    return /(^|\.)tiktok\.com$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}