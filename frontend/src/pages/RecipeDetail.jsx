import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { apiFetch } from '../api';

const PEEK_OFFSET = 250; 
const EXPANDED_OFFSET = 50;

function RecipeDetail() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    apiFetch(`/api/recipes/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error('Recipe not found');
        return res.json();
      })
      .then(setRecipe)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-beige flex items-center justify-center">
        <p className="text-blue text-body-1">{error}</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-beige flex items-center justify-center">
        <p className="text-blue text-body-1">Loading...</p>
      </div>
    );
  }

  const steps = (recipe.steps || '').split('\n').filter((s) => s.trim());

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <img
        src={recipe.image || 'https://placehold.co/600x800?text=No+Image'}
        alt={recipe.title}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <Link
        to="/"
        aria-label="Back"
        className="absolute top-2 left-1 bg-blue rounded-full p-1 
          flex items-center justify-center z-20">
        <ChevronLeft size={14} className="text-beige" />
      </Link>

      <motion.div
        className="absolute left-0 right-0 bottom-0 bg-beige 
          rounded-t-3xl overflow-y-auto z-10 [&::-webkit-scrollbar]:hidden 
          [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ height: '100vh' }}
        drag="y"
        dragConstraints={{ top: 0, bottom: PEEK_OFFSET - EXPANDED_OFFSET }}
        dragElastic={0.1}
        animate={{ y: expanded ? EXPANDED_OFFSET : PEEK_OFFSET }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onDragEnd={(event, info) => {
          const draggedDistance = info.offset.y;
          if (draggedDistance > (PEEK_OFFSET - EXPANDED_OFFSET) / 2) {
            setExpanded(false);
          } else {
            setExpanded(true);
          }
        }}
      >
        <div className="flex justify-center pt-2 pb-2 cursor-grab 
        active:cursor-grabbing">
          <div className="w-8 h-0.5 rounded-full bg-blue" />
        </div>

        <div className="px-2 pb-16">
          <h1 className="text-dark-green text-h3 mb-1">{recipe.title}</h1>

          {recipe.tags?.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-6">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-blue text-subtitle-1"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h2 className="text-dark-green text-h4 mb-3">Ingredients</h2>
          <ul className="mb-6 flex flex-col gap-2">
            {recipe.ingredients?.map((ing) => (
              <li key={ing.id} className="text-dark-green text-body1">
                <span className="font-bold">
                  {ing.amount ?? ''} {ing.unit}
                </span>{' '}
                {ing.name}
                {ing.notes ? ` (${ing.notes})` : ''}
              </li>
            ))}
          </ul>

          <h2 className="text-dark-green text-h3 mb-3">Directions</h2>
          <ol className="flex flex-col gap-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-blue text-beige text-body1 flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-dark-green text-body1 pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </motion.div>
    </div>
  );
}

export default RecipeDetail;