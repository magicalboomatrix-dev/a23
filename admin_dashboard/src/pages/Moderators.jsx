import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Moderators() {
  const [moderators, setModerators] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadModerators(); }, []);

  const loadModerators = async () => {
    try {
      const res = await api.get('/moderators');
      setModerators(Array.isArray(res.data.moderators) ? res.data.moderators : []);
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
      await api.post('/moderators', form);
      setShowForm(false);
      setForm({ name: '', phone: '', password: '' });
      loadModerators();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this moderator? Their users will be unassigned.')) return;
    try {
      await api.delete(`/moderators/${id}`);
      loadModerators();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const toggleBlock = async (id, current) => {
    try {
      await api.put(`/moderators/${id}`, { is_blocked: !current });
      loadModerators();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Moderators ({moderators.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Moderator'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input type="text" placeholder="Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
            <input type="text" placeholder="Phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
            <input type="password" placeholder="Password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
          </div>
          <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            Create Moderator
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Referral Code</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Users</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {moderators.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{m.id}</td>
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3">{m.phone}</td>
                <td className="px-4 py-3 font-mono text-xs">{m.referral_code}</td>
                <td className="px-4 py-3 text-center">{m.user_count}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {m.is_blocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center space-x-2">
                  <button onClick={() => toggleBlock(m.id, m.is_blocked)}
                    className={`px-2 py-1 rounded text-xs ${m.is_blocked ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {m.is_blocked ? 'Unblock' : 'Block'}
                  </button>
                  <button onClick={() => handleDelete(m.id)}
                    className="px-2 py-1 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {moderators.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{loading ? 'Loading...' : 'No moderators'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
