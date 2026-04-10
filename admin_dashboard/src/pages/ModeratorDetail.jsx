import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api';
import { useToast, ToastContainer } from '../components/ui';

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
    return <div className="text-center py-10 text-gray-500">Loading moderator details...</div>;
  }

  if (!moderator) {
    return <div className="text-center py-10 text-red-600">Moderator not found.</div>;
  }

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border p-5">
          <p className="text-sm text-gray-500">Assigned Users</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{moderator.user_count}</p>
        </div>
        <div className="bg-white border p-5">
          <p className="text-sm text-gray-500">Pending Deposits</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{moderator.pending_deposits}</p>
        </div>
        <div className="bg-white border p-5">
          <p className="text-sm text-gray-500">Completed Deposits</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{moderator.approved_deposit_count}</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(moderator.approved_deposit_amount)}</p>
        </div>
        <div className="bg-white border p-5">
          <p className="text-sm text-gray-500">Total Deposits</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{moderator.total_related_deposits}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-800">Scanner</h4>
            <button
              onClick={() => setScannerEditing((v) => !v)}
              className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700"
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
                  className="w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="scanner_enabled_admin"
                  checked={scannerForm.scanner_enabled}
                  onChange={(e) => setScannerForm((p) => ({ ...p, scanner_enabled: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="scanner_enabled_admin" className="text-sm text-gray-700 cursor-pointer">
                  Enable scanner (show moderator UPI to users)
                </label>
              </div>
              <button
                type="submit"
                disabled={scannerSaving}
                className="px-4 py-2 bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {scannerSaving ? 'Saving�' : 'Save Scanner Settings'}
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
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

        <div className="bg-white border p-5 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-800">Moderator Info</h4>
            <span className={`px-2 py-1 text-xs font-medium ${moderator.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {moderator.is_blocked ? 'Blocked' : 'Active'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
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
                    className="px-2 py-1 text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                    {refCodeSaving ? '...' : 'Save'}
                  </button>
                  <button onClick={() => setRefCodeEditing(false)}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-600 hover:bg-gray-300">
                    Cancel
                  </button>
                </span>
              ) : (
                <span>
                  <span className="font-mono">{moderator.referral_code}</span>
                  <button onClick={() => { setRefCodeValue(moderator.referral_code || ''); setRefCodeEditing(true); }}
                    className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200">
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

      <div className="bg-white border overflow-x-auto">
        <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-800">Deposit Transactions</h4>
          <span className="text-sm text-gray-500">{deposits.length} records</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">UTR</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Payer</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {deposits.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-600">{new Date(transaction.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td className="px-4 py-3 text-xs text-gray-700">
                  <Link to={`/users/${transaction.user_id}`} className="text-blue-600 hover:underline">{transaction.user_name}</Link>
                  <div className="text-gray-500">{transaction.user_phone}</div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(transaction.amount)}</td>
                <td className="px-4 py-3 font-mono text-xs">{transaction.utr_number}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{transaction.payer_name || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                    {transaction.status}
                  </span>
                </td>
              </tr>
            ))}
            {deposits.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No deposit transactions</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border overflow-x-auto">
          <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-800">Assigned Users</h4>
            <span className="text-sm text-gray-500">{assignedUsers.length} users</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Deposits</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assignedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <div className="font-medium text-gray-800">{user.name}</div>
                    <div className="text-gray-500">{user.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700">{formatCurrency(user.balance)}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700">{user.deposit_count}</td>
                  <td className="px-4 py-3 text-center">
                    <Link to={`/users/${user.id}`} className="px-3 py-1 bg-blue-600 text-white text-xs hover:bg-blue-700 inline-block">View</Link>
                  </td>
                </tr>
              ))}
              {assignedUsers.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No assigned users</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border overflow-x-auto">
          <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-800">Referred Users</h4>
            <span className="text-sm text-gray-500">{referredUsers.length} referrals</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Bonus</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Referred On</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {referredUsers.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <Link to={`/users/${r.referred_user_id}`} className="text-blue-600 hover:underline font-medium">{r.user_name}</Link>
                    <div className="text-gray-500">{r.user_phone}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-green-700">{formatCurrency(r.bonus_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium ${r.status === 'credited' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.status === 'credited' ? 'Credited' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                </tr>
              ))}
              {referredUsers.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No referred users</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border overflow-x-auto">
        <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-800">Scanner Change History</h4>
          <span className="text-sm text-gray-500">{scannerAuditHistory.length} entries</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Changed By</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Field</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">From</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">To</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {scannerAuditHistory.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-600">{new Date(entry.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td className="px-4 py-3 text-xs text-gray-700">
                  <div>{entry.actor_name || 'System'}</div>
                  <div className="text-gray-500">{entry.actor_role || '-'}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">{formatScannerAuditField(entry.field_name)}</td>
                <td className="px-4 py-3 text-xs text-gray-600 break-all">{formatScannerAuditValue(entry.field_name, entry.old_value)}</td>
                <td className="px-4 py-3 text-xs text-gray-700 break-all">{formatScannerAuditValue(entry.field_name, entry.new_value)}</td>
              </tr>
            ))}
            {scannerAuditHistory.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No scanner changes recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-800">Recent Notifications</h4>
          <span className="text-sm text-gray-500">{notifications.length} items</span>
        </div>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className=" border border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-700">{notification.message}</div>
                <span className={`px-2 py-1 text-xs font-medium ${notification.is_read ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                  {notification.is_read ? 'Read' : 'Unread'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{new Date(notification.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
            </div>
          ))}
          {notifications.length === 0 && <div className="text-sm text-gray-400">No notifications</div>}
        </div>
      </div>
      <div className="bg-white border p-5 space-y-4">
        <h4 className="text-lg font-semibold text-gray-800">Change Password</h4>
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
            <div className="relative">
              <input
                type={pwShowNew ? 'text' : 'password'}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2 pr-10 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 pr-10 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-5 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {pwSaving ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
