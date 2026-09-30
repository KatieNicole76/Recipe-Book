// Central query-key definitions so a fetch site and its invalidating
// mutations can't drift out of sync with each other.
export const queryKeys = {
  recipes: ['recipes'],
  browseRecipes: ['recipes', 'browse'],
  recipe: (id) => ['recipes', 'detail', String(id)],
  tags: ['tags'],
  shoppingLists: ['shopping-lists'],
  users: ['users'],
  user: (id) => ['users', 'detail', String(id)],
  mealPlan: ['meal-plan'],
};
