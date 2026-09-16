import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import PhotoExtractForm from '../components/PhotoExtractForm';
import UrlExtractForm from '../components/UrlExtractForm';
import RecipeReviewForm from '../components/RecipeReviewForm';

function AddRecipe() {
  const [mode, setMode] = useState('url');
  const [result, setResult] = useState(null);
  const [extractedImageFile, setExtractedImageFile] = useState(null);

  const navigate = useNavigate();

  const handleExtracted = (data, imageFile) => {
    setResult(data);
    setExtractedImageFile(imageFile);
  };

  const handleDiscard = () => {
    setResult(null);
    setExtractedImageFile(null);
  };

  const handleSaved = () => {
    navigate('/');
  };

  return (
    <div className="m-1">
      <PageHeader title="Add a Recipe" backTo="/" />

      {!result && (
        <>
          <div className="relative flex bg-dark-green rounded-full p-1 my-5">
            {['url', 'photo'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="relative flex-1 py-1 rounded-full text-body-1 cursor-pointer z-10"
              >
                {mode === m && (
                  <motion.div
                    layoutId="toggle-highlight"
                    className="absolute inset-0 bg-beige rounded-full -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                  />
                )}
                <span className={mode === m ? 'text-dark-green' : 'text-beige'}>
                  {m === 'url' ? 'Link' : 'Photo'}
                </span>
              </button>
            ))}
          </div>

          {mode === 'photo' && <PhotoExtractForm onExtracted={handleExtracted} />}
          {mode === 'url' && <UrlExtractForm onExtracted={handleExtracted} />}
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