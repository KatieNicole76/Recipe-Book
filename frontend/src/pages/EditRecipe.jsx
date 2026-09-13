import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { apiFetch } from '../api';
import RecipeReviewForm from '../components/RecipeReviewForm';

function EditRecipe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch(`/api/recipes/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error('Recipe not found');
        return res.json();
      })
      .then(setRecipe)
      .catch((err) => setError(err.message));
  }, [id]);

  return (
    <div className="m-1">
      {/******* HEADER ******/}
      <div className="flex items-center">
        <Link
          to={`/recipe/${id}`}
          aria-label="Back"
          className="bg-blue rounded-full p-1 flex items-center justify-center
           z-20 w-3.5 h-3.5"
        >
          <ChevronLeft size={12} className="text-beige" />
        </Link>

        <h1 className="text-dark-green text-h2 my-3 flex-1 text-center">Edit Recipe</h1>

        <div className="w-3.5 h-3.5" />
      </div>

      {error && <p className="text-red-600 text-body-2 text-center">{error}</p>}

      {recipe && (
        <RecipeReviewForm
          initialData={recipe}
          recipeId={id}
          saveButtonLabel="Save Changes"
          discardLabel="Discard Changes"
          onSaved={() => navigate(`/recipe/${id}`)}
          onDiscard={() => navigate(`/recipe/${id}`)}
        />
      )}
    </div>
  );
}

export default EditRecipe;
