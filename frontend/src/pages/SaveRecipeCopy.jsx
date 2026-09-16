import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
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
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    apiFetch(`/api/recipes/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error('Recipe not found');
        return res.json();
      })
      .then((data) => {
        if (!ignore) setRecipe(data);
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  return (
    <div className="m-1">
      <PageHeader title="Edit Before Saving" backTo={`/recipe/${id}`} />

      <ErrorText>{error}</ErrorText>

      {recipe && (
        <RecipeReviewForm
          initialData={recipe}
          savedFromId={id}
          saveButtonLabel="Save to Your Cookbook"
          discardLabel="Cancel"
          onSaved={(saved) => navigate(`/recipe/${saved.id}`)}
          onDiscard={() => navigate(`/recipe/${id}`)}
        />
      )}
    </div>
  );
}

export default SaveRecipeCopy;
