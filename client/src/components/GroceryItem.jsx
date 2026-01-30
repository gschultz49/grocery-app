import { useState } from 'react';

const sourceStyles = {
  staple: 'bg-blue-100 text-blue-700',
  recipe: 'bg-amber-100 text-amber-700',
  manual: 'bg-gray-100 text-gray-600',
  pantry_restock: 'bg-red-100 text-red-600'
};

export default function GroceryItem({ item, onToggle }) {
  const [isChecked, setIsChecked] = useState(item.checked);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await onToggle(item.id, !isChecked);
      setIsChecked(!isChecked);
    } catch (error) {
      console.error('Failed to toggle item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`flex items-center p-3 border-b border-gray-100 last:border-b-0 transition-all
        ${isChecked ? 'bg-green-50' : ''}
        ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <label className="flex items-center cursor-pointer mr-3">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleToggle}
          disabled={isLoading}
          className="w-5 h-5 accent-emerald-500 cursor-pointer"
        />
      </label>
      <div className="flex items-center gap-2 flex-1">
        <span className={`text-base text-gray-800 ${isChecked ? 'line-through text-gray-400' : ''}`}>
          {item.name}
        </span>
        {item.quantity && (
          <span className="text-sm text-gray-500">{item.quantity}</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-medium ${sourceStyles[item.source] || 'bg-gray-100 text-gray-600'}`}>
          {item.source}
        </span>
      </div>
    </div>
  );
}
