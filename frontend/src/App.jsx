import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import RecipeList from './components/RecipeList.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AddRecipe from './pages/AddRecipe.jsx';
import RecipeDetail from './pages/RecipeDetail';

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
    </Routes>
  );
}

export default App;