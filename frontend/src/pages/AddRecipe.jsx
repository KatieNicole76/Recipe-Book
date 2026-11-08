import { useState } from 'react';
import { useGoBack } from '../hooks/useGoBack';
import { useQueryClient } from '@tanstack/react-query';
import { Link2, Camera, Sparkles, PencilLine, ChevronRight } from 'lucide-react';
import { queryKeys } from '../queryKeys';
import PageHeader from '../components/PageHeader';
import PhotoExtractForm from '../components/PhotoExtractForm';
import UrlExtractForm from '../components/UrlExtractForm';
import PromptExtractForm from '../components/PromptExtractForm';
import RecipeReviewForm from '../components/RecipeReviewForm';
import DemoTip from '../components/DemoTip';

const ENTRY_OPTIONS = [
  { id: 'url', label: 'Link', description: 'Paste a recipe website or video link', Icon: Link2 },
  { id: 'photo', label: 'Photo', description: 'Snap or upload a picture of a recipe', Icon: Camera },
  { id: 'prompt', label: 'Prompt', description: 'Describe it in your own words', Icon: Sparkles },
  { id: 'manual', label: 'Manual', description: 'Fill out the recipe form yourself', Icon: PencilLine },
];

const EMPTY_RECIPE = {
  title: '',
  recipe_type: 'dinner',
  steps: '',
  ingredients: [],
  tags: [],
};

function AddRecipe() {
  // null = still choosing how to add the recipe
  const [mode, setMode] = useState(null);
  const [result, setResult] = useState(null);
  const [extractedImageFile, setExtractedImageFile] = useState(null);

  const goBack = useGoBack('/');
  const queryClient = useQueryClient();

  const handleExtracted = (data, imageFile) => {
    setResult(data);
    setExtractedImageFile(imageFile);
  };

  const handleChoose = (id) => {
    if (id === 'manual') {
      setResult(EMPTY_RECIPE);
      setExtractedImageFile(null);
    }
    setMode(id);
  };

  const handleDiscard = () => {
    setResult(null);
    setExtractedImageFile(null);
    setMode(null);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
    queryClient.invalidateQueries({ queryKey: queryKeys.browseRecipes });
    queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    goBack();
  };

  return (
    <div className="m-1">
      {!result &&
      <DemoTip className="mb-1">
        AI extracts the full recipe automatically from a website link, a photo, or a
        description you type out. It can also take a video link and extract the recipe
        from the video description. Or choose Manual to fill it out yourself.
      </DemoTip>
    }
    {result && mode !== 'manual' &&
      <DemoTip className="mb-1">
        It will automatically detect the recipe title, ingredients, and instructions. You can edit anything before saving. 
        It will also suggests a category and tags for the recipe for easy filtering.

      </DemoTip>
    }

      {/* Once a way to add is picked, the back arrow returns to the options list instead of leaving the page */}
      <PageHeader title="Add a Recipe" backTo="/" onBack={mode ? handleDiscard : undefined} />

      {!result && (
        <>
          {!mode && (
            <ul className="flex flex-col gap-1.5 my-5">
              {ENTRY_OPTIONS.map(({ id, label, description, Icon }) => (
                <li key={id}>
                  <button
                    onClick={() => handleChoose(id)}
                    className="w-full flex items-center gap-1.5 bg-dark-green hover:bg-blue text-beige
                      rounded-2xl px-2 py-1.5 text-left cursor-pointer transition-colors"
                  >
                    <Icon size={22} className="shrink-0" aria-hidden="true" />
                    <span className="flex-1 flex flex-col">
                      <span className="text-body-1">{label}</span>
                      <span className="text-body-2 opacity-80">{description}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {mode === 'photo' && <PhotoExtractForm onExtracted={handleExtracted} />}
          {mode === 'url' && <UrlExtractForm onExtracted={handleExtracted} />}
          {mode === 'prompt' && <PromptExtractForm onExtracted={handleExtracted} />}
        </>
      )}

      {result && (
        <RecipeReviewForm
          initialData={result}
          imageFile={extractedImageFile}
          onSaved={handleSaved}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  );
}

export default AddRecipe;