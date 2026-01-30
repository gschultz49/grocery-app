import { useState, useEffect } from 'react';
import { staplesApi, pantryApi, settingsApi } from '../services/api';
import { signOut } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function Settings() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('staples');
  const [staples, setStaples] = useState([]);
  const [pantry, setPantry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ name: '', category: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [schedule, setSchedule] = useState({ day: 0, hour: 9, minute: 0 });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staplesData, pantryData, scheduleData] = await Promise.all([
        staplesApi.getAll(),
        pantryApi.getAll(),
        settingsApi.getSchedule()
      ]);
      setStaples(staplesData);
      setPantry(pantryData);
      if (scheduleData) {
        setSchedule(scheduleData);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    setScheduleSuccess(false);
    try {
      await settingsApi.updateSchedule(schedule);
      setScheduleSuccess(true);
      setTimeout(() => setScheduleSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save schedule:', error);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAddStaple = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    try {
      await staplesApi.add(newItem.name, newItem.category || 'Other');
      setNewItem({ name: '', category: '' });
      setIsAdding(false);
      loadData();
    } catch (error) {
      console.error('Failed to add staple:', error);
    }
  };

  const handleAddPantry = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    try {
      await pantryApi.add(newItem.name, newItem.category || 'Other');
      setNewItem({ name: '', category: '' });
      setIsAdding(false);
      loadData();
    } catch (error) {
      console.error('Failed to add pantry item:', error);
    }
  };

  const handleToggleStaple = async (id, active) => {
    try {
      await staplesApi.update(id, { active: !active });
      loadData();
    } catch (error) {
      console.error('Failed to toggle staple:', error);
    }
  };

  const handleToggleRestock = async (id, needsRestock) => {
    try {
      await pantryApi.markRestock(id, !needsRestock);
      loadData();
    } catch (error) {
      console.error('Failed to toggle restock:', error);
    }
  };

  const handleDeleteStaple = async (id) => {
    if (!confirm('Remove this staple?')) return;
    try {
      await staplesApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete staple:', error);
    }
  };

  const handleDeletePantry = async (id) => {
    if (!confirm('Remove this pantry item?')) return;
    try {
      await pantryApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete pantry item:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const formatTime = (hour, minute) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6">
        <h1 className="text-xl font-semibold">Settings</h1>
      </header>

      <section className="bg-white p-4 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img
            src={user?.user_metadata?.avatar_url || '/default-avatar.png'}
            alt="Profile"
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-gray-800">{user?.user_metadata?.full_name || 'User'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
        >
          Sign Out
        </button>
      </section>

      <div className="flex bg-white border-b border-gray-200">
        <button
          className={`flex-1 py-3.5 text-sm font-medium relative ${activeSection === 'staples' ? 'text-indigo-500' : 'text-gray-500'}`}
          onClick={() => { setActiveSection('staples'); setIsAdding(false); }}
        >
          Staples
          {activeSection === 'staples' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></span>}
        </button>
        <button
          className={`flex-1 py-3.5 text-sm font-medium relative ${activeSection === 'pantry' ? 'text-indigo-500' : 'text-gray-500'}`}
          onClick={() => { setActiveSection('pantry'); setIsAdding(false); }}
        >
          Pantry
          {activeSection === 'pantry' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></span>}
        </button>
        <button
          className={`flex-1 py-3.5 text-sm font-medium relative ${activeSection === 'schedule' ? 'text-indigo-500' : 'text-gray-500'}`}
          onClick={() => { setActiveSection('schedule'); setIsAdding(false); }}
        >
          Schedule
          {activeSection === 'schedule' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></span>}
        </button>
      </div>

      <div className="p-4">
        {/* Schedule Section */}
        {activeSection === 'schedule' && (
          <div>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-800">Weekly Suggestion Schedule</h2>
              <p className="text-sm text-gray-500">Choose when you want to receive your weekly grocery suggestions</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                <select
                  value={schedule.day}
                  onChange={(e) => setSchedule({ ...schedule, day: parseInt(e.target.value) })}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                >
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <div className="flex gap-2">
                  <select
                    value={schedule.hour}
                    onChange={(e) => setSchedule({ ...schedule, hour: parseInt(e.target.value) })}
                    className="flex-1 p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                      </option>
                    ))}
                  </select>
                  <select
                    value={schedule.minute}
                    onChange={(e) => setSchedule({ ...schedule, minute: parseInt(e.target.value) })}
                    className="flex-1 p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value={0}>:00</option>
                    <option value={15}>:15</option>
                    <option value={30}>:30</option>
                    <option value={45}>:45</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm text-gray-500 mb-3">
                  Next suggestion: <span className="font-medium text-gray-700">{DAYS_OF_WEEK.find(d => d.value === schedule.day)?.label} at {formatTime(schedule.hour, schedule.minute)}</span>
                </p>
                <button
                  onClick={handleSaveSchedule}
                  disabled={savingSchedule}
                  className="w-full p-3 bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {savingSchedule ? 'Saving...' : 'Save Schedule'}
                </button>
                {scheduleSuccess && (
                  <p className="text-sm text-emerald-600 text-center mt-2">Schedule saved successfully!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Staples/Pantry Sections */}
        {(activeSection === 'staples' || activeSection === 'pantry') && (
          <>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  {activeSection === 'staples' ? 'Weekly Staples' : 'Pantry Items'}
                </h2>
                <p className="text-sm text-gray-500">
                  {activeSection === 'staples'
                    ? 'Items automatically added to your weekly list'
                    : 'Items you always have (filtered from recipes)'}
                </p>
              </div>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium"
              >
                {isAdding ? 'Cancel' : '+ Add'}
              </button>
            </div>

            {isAdding && (
              <form
                className="bg-white p-4 rounded-xl mb-4 shadow-sm flex flex-col gap-3"
                onSubmit={activeSection === 'staples' ? handleAddStaple : handleAddPantry}
              >
                <input
                  type="text"
                  placeholder={activeSection === 'staples' ? 'Item name' : 'Item name (e.g., Salt)'}
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Category (optional)"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
                <button type="submit" className="p-3 bg-indigo-500 text-white rounded-lg text-sm font-medium">
                  Add {activeSection === 'staples' ? 'Staple' : 'Pantry Item'}
                </button>
              </form>
            )}

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {activeSection === 'staples' &&
                staples.map(item => (
                  <div
                    key={item.id}
                    className={`flex justify-between items-center p-4 border-b border-gray-100 last:border-b-0 ${!item.active ? 'opacity-50' : ''}`}
                  >
                    <div>
                      <span className="text-sm text-gray-800">{item.name}</span>
                      <span className="block text-xs text-gray-400">{item.category}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleStaple(item.id, item.active)}
                        className={`px-3 py-1.5 text-xs rounded-md border ${item.active ? 'bg-green-50 border-emerald-500 text-emerald-600' : 'border-gray-200 text-gray-500'}`}
                      >
                        {item.active ? 'Active' : 'Paused'}
                      </button>
                      <button
                        onClick={() => handleDeleteStaple(item.id)}
                        className="px-3 py-1.5 text-xs rounded-md bg-red-50 text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

              {activeSection === 'pantry' &&
                pantry.map(item => (
                  <div
                    key={item.id}
                    className={`flex justify-between items-center p-4 border-b border-gray-100 last:border-b-0 ${item.needs_restock ? 'bg-amber-50' : ''}`}
                  >
                    <div>
                      <span className="text-sm text-gray-800">{item.name}</span>
                      <span className="block text-xs text-gray-400">{item.category}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleRestock(item.id, item.needs_restock)}
                        className={`px-3 py-1.5 text-xs rounded-md border ${item.needs_restock ? 'bg-amber-100 border-amber-500 text-amber-700' : 'border-gray-200 text-gray-500'}`}
                      >
                        {item.needs_restock ? 'Need to Buy' : 'In Stock'}
                      </button>
                      <button
                        onClick={() => handleDeletePantry(item.id)}
                        className="px-3 py-1.5 text-xs rounded-md bg-red-50 text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
