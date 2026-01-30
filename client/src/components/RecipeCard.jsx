import { useState } from 'react';

const statusStyles = {
  suggested: 'bg-amber-500',
  accepted: 'bg-emerald-500',
  rejected: 'bg-red-500'
};

const cardStyles = {
  suggested: 'border-gray-200 bg-white',
  accepted: 'border-emerald-500 bg-green-50',
  rejected: 'border-gray-200 bg-gray-50 opacity-70'
};

export default function RecipeCard({ recipe, onAccept, onReject, showActions = true }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept(recipe.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject(recipe.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`rounded-xl p-4 mb-3 border shadow-sm transition-all
        ${cardStyles[recipe.status]}
        ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <div className="flex justify-between items-start gap-3 mb-3">
        <h3 className="text-base font-semibold text-gray-800 flex-1">{recipe.name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full text-white font-medium uppercase whitespace-nowrap ${statusStyles[recipe.status]}`}>
          {recipe.status}
        </span>
      </div>

      {showActions && recipe.status === 'suggested' && (
        <div className="flex gap-2">
          <button
            className="flex-1 py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            onClick={handleAccept}
            disabled={isLoading}
          >
            Accept
          </button>
          <button
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            onClick={handleReject}
            disabled={isLoading}
          >
            Skip
          </button>
        </div>
      )}

      {recipe.status === 'accepted' && (
        <p className="text-sm text-emerald-600 m-0">Ingredients added to your list</p>
      )}
    </div>
  );
}
