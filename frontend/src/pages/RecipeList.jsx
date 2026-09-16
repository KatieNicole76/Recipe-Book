import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import OptionsModal from '../components/OptionsModal';
import HoverIcon from '../components/HoverIcon';
import RecipeGrid from '../components/RecipeGrid';
import Book from '../assets/book.png';
import BookDarker from '../assets/book-darker.png';
import Shopping from '../assets/shopping.png';
import ShoppingDarker from '../assets/shopping-darker.png';
import Plus from '../assets/plus.png';
import PlusDarker from '../assets/plus-darker.png';
import AccountIcon from '../assets/account.svg';
import AccountIconDarker from '../assets/account-darker.svg';

function RecipeList() {
  const [recipes, setRecipes] = useState([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const { username, logout, isSuperuser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    apiFetch('/api/recipes/')
      .then((res) => res.json())
      .then((data) => setRecipes(Array.isArray(data) ? data : []))
      .catch(() => setRecipes([]));
  }, []);

  return (
    <div>
      <div className="flex flex-row justify-between items-start">
        <h1 className="text-dark-green text-h2 mt-3 ml-1">
          {username}'s <br /> Recipe Book
        </h1>
        <button
          type="button"
          onClick={() => setShowAccountModal(true)}
          aria-label="Account"
          className="group w-[32px] h-[32px] mt-3 mr-1 shrink-0 cursor-pointer"
        >
          <HoverIcon src={AccountIcon} hoverSrc={AccountIconDarker} imgClassName="w-full h-full" />
        </button>
      </div>

      <OptionsModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="Account"
        options={[
          ...(isSuperuser
            ? [
                { label: 'Add User', onClick: () => navigate('/admin/users/new') },
                { label: 'Modify User', onClick: () => navigate('/admin/users') },
              ]
            : []),
          { label: 'Edit Recipe Tags', onClick: () => navigate('/tags/edit') },
          { label: 'Logout', onClick: handleLogout, destructive: true },
        ]}
      />

      <div className="flex flex-row gap-3 mt-5 mb-3 ml-1">
        <Link to="/browse" aria-label="Recipe Book" className="group">
          <HoverIcon src={Book} hoverSrc={BookDarker} imgClassName="max-h-[40px]" />
        </Link>
        <Link to="/shopping-list" aria-label="Shopping List" className="group">
          <HoverIcon src={Shopping} hoverSrc={ShoppingDarker} imgClassName="max-h-[40px]" />
        </Link>
        <Link to="/add-recipe" aria-label="Add Recipe" className="group">
          <HoverIcon src={Plus} hoverSrc={PlusDarker} imgClassName="max-h-[40px]" />
        </Link>
      </div>

      <RecipeGrid recipes={recipes} />
    </div>
  );
}

export default RecipeList;