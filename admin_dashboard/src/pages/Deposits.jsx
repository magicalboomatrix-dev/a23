import { useState, useEffect } from 'react';
import api, { buildUploadUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function getReviewLabel(deposit) {
  if (!deposit?.approved_by_role || !deposit?.approved_by_name) {
    return '-';
  }

  const roleLabel = deposit.approved_by_role.charAt(0).toUpperCase() + deposit.approved_by_role.slice(1);
  const prefix = deposit.status === 'rejected' ? 'Rejected by' : 'Approved by';
  return `${prefix}: ${roleLabel} ${deposit.approved_by_name}`;
}

export default function Deposits() {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [previewDeposit, setPreviewDeposit] = useState(null);

  useEffect(() => { loadDeposits(); }, [page, filter]);

  const loadDeposits = async () => {
    setLoading(true);
    try {
      const res = await api.get('/deposits/all', { params: { status: filter, page, limit: 15 } });
      setDeposits(Array.isArray(res.data.deposits) ? res.data.deposits : []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    if (!confirm('Approve this deposit?')) return;
    try {
      await api.put(`/deposits/${id}/approve`);
      loadDeposits();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const reject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await api.put(`/deposits/${id}/reject`, { reason });
      loadDeposits();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const closePreview = () => {
    setPreviewDeposit(null);
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === s ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">UTR</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Screenshot</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Moderator</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Approved/Rejected By</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reviewed At</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reject Reason</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {deposits.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{d.id}</td>
                <td className="px-4 py-3 font-medium">{d.user_name}</td>
                <td className="px-4 py-3">{d.user_phone}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-700">₹{parseFloat(d.amount).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs">{d.utr_number}</td>
                <td className="px-4 py-3 text-center">
                  {(d.receipt_image || d.screenshot) ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDeposit(d)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      View
                    </button>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    d.status === 'approved' ? 'bg-green-100 text-green-700'
                      : d.status === 'rejected' ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>{d.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{d.moderator_name || '-'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{getReviewLabel(d)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{d.approved_at ? new Date(d.approved_at).toLocaleString() : '-'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{d.reject_reason || '-'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(d.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-center space-x-2">
                  {(d.status === 'pending' || (user?.role === 'admin' && d.status === 'rejected')) && (
                    <button onClick={() => approve(d.id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">Approve</button>
                  )}
                  {d.status === 'pending' && (
                    <button onClick={() => reject(d.id)} className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">Reject</button>
                  )}
                  {d.status !== 'pending' && !(user?.role === 'admin' && d.status === 'rejected') && '-'}
                </td>
              </tr>
            ))}
            {deposits.length === 0 && (
              <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400">{loading ? 'Loading...' : 'No deposits'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-white border rounded-lg text-sm disabled:opacity-50">Prev</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-white border rounded-lg text-sm disabled:opacity-50">Next</button>
        </div>
      )}

      {(previewDeposit?.receipt_image || previewDeposit?.screenshot) && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Deposit Screenshot</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {previewDeposit.user_name} • UTR {previewDeposit.utr_number}
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="px-3 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="bg-gray-100 p-4 flex items-center justify-center max-h-[calc(90vh-88px)] overflow-auto">
              <img
                src={buildUploadUrl(previewDeposit.receipt_image || previewDeposit.screenshot)}
                alt={`Deposit screenshot for ${previewDeposit.user_name}`}
                className="max-w-full h-auto rounded-lg shadow"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
