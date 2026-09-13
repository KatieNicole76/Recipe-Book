import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import RecipeList from './pages/RecipeList.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AddRecipe from './pages/AddRecipe.jsx';
import RecipeDetail from './pages/RecipeDetail';
import EditRecipe from './pages/EditRecipe.jsx';
import ShoppingList from './pages/ShoppingList.jsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RecipeList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-recipe"
        element={
          <ProtectedRoute>
            <AddRecipe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipe/:id"
        element={
          <ProtectedRoute>
            <RecipeDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipe/:id/edit"
        element={
          <ProtectedRoute>
            <EditRecipe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shopping-list"
        element={
          <ProtectedRoute>
            <ShoppingList />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;