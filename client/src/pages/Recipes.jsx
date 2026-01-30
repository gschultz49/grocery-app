import { useState, useEffect } from 'react';
import { recipesApi } from '../services/api';

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const data = await recipesApi.getAll();
      setRecipes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (recipe) => {
    try {
      await recipesApi.toggleFavorite(recipe.id, recipe.name, !recipe.is_favorite);
      setRecipes(prev =>
        prev.map(r => (r.id === recipe.id ? { ...r, is_favorite: !r.is_favorite } : r))
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const filteredRecipes = recipes.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading recipes from Notion...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5">
        <p className="text-gray-700 mb-4">{error}</p>
        <button onClick={loadRecipes} className="px-6 py-3 bg-indigo-500 text-white rounded-lg">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6">
        <h1 className="text-xl font-semibold mb-1">My Recipes</h1>
        <p className="text-sm opacity-90">{recipes.length} recipes from Notion</p>
      </header>

      <div className="p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white"
        />
      </div>

      <div className="p-4">
        {filteredRecipes.map(recipe => (
          <div key={recipe.id} className="bg-white rounded-xl p-4 mb-3 flex justify-between items-start shadow-sm">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-800 mb-1">{recipe.name}</h3>
              {recipe.category && (
                <span className="inline-block text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full mb-2">
                  {recipe.category}
                </span>
              )}
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <p className="text-sm text-gray-500 truncate">
                  {recipe.ingredients.slice(0, 3).join(', ')}
                  {recipe.ingredients.length > 3 && ` +${recipe.ingredients.length - 3} more`}
                </p>
              )}
            </div>
            <button
              className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${recipe.is_favorite ? 'text-red-500' : 'text-gray-300'}`}
              onClick={() => handleToggleFavorite(recipe)}
              aria-label={recipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg viewBox="0 0 24 24" fill={recipe.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        ))}

        {filteredRecipes.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <p>No recipes found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
