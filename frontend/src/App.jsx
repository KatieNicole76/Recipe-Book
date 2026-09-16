import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import RecipeList from './pages/RecipeList.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SuperuserRoute from './components/SuperuserRoute.jsx';
import AddRecipe from './pages/AddRecipe.jsx';
import RecipeDetail from './pages/RecipeDetail';
import EditRecipe from './pages/EditRecipe.jsx';
import Browse from './pages/Browse.jsx';
import SaveRecipeCopy from './pages/SaveRecipeCopy.jsx';
import ShoppingList from './pages/ShoppingList.jsx';
import AddUser from './pages/AddUser.jsx';
import UserList from './pages/UserList.jsx';
import EditUser from './pages/EditUser.jsx';
import EditTags from './pages/EditTags.jsx';

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
        path="/recipe/:id/save-edit"
        element={
          <ProtectedRoute>
            <SaveRecipeCopy />
          </ProtectedRoute>
        }
      />
      <Route
        path="/browse"
        element={
          <ProtectedRoute>
            <Browse />
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
      <Route
        path="/tags/edit"
        element={
          <ProtectedRoute>
            <EditTags />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/new"
        element={
          <SuperuserRoute>
            <AddUser />
          </SuperuserRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <SuperuserRoute>
            <UserList />
          </SuperuserRoute>
        }
      />
      <Route
        path="/admin/users/:id/edit"
        element={
          <SuperuserRoute>
            <EditUser />
          </SuperuserRoute>
        }
      />
    </Routes>
  );
}

export default App;