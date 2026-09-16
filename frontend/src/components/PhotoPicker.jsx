import { useRef } from 'react';

/**
 * Shared "Choose" button + hidden file input + filename row, used wherever
 * the user picks a recipe photo.
 *
 * Props:
 * - file: the newly-selected File, if any
 * - hasExisting: true if there's already a photo (e.g. editing a recipe)
 *   even though no new file has been chosen yet — shows "Current photo"
 *   instead of "No photo selected"
 * - onChange(file): called with the newly-selected File
 */
function PhotoPicker({ file, hasExisting = false, onChange }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const selected = e.target.files[0];
    if (selected) onChange(selected);
  };

  return (
    <div className="flex flex-row gap-1 items-center">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        className="bg-blue hover:bg-blue-dark text-beige px-2 py-0.5 rounded-xl cursor-pointer text-body-2"
      >
        Choose
      </button>
      <p className="text-dark-green text-body-2 opacity-70 truncate max-w-[200px]">
        {file ? file.name : hasExisting ? 'Current photo' : 'No photo selected'}
      </p>
    </div>
  );
}

export default PhotoPicker;
