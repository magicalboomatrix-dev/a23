import { useState, useEffect } from 'react';
import api from '../utils/api';

function getLocalDateInputValue(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Games() {
  const [games, setGames] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showResult, setShowResult] = useState(null);
  const [form, setForm] = useState({ name: '', open_time: '', close_time: '' });
  const [resultForm, setResultForm] = useState({ result_number: '', result_date: getLocalDateInputValue() });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadGames(); }, []);

  const loadGames = async () => {
    try {
      const res = await api.get('/games');
      setGames(Array.isArray(res.data.games) ? res.data.games : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/games', form);
      setShowForm(false);
      setForm({ name: '', open_time: '', close_time: '' });
      loadGames();
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Game already exists — try a different name.');
      } else {
        setError(err.response?.data?.error || 'Failed');
      }
    }
  };

  const toggleActive = async (id, current) => {
    try {
      await api.put(`/games/${id}`, { is_active: current ? 0 : 1 });
      loadGames();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const declareResult = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/games/${showResult}/result`, resultForm);
      setShowResult(null);
      setResultForm({ result_number: '', result_date: getLocalDateInputValue() });
      loadGames();
      alert('Result declared and bets settled!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Games ({games.length})</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium">
          {showForm ? 'Cancel' : '+ Add Game'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input type="text" placeholder="Game Name (e.g., DISAWAR)" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-4 py-2 border focus:ring-2 focus:ring-primary-500 outline-none" required />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Open Time</label>
              <input type="time" value={form.open_time}
                onChange={(e) => setForm({ ...form, open_time: e.target.value })}
                className="w-full px-4 py-2 border focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Close Time</label>
              <input type="time" value={form.close_time}
                onChange={(e) => setForm({ ...form, close_time: e.target.value })}
                className="w-full px-4 py-2 border focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
          </div>
          <button type="submit" className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 text-sm font-medium">Create Game</button>
        </form>
      )}

      {/* Declare Result Modal */}
      {showResult && (
        <form onSubmit={declareResult} className="bg-white border p-6 space-y-4 border-primary-300">
          <h4 className="font-semibold text-gray-800">Declare Result for Game #{showResult}</h4>
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" placeholder="Result Number (e.g., 57)" value={resultForm.result_number}
              onChange={(e) => setResultForm({ ...resultForm, result_number: e.target.value })}
              className="px-4 py-2 border focus:ring-2 focus:ring-primary-500 outline-none" required />
            <input type="date" value={resultForm.result_date}
              onChange={(e) => setResultForm({ ...resultForm, result_date: e.target.value })}
              className="px-4 py-2 border focus:ring-2 focus:ring-primary-500 outline-none" required />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium">Declare & Settle Bets</button>
            <button type="button" onClick={() => setShowResult(null)} className="px-4 py-2 bg-gray-200 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((g) => (
          <div key={g.id} className={`bg-white border p-5 ${!g.is_active ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-bold text-lg text-gray-800">{g.name}</h4>
              <span className={`px-2 py-1 text-xs font-medium ${g.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {g.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Open: <span className="font-medium">{g.open_time}</span></p>
              <p>Close: <span className="font-medium">{g.close_time}</span></p>
              {g.result_number && (
                <p className="text-primary-600 font-bold">Today's Result: {g.result_number}</p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowResult(g.id); setError(''); }}
                className="flex-1 px-3 py-2 bg-primary-600 text-white text-xs font-medium hover:bg-primary-700">
                Declare Result
              </button>
              <button onClick={() => toggleActive(g.id, g.is_active)}
                className={`px-3 py-2 text-xs font-medium ${g.is_active ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                {g.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {games.length === 0 && !loading && (
        <div className="text-center py-10 text-gray-400">No games configured</div>
      )}
    </div>
  );
}
