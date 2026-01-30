import { useState } from 'react';
import { useWeeklyList, useOffline } from '../hooks/useOffline';
import { weeklyApi } from '../services/api';
import GroceryItem from '../components/GroceryItem';
import RecipeCard from '../components/RecipeCard';

export default function Weekly() {
  const { data, loading, error, refetch, toggleItem } = useWeeklyList();
  const { isOnline, pendingSync } = useOffline();
  const [activeTab, setActiveTab] = useState('list');

  const handleAcceptRecipe = async (recipeId) => {
    if (!isOnline) {
      alert('You need to be online to accept recipes.');
      return;
    }
    await weeklyApi.acceptRecipe(data.id, recipeId);
    refetch();
  };

  const handleRejectRecipe = async (recipeId) => {
    if (!isOnline) {
      alert('You need to be online to reject recipes.');
      return;
    }
    await weeklyApi.rejectRecipe(data.id, recipeId);
    refetch();
  };

  const handleActivateList = async () => {
    if (!isOnline) {
      alert('You need to be online to activate the list.');
      return;
    }
    await weeklyApi.activateList(data.id);
    refetch();
  };

  const groupedItems = data?.items?.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {}) || {};

  const suggestedRecipes = data?.recipes?.filter(r => r.status === 'suggested') || [];
  const acceptedRecipes = data?.recipes?.filter(r => r.status === 'accepted') || [];

  const checkedCount = data?.items?.filter(i => i.checked).length || 0;
  const totalCount = data?.items?.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading your grocery list...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5">
        <p className="text-gray-700 mb-4">{error}</p>
        <button onClick={refetch} className="px-6 py-3 bg-indigo-500 text-white rounded-lg">
          Try Again
        </button>
      </div>
    );
  }

  if (data?.status === 'not_created') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">No List Yet</h2>
        <p className="text-gray-500">Your weekly grocery list will be generated on Sunday at 9 AM.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {!isOnline && (
        <div className="bg-amber-100 text-amber-800 p-3 text-center text-sm">
          You're offline. Changes will sync when you're back online.
        </div>
      )}

      {pendingSync && (
        <div className="bg-blue-100 text-blue-700 p-3 text-center text-sm">
          Syncing changes...
        </div>
      )}

      <header className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold mb-1">This Week's Groceries</h1>
          <p className="text-sm opacity-90">{data.week_start}</p>
        </div>
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-sm font-semibold">{checkedCount}/{totalCount}</span>
        </div>
      </header>

      {data.status === 'draft' && suggestedRecipes.length > 0 && (
        <div className="bg-purple-100 text-purple-700 p-4 text-center text-sm">
          Review your recipe suggestions below, then activate your list!
        </div>
      )}

      <div className="flex bg-white border-b border-gray-200 sticky top-0 z-10">
        <button
          className={`flex-1 py-4 text-sm font-medium relative ${activeTab === 'list' ? 'text-indigo-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('list')}
        >
          Shopping List
          {activeTab === 'list' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></span>}
        </button>
        <button
          className={`flex-1 py-4 text-sm font-medium relative flex items-center justify-center gap-2 ${activeTab === 'recipes' ? 'text-indigo-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('recipes')}
        >
          Recipes
          {suggestedRecipes.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{suggestedRecipes.length}</span>
          )}
          {activeTab === 'recipes' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></span>}
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'list' && (
          <div>
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">{category}</h3>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {items.map(item => (
                    <GroceryItem key={item.id} item={item} onToggle={toggleItem} />
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(groupedItems).length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <p>No items yet. Accept some recipes to add ingredients!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recipes' && (
          <div>
            {suggestedRecipes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Suggested for This Week</h3>
                {suggestedRecipes.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onAccept={handleAcceptRecipe}
                    onReject={handleRejectRecipe}
                  />
                ))}
              </div>
            )}

            {acceptedRecipes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Making This Week</h3>
                {acceptedRecipes.map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} showActions={false} />
                ))}
              </div>
            )}

            {suggestedRecipes.length === 0 && acceptedRecipes.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <p>No recipe suggestions this week.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {data.status === 'draft' && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg md:max-w-xl md:mx-auto">
          <button
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-60 active:scale-[0.98] transition-transform"
            onClick={handleActivateList}
            disabled={!isOnline}
          >
            Activate List & Go Shopping
          </button>
        </div>
      )}
    </div>
  );
}
