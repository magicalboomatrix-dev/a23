import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api';
import { useToast, ToastContainer } from '../components/ui';
import PaginatedTable from '../components/PaginatedTable';

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatScannerAuditField(fieldName) {
  const labels = {
    scanner_label: 'Scanner Label',
    upi_id: 'UPI ID',
    scanner_enabled: 'Scanner Status',
  };

  return labels[fieldName] || fieldName || '-';
}

function formatScannerAuditValue(fieldName, value) {
  if (!value) {
    return '-';
  }

  return value;
}

function parseUpiDetails(upiId) {
  const value = String(upiId || '').trim();

  if (!value) {
    return {
      full: '',
      username: '',
      handle: '',
      isValid: false,
    };
  }

  const [username = '', handle = ''] = value.split('@');

  return {
    full: value,
    username,
    handle,
    isValid: Boolean(username && handle),
  };
}

export default function ModeratorDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toasts, success, error: toastError, dismiss } = useToast();
  const [scannerForm, setScannerForm] = useState({ upi_id: '', scanner_label: '', scanner_enabled: false });
  const [scannerEditing, setScannerEditing] = useState(false);
  const [scannerSaving, setScannerSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwShowNew, setPwShowNew] = useState(false);
  const [pwShowConfirm, setPwShowConfirm] = useState(false);
  const [refCodeEditing, setRefCodeEditing] = useState(false);
  const [refCodeValue, setRefCodeValue] = useState('');
  const [refCodeSaving, setRefCodeSaving] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/moderators/${id}/detail`);
      setData(res.data || null);
      if (res.data?.moderator) {
        const m = res.data.moderator;
        setScannerForm({
          upi_id: m.upi_id || '',
          scanner_label: m.scanner_label || '',
          scanner_enabled: !!m.scanner_enabled,
        });
      }
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleScannerSave = async (e) => {
    e.preventDefault();
    setScannerSaving(true);
    try {
      await api.put(`/moderators/${id}/scanner`, {
        upi_id: scannerForm.upi_id.trim(),
        scanner_label: scannerForm.scanner_label.trim(),
        scanner_enabled: scannerForm.scanner_enabled,
      });
      success('Scanner / UPI updated successfully.');
      setScannerEditing(false);
      loadDetail();
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to update scanner.');
    } finally {
      setScannerSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 6) {
      toastError('Password must be at least 6 characters.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toastError('Passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      await api.put(`/moderators/${id}`, { password: pwForm.newPassword });
      success('Password changed successfully.');
      setPwForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleSaveReferralCode = async () => {
    const code = refCodeValue.trim();
    if (!/^M\d{5}$/.test(code)) {
      toastError('Referral code must be M followed by 5 digits (e.g. M55555).');
      return;
    }
    setRefCodeSaving(true);
    try {
      await api.put(`/moderators/${id}`, { referral_code: code });
      success('Referral code updated.');
      setRefCodeEditing(false);
      loadDetail();
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to update referral code.');
    } finally {
      setRefCodeSaving(false);
    }
  };

  const moderator = data?.moderator;
  const deposits = data?.deposit_transactions || [];
  const assignedUsers = data?.assigned_users || [];
  const notifications = data?.notifications || [];
  const scannerAuditHistory = data?.scanner_audit_history || [];
  const referredUsers = data?.referred_users || [];
  const upiDetails = parseUpiDetails(moderator?.upi_id);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <div className="text-gray-500 text-sm">Loading moderator details...</div>
        </div>
      </div>
    );
  }

  if (!moderator) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center text-red-600">Moderator not found.</div>
      </div>
    );
  }

  // Table column definitions
  const depositColumns = [
    { header: 'Date', accessor: 'created_at', className: 'text-left', cellClass: 'text-xs text-gray-600 whitespace-nowrap', render: (row) => new Date(row.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
    { header: 'User', accessor: 'user_name', className: 'text-left', cellClass: 'text-xs text-gray-700', render: (row) => (
      <div>
        <Link to={`/users/${row.user_id}`} className="text-blue-600 hover:underline font-medium">{row.user_name}</Link>
        <div className="text-gray-500">{row.user_phone}</div>
      </div>
    )},
    { header: 'Amount', accessor: 'amount', className: 'text-right', cellClass: 'font-semibold text-green-700', render: (row) => formatCurrency(row.amount) },
    { header: 'UTR', accessor: 'utr_number', className: 'text-left', cellClass: 'font-mono text-xs', render: (row) => row.utr_number || '-' },
    { header: 'Payer', accessor: 'payer_name', className: 'text-left', cellClass: 'text-xs text-gray-600', render: (row) => row.payer_name || '-' },
    { header: 'Status', accessor: 'status', className: 'text-center', cellClass: 'text-center', render: (row) => (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">{row.status}</span>
    )},
  ];

  const assignedUserColumns = [
    { header: 'User', accessor: 'name', className: 'text-left', cellClass: 'text-xs text-gray-700', render: (row) => (
      <div>
        <div className="font-medium text-gray-800">{row.name}</div>
        <div className="text-gray-500">{row.phone}</div>
      </div>
    )},
    { header: 'Balance', accessor: 'balance', className: 'text-right', cellClass: 'text-xs text-gray-700', render: (row) => formatCurrency(row.balance) },
    { header: 'Deposits', accessor: 'deposit_count', className: 'text-right', cellClass: 'text-xs text-gray-700', render: (row) => row.deposit_count },
    { header: 'Details', accessor: 'actions', className: 'text-center', cellClass: 'text-center', render: (row) => (
      <Link to={`/users/${row.id}`} className="px-3 py-1 bg-blue-600 text-white text-xs hover:bg-blue-700 inline-block rounded">View</Link>
    )},
  ];

  const referredUserColumns = [
    { header: 'User', accessor: 'user_name', className: 'text-left', cellClass: 'text-xs text-gray-700', render: (row) => (
      <div>
        <Link to={`/users/${row.referred_user_id}`} className="text-blue-600 hover:underline font-medium">{row.user_name}</Link>
        <div className="text-gray-500">{row.user_phone}</div>
      </div>
    )},
    { header: 'Bonus', accessor: 'bonus_amount', className: 'text-right', cellClass: 'text-xs font-semibold text-green-700', render: (row) => formatCurrency(row.bonus_amount) },
    { header: 'Status', accessor: 'status', className: 'text-center', cellClass: 'text-center', render: (row) => (
      <span className={`px-2 py-1 text-xs font-medium rounded ${row.status === 'credited' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
        {row.status === 'credited' ? 'Credited' : 'Pending'}
      </span>
    )},
    { header: 'Date', accessor: 'created_at', className: 'text-left', cellClass: 'text-xs text-gray-600', render: (row) => new Date(row.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
  ];

  const scannerAuditColumns = [
    { header: 'Date', accessor: 'created_at', className: 'text-left', cellClass: 'text-xs text-gray-600 whitespace-nowrap', render: (row) => new Date(row.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
    { header: 'Changed By', accessor: 'actor_name', className: 'text-left', cellClass: 'text-xs text-gray-700', render: (row) => (
      <div>
        <div>{row.actor_name || 'System'}</div>
        <div className="text-gray-500">{row.actor_role || '-'}</div>
      </div>
    )},
    { header: 'Field', accessor: 'field_name', className: 'text-left', cellClass: 'text-xs text-gray-700', render: (row) => formatScannerAuditField(row.field_name) },
    { header: 'From', accessor: 'old_value', className: 'text-left', cellClass: 'text-xs text-gray-600 break-all', render: (row) => formatScannerAuditValue(row.field_name, row.old_value) },
    { header: 'To', accessor: 'new_value', className: 'text-left', cellClass: 'text-xs text-gray-700 break-all', render: (row) => formatScannerAuditValue(row.field_name, row.new_value) },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'deposits', label: 'Deposits', count: deposits.length },
    { id: 'users', label: 'Assigned Users', count: assignedUsers.length },
    { id: 'referrals', label: 'Referrals', count: referredUsers.length },
    { id: 'audit', label: 'Scanner History', count: scannerAuditHistory.length },
  ];

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">{moderator.name}</h3>
          <p className="text-sm text-gray-500 mt-1">Moderator detail, deposit audit, and assigned users</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/jantri?moderator_id=${id}`} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">View Jantri</Link>
          <Link to="/moderators" className="px-4 py-2 bg-white border hover:bg-gray-50 text-sm font-medium text-gray-700">Back</Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border p-3 sm:p-5 rounded">
          <p className="text-xs sm:text-sm text-gray-500">Assigned Users</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-700 mt-1">{moderator.user_count}</p>
        </div>
        <div className="bg-white border p-3 sm:p-5 rounded">
          <p className="text-xs sm:text-sm text-gray-500">Pending Deposits</p>
          <p className="text-lg sm:text-2xl font-bold text-orange-600 mt-1">{moderator.pending_deposits}</p>
        </div>
        <div className="bg-white border p-3 sm:p-5 rounded">
          <p className="text-xs sm:text-sm text-gray-500">Completed Deposits</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-1">{moderator.approved_deposit_count}</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(moderator.approved_deposit_amount)}</p>
        </div>
        <div className="bg-white border p-3 sm:p-5 rounded">
          <p className="text-xs sm:text-sm text-gray-500">Total Deposits</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-1">{moderator.total_related_deposits}</p>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="lg:hidden">
        <div className="flex overflow-x-auto gap-1 pb-2 -mx-2 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${activeTab !== 'overview' ? 'hidden lg:grid' : ''}`}>
        {/* Scanner Section */}
        <div className="bg-white border p-3 sm:p-5 space-y-4 rounded">
          <div className="flex items-center justify-between">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800">Scanner</h4>
            <button
              onClick={() => setScannerEditing((v) => !v)}
              className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              {scannerEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {scannerEditing ? (
            <form onSubmit={handleScannerSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">UPI ID</label>
                <input
                  type="text"
                  placeholder="e.g. merchant@upi"
                  value={scannerForm.upi_id}
                  onChange={(e) => setScannerForm((p) => ({ ...p, upi_id: e.target.value }))}
                  className="w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                />
                {scannerForm.upi_id && !scannerForm.upi_id.includes('@') && (
                  <p className="text-xs text-red-500 mt-1">UPI ID must include @handle.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Scanner Label</label>
                <input
                  type="text"
                  placeholder="Display name for users"
                  value={scannerForm.scanner_label}
                  onChange={(e) => setScannerForm((p) => ({ ...p, scanner_label: e.target.value }))}
                  className="w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="scanner_enabled_admin"
                  checked={scannerForm.scanner_enabled}
                  onChange={(e) => setScannerForm((p) => ({ ...p, scanner_enabled: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="scanner_enabled_admin" className="text-sm text-gray-700 cursor-pointer">
                  Enable scanner (show moderator UPI to users)
                </label>
              </div>
              <button
                type="submit"
                disabled={scannerSaving}
                className="px-4 py-2 bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50 rounded"
              >
                {scannerSaving ? 'Saving…' : 'Save Scanner Settings'}
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-gray-600">
              <div><span className="font-medium text-gray-800">Phone:</span> {moderator.phone}</div>
              <div><span className="font-medium text-gray-800">Referral:</span> <span className="font-mono">{moderator.referral_code}</span></div>
              <div><span className="font-medium text-gray-800">Label:</span> {moderator.scanner_label || '-'}</div>
              <div>
                <span className="font-medium text-gray-800">Status:</span>{' '}
                <span className={moderator.scanner_enabled ? 'text-green-600 font-semibold' : 'text-red-500'}>
                  {moderator.scanner_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="sm:col-span-2 break-all"><span className="font-medium text-gray-800">UPI ID:</span> {upiDetails.full || <span className="text-red-500 italic">not set</span>}</div>
              <div><span className="font-medium text-gray-800">UPI User:</span> {upiDetails.username || '-'}</div>
              <div><span className="font-medium text-gray-800">UPI Handle:</span> {upiDetails.handle || '-'}</div>
              <div><span className="font-medium text-gray-800">UPI Format:</span> {upiDetails.full ? (upiDetails.isValid ? 'Valid' : 'Check format') : '-'}</div>
              <div><span className="font-medium text-gray-800">Created:</span> {new Date(moderator.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
            </div>
          )}
        </div>

        {/* Moderator Info Section */}
        <div className="bg-white border p-3 sm:p-5 space-y-3 lg:col-span-2 rounded">
          <div className="flex items-center justify-between">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800">Moderator Info</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${moderator.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {moderator.is_blocked ? 'Blocked' : 'Active'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-gray-600">
            <div><span className="font-medium text-gray-800">Name:</span> {moderator.name}</div>
            <div><span className="font-medium text-gray-800">Phone:</span> {moderator.phone}</div>
            <div><span className="font-medium text-gray-800">Referral Code:</span>{' '}
              {refCodeEditing ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={refCodeValue}
                    onChange={(e) => setRefCodeValue(e.target.value.toUpperCase())}
                    placeholder="M55555"
                    maxLength={6}
                    className="w-24 px-2 py-1 border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <button onClick={handleSaveReferralCode} disabled={refCodeSaving}
                    className="px-2 py-1 text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 rounded">
                    {refCodeSaving ? '...' : 'Save'}
                  </button>
                  <button onClick={() => setRefCodeEditing(false)}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-600 hover:bg-gray-300 rounded">
                    Cancel
                  </button>
                </span>
              ) : (
                <span>
                  <span className="font-mono">{moderator.referral_code}</span>
                  <button onClick={() => { setRefCodeValue(moderator.referral_code || ''); setRefCodeEditing(true); }}
                    className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded">
                    Edit
                  </button>
                </span>
              )}
            </div>
            <div><span className="font-medium text-gray-800">Assigned Users:</span> {moderator.user_count}</div>
            <div><span className="font-medium text-gray-800">Completed Deposits:</span> {moderator.approved_deposit_count} ({formatCurrency(moderator.approved_deposit_amount)})</div>
            <div><span className="font-medium text-gray-800">Total Deposits:</span> {moderator.total_related_deposits}</div>
            <div><span className="font-medium text-gray-800">Created:</span> {new Date(moderator.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
          </div>
        </div>
      </div>

      {/* Deposit Transactions Section */}
      <div className={`bg-white border rounded overflow-hidden ${activeTab !== 'overview' && activeTab !== 'deposits' ? 'hidden lg:block' : ''}`}>
        <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="text-base sm:text-lg font-semibold text-gray-800">Deposit Transactions</h4>
          <span className="text-xs sm:text-sm text-gray-500">{deposits.length} records</span>
        </div>
        <PaginatedTable 
          data={deposits} 
          columns={depositColumns} 
          emptyMessage="No deposit transactions"
          rowsPerPage={10}
          maxHeight="400px"
        />
      </div>

      {/* Assigned Users & Referred Users Grid */}
      <div className={`grid grid-cols-1 xl:grid-cols-2 gap-4 ${activeTab !== 'overview' && activeTab !== 'users' && activeTab !== 'referrals' ? 'hidden lg:grid' : ''}`}>
        {/* Assigned Users Section */}
        <div className={`bg-white border rounded overflow-hidden ${activeTab !== 'overview' && activeTab !== 'users' ? 'hidden xl:block' : ''}`}>
          <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800">Assigned Users</h4>
            <span className="text-xs sm:text-sm text-gray-500">{assignedUsers.length} users</span>
          </div>
          <PaginatedTable 
            data={assignedUsers} 
            columns={assignedUserColumns} 
            emptyMessage="No assigned users"
            rowsPerPage={10}
            maxHeight="400px"
          />
        </div>

        {/* Referred Users Section */}
        <div className={`bg-white border rounded overflow-hidden ${activeTab !== 'overview' && activeTab !== 'referrals' ? 'hidden xl:block' : ''}`}>
          <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800">Referred Users</h4>
            <span className="text-xs sm:text-sm text-gray-500">{referredUsers.length} referrals</span>
          </div>
          <PaginatedTable 
            data={referredUsers} 
            columns={referredUserColumns} 
            emptyMessage="No referred users"
            rowsPerPage={10}
            maxHeight="400px"
          />
        </div>
      </div>

      {/* Scanner Change History Section */}
      <div className={`bg-white border rounded overflow-hidden ${activeTab !== 'overview' && activeTab !== 'audit' ? 'hidden lg:block' : ''}`}>
        <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="text-base sm:text-lg font-semibold text-gray-800">Scanner Change History</h4>
          <span className="text-xs sm:text-sm text-gray-500">{scannerAuditHistory.length} entries</span>
        </div>
        <PaginatedTable 
          data={scannerAuditHistory} 
          columns={scannerAuditColumns} 
          emptyMessage="No scanner changes recorded"
          rowsPerPage={10}
          maxHeight="400px"
        />
      </div>

      {/* Notifications Section */}
      {activeTab === 'overview' && (
        <div className="bg-white border p-3 sm:p-5 rounded">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800">Recent Notifications</h4>
            <span className="text-xs sm:text-sm text-gray-500">{notifications.length} items</span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {notifications.slice(0, 10).map((notification) => (
              <div key={notification.id} className="border border-gray-200 px-3 sm:px-4 py-3 rounded">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-gray-700 flex-1">{notification.message}</div>
                  <span className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded ${notification.is_read ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                    {notification.is_read ? 'Read' : 'Unread'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{new Date(notification.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
              </div>
            ))}
            {notifications.length === 0 && <div className="text-xs sm:text-sm text-gray-400">No notifications</div>}
          </div>
        </div>
      )}

      {/* Change Password Section */}
      {activeTab === 'overview' && (
        <div className="bg-white border p-3 sm:p-5 rounded space-y-4">
          <h4 className="text-base sm:text-lg font-semibold text-gray-800">Change Password</h4>
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={pwShowNew ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 pr-10 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPwShowNew((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {pwShowNew ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={pwShowConfirm ? 'text' : 'password'}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Repeat password"
                  className="w-full px-3 py-2 pr-10 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPwShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {pwShowConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={pwSaving}
                className="px-5 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 rounded"
              >
                {pwSaving ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
