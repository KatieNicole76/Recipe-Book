import { useParams } from 'react-router-dom';
import { useGoBack } from '../hooks/useGoBack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '../api';
import { queryKeys } from '../queryKeys';
import PageHeader from '../components/PageHeader';
import ErrorText from '../components/ErrorText';
import RecipeReviewForm from '../components/RecipeReviewForm';

function EditRecipe() {
  const { id } = useParams();
  const goBack = useGoBack(`/recipe/${id}`);
  const queryClient = useQueryClient();

  const { data: recipe, isError } = useQuery({
    queryKey: queryKeys.recipe(id),
    queryFn: () => apiFetchJson(`/api/recipes/${id}/`),
  });

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.recipe(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
    queryClient.invalidateQueries({ queryKey: queryKeys.browseRecipes });
    queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    goBack();
  };

  return (
    <div className="m-1">
      <PageHeader title="Edit Recipe" backTo={`/recipe/${id}`} />

      <ErrorText>{isError ? 'Recipe not found' : null}</ErrorText>

      {recipe && (
        <RecipeReviewForm
          initialData={recipe}
          recipeId={id}
          saveButtonLabel="Save Changes"
          discardLabel="Discard Changes"
          onSaved={handleSaved}
          onDiscard={goBack}
        />
      )}
    </div>
  );
}

export default EditRecipe;
