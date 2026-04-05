import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast, ToastContainer } from '../components/ui';

const STATUS_COLORS = {
  received: 'bg-blue-100 text-blue-800',
  matched: 'bg-green-100 text-green-800',
  unmatched: 'bg-yellow-100 text-yellow-800',
  duplicate: 'bg-red-100 text-red-800',
  parse_error: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

function Badge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, color = 'text-dark-900' }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-dark-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

export default function AutoDeposits() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [webhookTxns, setWebhookTxns] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [webhookFilter, setWebhookFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('pending');
  const [webhookPage, setWebhookPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [webhookPagination, setWebhookPagination] = useState({});
  const [orderPagination, setOrderPagination] = useState({});
  const [logPagination, setLogPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const { toasts, success, error: toastError, dismiss } = useToast();

  // UTR Search state
  const [utrSearchQuery, setUtrSearchQuery] = useState('');
  const [utrSearchResults, setUtrSearchResults] = useState(null);
  const [utrSearchLoading, setUtrSearchLoading] = useState(false);

  // Unmatched transactions state
  const [unmatchedTxns, setUnmatchedTxns] = useState([]);
  const [unmatchedPage, setUnmatchedPage] = useState(1);
  const [unmatchedPagination, setUnmatchedPagination] = useState({});

  // Credit-by-UTR modal state
  const [creditModal, setCreditModal] = useState(null); // { txn }
  const [creditUserId, setCreditUserId] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/auto-deposit/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const loadWebhookTxns = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: webhookPage, limit: 20 };
      if (webhookFilter) params.status = webhookFilter;
      const res = await api.get('/auto-deposit/admin/webhook-transactions', { params });
      setWebhookTxns(res.data.transactions || []);
      setWebhookPagination(res.data.pagination || {});
    } catch (err) {
      console.error('Failed to load webhook transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [webhookPage, webhookFilter]);

  const loadPendingOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/auto-deposit/admin/pending-orders', {
        params: { status: orderFilter, page: orderPage, limit: 20 },
      });
      setPendingOrders(res.data.orders || []);
      setOrderPagination(res.data.pagination || {});
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, [orderPage, orderFilter]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/auto-deposit/admin/logs', { params: { page: logPage, limit: 30 } });
      setLogs(res.data.logs || []);
      setLogPagination(res.data.pagination || {});
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }, [logPage]);

  const handleUtrSearch = useCallback(async () => {
    if (!utrSearchQuery.trim() || utrSearchQuery.trim().length < 6) {
      toastError('Enter at least 6 characters to search.');
      return;
    }
    setUtrSearchLoading(true);
    try {
      const res = await api.get(`/auto-deposit/admin/search-utr/${encodeURIComponent(utrSearchQuery.trim())}`);
      setUtrSearchResults(res.data);
    } catch (err) {
      toastError(err.response?.data?.error || 'Search failed.');
    } finally {
      setUtrSearchLoading(false);
    }
  }, [utrSearchQuery, toastError]);

  const loadUnmatchedTxns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/auto-deposit/admin/unmatched-transactions', { params: { page: unmatchedPage, limit: 20 } });
      setUnmatchedTxns(res.data.transactions || []);
      setUnmatchedPagination({ total: res.data.total, totalPages: Math.ceil(res.data.total / res.data.limit) });
    } catch (err) {
      console.error('Failed to load unmatched transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [unmatchedPage]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'webhook') loadWebhookTxns(); }, [tab, loadWebhookTxns]);
  useEffect(() => { if (tab === 'orders') loadPendingOrders(); }, [tab, loadPendingOrders]);
  useEffect(() => { if (tab === 'logs') loadLogs(); }, [tab, loadLogs]);
  useEffect(() => { if (tab === 'unmatched') loadUnmatchedTxns(); }, [tab, loadUnmatchedTxns]);

  // Auto-refresh stats every 10s
  useEffect(() => {
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const [actionModal, setActionModal] = useState(null); // { type: 'cancel'|'credit', order }
  const [utrInput, setUtrInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleAdminCancel = async () => {
    setActionLoading(true);
    try {
      await api.post(`/auto-deposit/admin/orders/${actionModal.order.id}/cancel`);
      success('Order cancelled successfully.');
      setActionModal(null);
      loadPendingOrders();
      loadStats();
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to cancel order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminCredit = async () => {
    if (!utrInput.trim()) { toastError('UTR / reference number is required.'); return; }
    setActionLoading(true);
    try {
      const res = await api.post(`/auto-deposit/admin/orders/${actionModal.order.id}/credit`, { utr_number: utrInput.trim() });
      success(res.data.message || 'Deposit credited successfully.');
      setActionModal(null);
      setUtrInput('');
      loadPendingOrders();
      loadStats();
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to credit deposit.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExpireOrders = async () => {
    try {
      const res = await api.post('/auto-deposit/admin/expire-orders');
      success(`Expired ${res.data.expired_count} orders.`);
      loadStats();
      if (tab === 'orders') loadPendingOrders();
    } catch (err) {
      toastError('Failed to expire orders.');
    }
  };

  const handleCreditByUtr = async () => {
    if (!creditUserId.trim()) { toastError('User ID is required.'); return; }
    setCreditLoading(true);
    try {
      const res = await api.post('/auto-deposit/admin/credit-by-utr', {
        webhook_transaction_id: creditModal.txn.id,
        user_id: Number(creditUserId.trim()),
      });
      success(res.data.message || 'Credited successfully.');
      setCreditModal(null);
      setCreditUserId('');
      loadUnmatchedTxns();
      loadStats();
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to credit.');
    } finally {
      setCreditLoading(false);
    }
  };

  const tabs = [
    { key: 'stats', label: 'Overview' },
    { key: 'webhook', label: 'UPI Messages' },
    { key: 'orders', label: 'Deposit Orders' },
    { key: 'unmatched', label: 'Unmatched' },
    { key: 'utr-search', label: 'UTR Search' },
    { key: 'logs', label: 'Audit Logs' },
  ];

  const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-';

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark-900">Auto Deposits</h1>
        <button onClick={handleExpireOrders} className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700">
          Expire Stale Orders
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-dark-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-dark-500 hover:text-dark-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {tab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Active Orders" value={stats.active_orders} color="text-blue-600" />
            <StatCard label="Matched Today" value={stats.matched_today} color="text-green-600" />
            <StatCard label="Expired Today" value={stats.expired_today} color="text-gray-500" />
            <StatCard label="Matched Amount Today" value={`₹${Number(stats.matched_amount_today).toLocaleString('en-IN')}`} color="text-green-700" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Webhook Messages Today" value={stats.webhook_messages_today} />
            <StatCard label="Webhook Matched" value={stats.webhook_matched_today} color="text-green-600" />
            <StatCard label="Webhook Unmatched" value={stats.webhook_unmatched_today} color="text-yellow-600" />
            <StatCard label="Webhook Duplicates" value={stats.webhook_duplicate_today} color="text-red-600" />
          </div>
        </div>
      )}

      {/* Webhook Transactions Tab */}
      {tab === 'webhook' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {['', 'received', 'matched', 'unmatched', 'duplicate', 'parse_error'].map((s) => (
              <button
                key={s}
                onClick={() => { setWebhookFilter(s); setWebhookPage(1); }}
                className={`px-3 py-1 text-xs rounded ${webhookFilter === s ? 'bg-primary-600 text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200'}`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-50 text-dark-600">
                <tr>
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Reference</th>
                  <th className="px-4 py-2 text-left">Payer</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Matched User</th>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {webhookTxns.map((txn) => (
                  <>
                  <tr key={txn.id} className="hover:bg-dark-50">
                    <td className="px-4 py-2">{txn.id}</td>
                    <td className="px-4 py-2 font-medium">₹{txn.amount ? Number(txn.amount).toLocaleString('en-IN') : '-'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{txn.reference_number || '-'}</td>
                    <td className="px-4 py-2">{txn.payer_name || '-'}</td>
                    <td className="px-4 py-2"><Badge status={txn.status} /></td>
                    <td className="px-4 py-2">{txn.matched_user_name ? `${txn.matched_user_name} (${txn.matched_user_phone})` : '-'}</td>
                    <td className="px-4 py-2 text-xs">{fmt(txn.created_at)}</td>
                    <td className="px-4 py-2 text-xs text-red-600 max-w-xs">
                      {txn.error_message || ''}
                      {txn.raw_message && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-blue-600 hover:underline">View raw SMS</summary>
                          <pre className="mt-1 text-xs bg-gray-100 p-2 rounded whitespace-pre-wrap break-all max-w-xs text-gray-800">{txn.raw_message}</pre>
                        </details>
                      )}
                    </td>
                  </tr>
                  </>
                ))}
                {webhookTxns.length === 0 && (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-dark-400">No webhook transactions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination pagination={webhookPagination} page={webhookPage} setPage={setWebhookPage} />
        </div>
      )}

      {/* Deposit Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {['pending', 'matched', 'expired', 'cancelled'].map((s) => (
              <button
                key={s}
                onClick={() => { setOrderFilter(s); setOrderPage(1); }}
                className={`px-3 py-1 text-xs rounded ${orderFilter === s ? 'bg-primary-600 text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200'}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-50 text-dark-600">
                <tr>
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Deposit ID</th>
                  <th className="px-4 py-2 text-left">Created</th>
                  <th className="px-4 py-2 text-left">Expires</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {pendingOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-dark-50">
                    <td className="px-4 py-2">{order.id}</td>
                    <td className="px-4 py-2">{order.user_name} ({order.user_phone})</td>
                    <td className="px-4 py-2 font-medium">₹{Number(order.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2"><Badge status={order.status} /></td>
                    <td className="px-4 py-2">{order.matched_deposit_id || '-'}</td>
                    <td className="px-4 py-2 text-xs">{fmt(order.created_at)}</td>
                    <td className="px-4 py-2 text-xs">{fmt(order.expires_at)}</td>
                    <td className="px-4 py-2">
                      {order.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setActionModal({ type: 'credit', order }); setUtrInput(''); }}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Credit
                          </button>
                          <button
                            onClick={() => setActionModal({ type: 'cancel', order })}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {pendingOrders.length === 0 && (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-dark-400">No orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination pagination={orderPagination} page={orderPage} setPage={setOrderPage} />
        </div>
      )}

      {/* Audit Logs Tab */}
      {tab === 'logs' && (
        <div className="space-y-3">
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-50 text-dark-600">
                <tr>
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Webhook #</th>
                  <th className="px-4 py-2 text-left">Order #</th>
                  <th className="px-4 py-2 text-left">Deposit #</th>
                  <th className="px-4 py-2 text-left">Details</th>
                  <th className="px-4 py-2 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-dark-50">
                    <td className="px-4 py-2">{log.id}</td>
                    <td className="px-4 py-2"><Badge status={log.action} /></td>
                    <td className="px-4 py-2">{log.user_name ? `${log.user_name} (${log.user_phone})` : log.user_id || '-'}</td>
                    <td className="px-4 py-2">{log.webhook_txn_id || '-'}</td>
                    <td className="px-4 py-2">{log.order_id || '-'}</td>
                    <td className="px-4 py-2">{log.deposit_id || '-'}</td>
                    <td className="px-4 py-2 text-xs max-w-xs truncate">{log.details || '-'}</td>
                    <td className="px-4 py-2 text-xs">{fmt(log.created_at)}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-dark-400">No logs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination pagination={logPagination} page={logPage} setPage={setLogPage} />
        </div>
      )}

      {/* Unmatched Transactions Tab */}
      {tab === 'unmatched' && (
        <div className="space-y-3">
          <p className="text-sm text-dark-500">UPI payments received via Telegram that haven't been matched to any deposit order. You can manually credit these to a user.</p>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-50 text-dark-600">
                <tr>
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">UTR / Reference</th>
                  <th className="px-4 py-2 text-left">Payer</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Order Ref</th>
                  <th className="px-4 py-2 text-left">Received</th>
                  <th className="px-4 py-2 text-left">Raw Message</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {unmatchedTxns.map((txn) => (
                  <tr key={txn.id} className="hover:bg-dark-50">
                    <td className="px-4 py-2">{txn.id}</td>
                    <td className="px-4 py-2 font-medium">₹{txn.amount ? Number(txn.amount).toLocaleString('en-IN') : '-'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{txn.reference_number || '-'}</td>
                    <td className="px-4 py-2">{txn.payer_name || '-'}</td>
                    <td className="px-4 py-2"><Badge status={txn.status} /></td>
                    <td className="px-4 py-2 font-mono text-xs">{txn.order_ref || '-'}</td>
                    <td className="px-4 py-2 text-xs">{fmt(txn.created_at)}</td>
                    <td className="px-4 py-2 text-xs max-w-[200px]">
                      {txn.raw_message && (
                        <details>
                          <summary className="cursor-pointer text-blue-600 hover:underline">View</summary>
                          <pre className="mt-1 text-xs bg-gray-100 p-2 rounded whitespace-pre-wrap break-all text-gray-800">{txn.raw_message}</pre>
                        </details>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => { setCreditModal({ txn }); setCreditUserId(''); }}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Credit User
                      </button>
                    </td>
                  </tr>
                ))}
                {unmatchedTxns.length === 0 && (
                  <tr><td colSpan="9" className="px-4 py-8 text-center text-dark-400">No unmatched transactions.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination pagination={unmatchedPagination} page={unmatchedPage} setPage={setUnmatchedPage} />
        </div>
      )}

      {/* UTR Search Tab */}
      {tab === 'utr-search' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={utrSearchQuery}
              onChange={(e) => setUtrSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUtrSearch()}
              placeholder="Enter UTR / reference number (min 6 chars)"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleUtrSearch}
              disabled={utrSearchLoading || utrSearchQuery.trim().length < 6}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
            >
              {utrSearchLoading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {utrSearchResults && (
            <div className="space-y-4">
              {/* Webhook transactions matching this UTR */}
              <div>
                <h3 className="text-sm font-semibold text-dark-700 mb-2">Webhook Transactions ({utrSearchResults.webhook_transactions?.length || 0})</h3>
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-dark-50 text-dark-600">
                      <tr>
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">Amount</th>
                        <th className="px-4 py-2 text-left">Reference</th>
                        <th className="px-4 py-2 text-left">Payer</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Order Ref</th>
                        <th className="px-4 py-2 text-left">Time</th>
                        <th className="px-4 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-100">
                      {(utrSearchResults.webhook_transactions || []).map((txn) => (
                        <tr key={txn.id} className="hover:bg-dark-50">
                          <td className="px-4 py-2">{txn.id}</td>
                          <td className="px-4 py-2 font-medium">₹{txn.amount ? Number(txn.amount).toLocaleString('en-IN') : '-'}</td>
                          <td className="px-4 py-2 font-mono text-xs">{txn.reference_number || '-'}</td>
                          <td className="px-4 py-2">{txn.payer_name || '-'}</td>
                          <td className="px-4 py-2"><Badge status={txn.status} /></td>
                          <td className="px-4 py-2 font-mono text-xs">{txn.order_ref || '-'}</td>
                          <td className="px-4 py-2 text-xs">{fmt(txn.created_at)}</td>
                          <td className="px-4 py-2">
                            {txn.status !== 'matched' && (
                              <button
                                onClick={() => { setCreditModal({ txn }); setCreditUserId(''); }}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Credit User
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(utrSearchResults.webhook_transactions || []).length === 0 && (
                        <tr><td colSpan="8" className="px-4 py-6 text-center text-dark-400">No webhook transactions found for this UTR.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deposits matching this UTR */}
              <div>
                <h3 className="text-sm font-semibold text-dark-700 mb-2">Deposits ({utrSearchResults.deposits?.length || 0})</h3>
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-dark-50 text-dark-600">
                      <tr>
                        <th className="px-4 py-2 text-left">Deposit ID</th>
                        <th className="px-4 py-2 text-left">User</th>
                        <th className="px-4 py-2 text-left">Amount</th>
                        <th className="px-4 py-2 text-left">UTR</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-100">
                      {(utrSearchResults.deposits || []).map((d) => (
                        <tr key={d.id} className="hover:bg-dark-50">
                          <td className="px-4 py-2">{d.id}</td>
                          <td className="px-4 py-2">{d.username || d.phone || `#${d.user_id}`}</td>
                          <td className="px-4 py-2 font-medium">₹{Number(d.amount).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 font-mono text-xs">{d.utr_number}</td>
                          <td className="px-4 py-2"><Badge status={d.status} /></td>
                          <td className="px-4 py-2 text-xs">{fmt(d.created_at)}</td>
                        </tr>
                      ))}
                      {(utrSearchResults.deposits || []).length === 0 && (
                        <tr><td colSpan="6" className="px-4 py-6 text-center text-dark-400">No deposits found for this UTR.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel / Credit confirmation modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            {actionModal.type === 'cancel' ? (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Cancel Order #{actionModal.order.id}?</h2>
                <p className="text-sm text-gray-600 mb-4">
                  This will cancel the pending ₹{Number(actionModal.order.amount).toLocaleString('en-IN')} deposit order for <strong>{actionModal.order.user_name}</strong>. The user will need to create a new order.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setActionModal(null)} className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Back</button>
                  <button onClick={handleAdminCancel} disabled={actionLoading} className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
                    {actionLoading ? 'Cancelling…' : 'Yes, Cancel'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Manual Credit — Order #{actionModal.order.id}</h2>
                <p className="text-sm text-gray-600 mb-3">
                  Manually credit ₹{Number(actionModal.order.amount).toLocaleString('en-IN')} to <strong>{actionModal.order.user_name}</strong> ({actionModal.order.user_phone}).
                </p>
                <label className="block text-sm font-semibold text-gray-700 mb-1">UTR / Reference Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  placeholder="e.g. 412345678901"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <div className="flex gap-3">
                  <button onClick={() => setActionModal(null)} className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Back</button>
                  <button onClick={handleAdminCredit} disabled={actionLoading || !utrInput.trim()} className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">
                    {actionLoading ? 'Crediting…' : 'Credit Wallet'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Credit by UTR modal (for unmatched transactions) */}
      {creditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Credit Unmatched Payment</h2>
            <div className="text-sm text-gray-600 mb-3 space-y-1">
              <p>Amount: <strong>₹{Number(creditModal.txn.amount).toLocaleString('en-IN')}</strong></p>
              <p>UTR: <span className="font-mono">{creditModal.txn.reference_number || '-'}</span></p>
              <p>Payer: {creditModal.txn.payer_name || '-'}</p>
            </div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">User ID <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={creditUserId}
              onChange={(e) => setCreditUserId(e.target.value)}
              placeholder="Enter user ID to credit"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setCreditModal(null)} className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreditByUtr} disabled={creditLoading || !creditUserId.trim()} className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">
                {creditLoading ? 'Crediting…' : 'Credit Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Pagination({ pagination, page, setPage }) {
  if (!pagination || !pagination.totalPages || pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm text-dark-500">
      <span>Page {page} of {pagination.totalPages} ({pagination.total} total)</span>
      <div className="flex gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 py-1 bg-dark-100 rounded disabled:opacity-40 hover:bg-dark-200"
        >
          Prev
        </button>
        <button
          onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
          disabled={page >= pagination.totalPages}
          className="px-3 py-1 bg-dark-100 rounded disabled:opacity-40 hover:bg-dark-200"
        >
          Next
        </button>
      </div>
    </div>
  );
}
