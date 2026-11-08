import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchJson } from '../api';
import { queryKeys } from '../queryKeys';
import { useGoBack } from '../hooks/useGoBack';
import PageHeader from '../components/PageHeader';
import ErrorText from '../components/ErrorText';
import RecipeReviewForm from '../components/RecipeReviewForm';

/**
 * "Edit first" from Browse — lets you tweak someone else's recipe before
 * it's saved into your own cookbook. Saving here creates a new recipe
 * (never overwrites the original) marked via savedFromId so it's excluded
 * from the combined Browse list.
 */
function SaveRecipeCopy() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack(`/recipe/${id}`);
  const queryClient = useQueryClient();

  const { data: recipe, isError } = useQuery({
    queryKey: queryKeys.recipe(id),
    queryFn: () => apiFetchJson(`/api/recipes/${id}/`),
  });

  const handleSaved = (saved) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
    queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    // Replace this edit screen so back from the new copy skips over it
    navigate(`/recipe/${saved.id}`, { replace: true });
  };

  return (
    <div className="m-1">
      <PageHeader title="Edit Before Saving" backTo={`/recipe/${id}`} />

      <ErrorText>{isError ? 'Recipe not found' : null}</ErrorText>

      {recipe && (
        <RecipeReviewForm
          initialData={recipe}
          savedFromId={id}
          saveButtonLabel="Save to Your Cookbook"
          discardLabel="Cancel"
          onSaved={handleSaved}
          onDiscard={goBack}
        />
      )}
    </div>
  );
}

export default SaveRecipeCopy;
