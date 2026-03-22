import { useState, useEffect } from 'react';
import api from '../utils/api';

const SETTING_LABELS = {
  max_bet_60min: 'Max Bet More Than 60 Min',
  max_bet_30min: 'Max Bet 30-60 Min',
  max_bet_15min: 'Max Bet 15-30 Min',
  max_bet_last_15min: 'Max Bet Last 15 Min',
  min_bet: 'Minimum Bet Amount',
};

export default function Settings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flaggedAccounts, setFlaggedAccounts] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [settingsRes, flaggedRes] = await Promise.all([
        api.get('/admin/settings'),
        api.get('/admin/flagged-accounts'),
      ]);
      setSettings(Array.isArray(settingsRes.data.settings) ? settingsRes.data.settings : []);
      setFlaggedAccounts(Array.isArray(flaggedRes.data.accounts) ? flaggedRes.data.accounts : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateValue = (key, value) => {
    setSettings(prev => prev.map(s => s.setting_key === key ? { ...s, setting_value: value } : s));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        settings: settings.map(s => ({ key: s.setting_key, value: s.setting_value }))
      });
      alert('Settings saved!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Loading...</div>;

  // Group settings by category
  const payoutSettings = settings.filter(s => s.setting_key.startsWith('payout_'));
  const betSettings = settings.filter(s => s.setting_key.startsWith('max_bet_') || s.setting_key === 'min_bet');
  const depositSettings = settings.filter(s => s.setting_key.startsWith('min_deposit') || s.setting_key.startsWith('min_withdraw') || s.setting_key === 'max_withdraw_time_minutes');
  const bonusSettings = settings.filter(s => s.setting_key.includes('bonus') || s.setting_key.includes('referral'));

  const renderGroup = (title, items) => (
    <div className="bg-white rounded-xl border p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((s) => (
          <div key={s.setting_key} className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">{SETTING_LABELS[s.setting_key] || s.setting_key.replace(/_/g, ' ').toUpperCase()}</p>
              {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
            </div>
            <input
              type="text"
              value={s.setting_value}
              onChange={(e) => updateValue(s.setting_key, e.target.value)}
              className="w-full sm:w-40 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderGroup('Payout Ratios', payoutSettings)}
      {renderGroup('Betting Limits', betSettings)}
      {renderGroup('Deposit & Withdrawal', depositSettings)}
      {renderGroup('Bonus & Referral', bonusSettings)}

      <div className="flex justify-end">
        <button onClick={saveSettings} disabled={saving}
          className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50">
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {/* Flagged Accounts */}
      {flaggedAccounts.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="p-5 border-b bg-red-50">
            <h3 className="text-lg font-semibold text-red-700">⚠ Flagged Bank Accounts</h3>
            <p className="text-sm text-red-600">These accounts are used by multiple users</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Account</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Bank</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {flaggedAccounts.map((a) => (
                  <tr key={a.id} className="hover:bg-red-50">
                    <td className="px-4 py-3 font-medium">{a.user_name}</td>
                    <td className="px-4 py-3">{a.user_phone}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.account_number}</td>
                    <td className="px-4 py-3">{a.bank_name}</td>
                    <td className="px-4 py-3 text-xs text-red-600">{a.flag_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
