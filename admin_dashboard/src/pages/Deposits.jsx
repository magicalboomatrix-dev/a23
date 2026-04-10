import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function Deposits() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [deposits, setDeposits] = useState([]);
  const [moderators, setModerators] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    moderator_id: '',
    from_date: '',
    to_date: '',
  });

  useEffect(() => {
    if (!isAdmin) return;

    api.get('/moderators')
      .then((res) => setModerators(Array.isArray(res.data.moderators) ? res.data.moderators : []))
      .catch(console.error);
  }, [isAdmin]);

  useEffect(() => { loadDeposits(); }, [page, filters.search, filters.status, filters.moderator_id, filters.from_date, filters.to_date]);

  const loadDeposits = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.status) params.status = filters.status;
      if (isAdmin && filters.moderator_id) params.moderator_id = filters.moderator_id;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;

      const res = await api.get('/deposits/all', { params });
      setDeposits(Array.isArray(res.data.deposits) ? res.data.deposits : []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      setError('Failed to load deposits.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({
      search: '',
      status: '',
      moderator_id: '',
      from_date: '',
      to_date: '',
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Deposits</h3>
            <p className="text-sm text-gray-500 mt-1">
              Search deposit credits by user, UTR, payer, date range, and moderator assignment.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Total: {pagination.total || 0}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search user, phone, UTR, payer, order..."
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            className="w-full px-3 py-2 border text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <select
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
            className="w-full px-3 py-2 border bg-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          {isAdmin ? (
            <select
              value={filters.moderator_id}
              onChange={(event) => updateFilter('moderator_id', event.target.value)}
              className="w-full px-3 py-2 border bg-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">All Moderators</option>
              {moderators.map((moderator) => (
                <option key={moderator.id} value={String(moderator.id)}>{moderator.name}</option>
              ))}
            </select>
          ) : null}
          <input
            type="date"
            value={filters.from_date}
            onChange={(event) => updateFilter('from_date', event.target.value)}
            className="w-full px-3 py-2 border text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <div className="flex gap-3">
            <input
              type="date"
              value={filters.to_date}
              onChange={(event) => updateFilter('to_date', event.target.value)}
              className="w-full px-3 py-2 border text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 border text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Deposit</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Order</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Webhook</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">UTR</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Payer</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {deposits.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">#{d.id}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{d.order_id ? `#${d.order_id}` : '-'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{d.webhook_txn_id ? `#${d.webhook_txn_id}` : '-'}</td>
                <td className="px-4 py-3 font-medium">{d.user_name}</td>
                <td className="px-4 py-3">{d.user_phone}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-700">
                  {formatCurrency(d.amount)}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{d.utr_number || '-'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{d.payer_name || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(d.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </td>
              </tr>
            ))}
            {deposits.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  {loading ? 'Loading...' : 'No deposits'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-white border text-sm disabled:opacity-50">Prev</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-white border text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}

