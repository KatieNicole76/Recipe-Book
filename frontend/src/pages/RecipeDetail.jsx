import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, useDragControls } from 'framer-motion';
import { ChevronLeft, ShoppingCart, ExternalLink, Video, Plus } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { unitConversion, pluralizeUnit } from '../utils/UnitConversion';
import { deleteRecipe, saveRecipeCopy, isTiktokUrl } from '../utils/recipeApi';
import AddToShoppingListModal from '../components/AddToShoppingListModal';
import OptionsModal from '../components/OptionsModal';
import ConfirmModal from '../components/ConfirmModal';
import ErrorText from '../components/ErrorText';
import VideoPlayerModal from '../components/VideoPlayerModal';
import HoverIcon from '../components/HoverIcon';
import OptionsIcon from '../assets/options.svg';
import OptionsIconDarker from '../assets/options-darker.svg';

const PEEK_OFFSET = 150;
const EXPANDED_OFFSET = 50;

// Keys the actual component by :id so navigating from one recipe straight
// to another (e.g. after saving a copy) fully remounts it — otherwise
// React Router reuses the same instance and transient UI state (an open
// modal, drag position, etc.) would leak across from the previous recipe.
function RecipeDetail() {
  const { id } = useParams();
  return <RecipeDetailPage key={id} />;
}

function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { username } = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveCopyError, setSaveCopyError] = useState(null);
  const dragControls = useDragControls();

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteRecipe(id);
      navigate('/');
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  const handleSaveAsIs = async () => {
    setSaveCopyError(null);
    try {
      const saved = await saveRecipeCopy(id);
      navigate(`/recipe/${saved.id}`);
    } catch (err) {
      setSaveCopyError(err.message);
    }
  };

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
  const allTags = [recipe.recipe_type, ...(recipe.tags || [])];
  const isOwner = recipe.owner === username;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <img
        src={recipe.image || 'https://placehold.co/600x800?text=No+Image'}
        alt={recipe.title}
        className="absolute inset-0 w-full h-[45vh] object-cover"
      />

      <Link
        to="/"
        aria-label="Back"
        className="absolute top-2 left-1 bg-blue hover:bg-blue-dark rounded-full p-1
          flex items-center justify-center z-20">
        <ChevronLeft size={12} className="text-beige" />
      </Link>

      <motion.div
        className="absolute left-0 right-0 bottom-0 bg-beige 
          rounded-t-3xl overflow-y-auto z-10 [&::-webkit-scrollbar]:hidden 
          [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ height: '100vh', touchAction: 'pan-y' }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
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

        <div className="pb-20">
          <div
            className="relative rounded-t-xl bg-green w-full pb-1 cursor-grab
              active:cursor-grabbing touch-none"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <div className="flex justify-center pt-2 pb-3">
              <div className="w-8 h-0.5 rounded-full bg-dark-green" />
            </div>
            <h1 className="text-white text-h3 ml-2">{recipe.title}</h1>
            <div className="flex flex-wrap items-center gap-1 mb-2 ml-2">
              {allTags.map((tag, i) => (
                <span key={tag} className="text-white text-subtitle-1 flex items-center gap-1">
                  {i > 0 && <span className="opacity-60">•</span>}
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-end gap-1 mr-2">
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAddToList(true)}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Add to shopping list"
                    className="w-[32px] h-[32px] bg-blue hover:bg-blue-dark rounded-full flex items-center justify-center cursor-pointer"
                  >
                    <ShoppingCart size={16} className="text-beige" />
                  </button>
                  {recipe.source_url && (
                    <a
                      href={recipe.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label="View source"
                      className="w-[32px] h-[32px] bg-blue hover:bg-blue-dark rounded-full flex items-center justify-center cursor-pointer"
                    >
                      <ExternalLink size={16} className="text-beige" />
                    </a>
                  )}
                  {(recipe.video || (recipe.source_url && isTiktokUrl(recipe.source_url))) && (
                    <button
                      type="button"
                      onClick={() => setShowVideoModal(true)}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label="Play video"
                      className="w-[32px] h-[32px] bg-blue hover:bg-blue-dark rounded-full flex items-center justify-center cursor-pointer"
                    >
                      <Video size={16} className="text-beige" />
                    </button>
                  )}
                </>
              )}
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => setShowOptionsModal(true)}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Recipe options"
                  className="group w-[32px] h-[32px] flex items-center justify-center cursor-pointer"
                >
                  <HoverIcon src={OptionsIcon} hoverSrc={OptionsIconDarker} imgClassName="w-full h-full" />
                </button>
              ) : (
                <>
                  <span className="text-white font-mono font-normal tracking-widest text-[11px] opacity-80 truncate max-w-[200px] mr-auto ml-2">
                    From {recipe.owner}'s Cook Book
                  </span>
                  {(recipe.video || (recipe.source_url && isTiktokUrl(recipe.source_url))) && (
                    <button
                      type="button"
                      onClick={() => setShowVideoModal(true)}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label="Play video"
                      className="w-[32px] h-[32px] bg-blue hover:bg-blue-dark rounded-full flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <Video size={16} className="text-beige" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(true)}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Save to your cookbook"
                    className="w-[32px] h-[32px] bg-blue hover:bg-blue-dark rounded-full flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Plus size={16} className="text-beige" />
                  </button>
                </>
              )}
            </div>
          </div>

          <ErrorText>{saveCopyError}</ErrorText>

          <h2 className="text-dark-green text-h4 mb-1 my-2 ml-1">Ingredients</h2>
          <ul className="ml-4 mb-5 flex flex-col gap-2 list-disc list-outside">
            {recipe.ingredients?.map((ing) => (
              <li key={ing.id} className="text-dark-green text-body-1">
                <span className="font-bold text-[20px]">
                  {unitConversion(ing.amount)} {pluralizeUnit(ing.unit, ing.amount)}
                </span><span> </span>
                {ing.name}
                {ing.notes ? ` (${ing.notes})` : ''}
              </li>
            ))}
          </ul>

          <div className="flex justify-center my-2">
            <div className="w-30 h-0.5 bg-green/50 rounded-full" />
          </div>

          <h2 className="text-dark-green text-h4 mb-2 my-3 ml-1">Directions</h2>
          <ol className="flex flex-col gap-2 ml-2">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-1 items-start">
                <span className="shrink-0 w-3 h-3 rounded-full bg-blue
                 text-beige text-body1 flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-dark-green text-body-1">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </motion.div>

      {showAddToList && (
        <AddToShoppingListModal
          onClose={() => setShowAddToList(false)}
          ingredients={recipe.ingredients || []}
        />
      )}

      {showVideoModal && (
        <VideoPlayerModal
          videoUrl={recipe.video}
          sourceUrl={recipe.source_url}
          onClose={() => setShowVideoModal(false)}
        />
      )}

      <OptionsModal
        open={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        title="Recipe Options"
        options={[
          { label: 'Edit', onClick: () => navigate(`/recipe/${id}/edit`) },
          {
            label: 'Delete',
            destructive: true,
            onClick: () => {
              setShowOptionsModal(false);
              setShowDeleteConfirm(true);
            },
          },
        ]}
      />

      <OptionsModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Recipe"
        options={[
          { label: 'Save to your cookbook', onClick: handleSaveAsIs },
          { label: 'Edit first', onClick: () => navigate(`/recipe/${id}/save-edit`) },
        ]}
      />

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Recipe"
        message="Are you sure you want to delete this recipe?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        error={deleteError}
      />
    </div>
  );
}

export default RecipeDetail;