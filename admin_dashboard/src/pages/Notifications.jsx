import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useToast, ToastContainer, useConfirm, ConfirmModal } from '../components/ui';

function getNotificationTone(notification) {
  if (notification.type === 'system') {
    return notification.is_read
      ? 'bg-gray-50 border-gray-200'
      : 'bg-amber-50 border-amber-200';
  }

  if (notification.type === 'deposit') {
    return notification.is_read
      ? 'bg-gray-50 border-gray-200'
      : 'bg-green-50 border-green-200';
  }

  if (notification.type === 'withdraw') {
    return notification.is_read
      ? 'bg-gray-50 border-gray-200'
      : 'bg-red-50 border-red-200';
  }

  return notification.is_read
    ? 'bg-gray-50 border-gray-200'
    : 'bg-blue-50 border-blue-200';
}

const TEMPLATES = [
  {
    label: '🎯 फरीदाबाद गेम अलर्ट',
    title: 'फरीदाबाद',
    message: 'फरीदाबाद का गेम 5:50 तक चालू है सभी भाई फरीदाबाद का गेम लगा लीजिये! बेफिकर होके गेम लगाओ हाथों हाथ...',
    url: '/',
    type: 'timing',
  },
  {
    label: '🎁 धमाका ऑफर',
    title: 'धमाका ऑफर',
    message: 'प्रिय ग्राहकों, अब आपको पैसे जोड़ने (Add money) पर विशेष बोनस मिल रहा है 500 के 550, 1000 के 1150! तुरंत लाभ उठाएं।',
    url: '/wallet',
    type: 'offer',
  },
  {
    label: '🚨 गेम क्लोजिंग अलर्ट',
    title: 'गेम क्लोजिंग अलर्ट',
    message: 'गाजियाबाद का गेम जल्द ही 8:00 बजे बंद होने वाला है। सभी भाई अपनी गेम तुरंत लगा लें!',
    url: '/',
    type: 'timing',
  },
  {
    label: '🏆 रिजल्ट व विजेता सूचना',
    title: 'विजेता घोषणा',
    message: 'आज के सभी विजेता भाइयों को बहुत-बहुत बधाई! जीते हुए पैसे तुरंत वॉलेट में क्रेडिट कर दिए गए हैं।',
    url: '/results',
    type: 'result',
  },
];

export default function Notifications() {
  const [activeTab, setActiveTab] = useState('push'); // 'push' or 'system'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Push broadcast state
  const [subscriberStats, setSubscriberStats] = useState({ total_subscribers: 0, logs: [] });
  const [statsLoading, setStatsLoading] = useState(false);
  const [sendingPush, setSendingPush] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    url: '/',
    type: 'broadcast',
  });

  const { toasts, success: toastSuccess, error: toastError, dismiss } = useToast();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    loadNotifications();
    loadPushStats();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/my');
      setNotifications(Array.isArray(res.data.notifications) ? res.data.notifications : []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPushStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get('/notifications/push/stats');
      setSubscriberStats(res.data || { total_subscribers: 0, logs: [] });
    } catch (err) {
      console.error('Failed to load push stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, is_read: 1 } : item))
      );
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to mark notification as read');
    }
  };

  const applyTemplate = (tpl) => {
    setBroadcastForm({
      title: tpl.title,
      message: tpl.message,
      url: tpl.url,
      type: tpl.type,
    });
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      toastError('Notification Title and Message are required.');
      return;
    }

    const confirmed = await confirm({
      title: 'Send Notification to All Users?',
      message: `Are you sure you want to send this push notification to all ${subscriberStats.total_subscribers || 0} subscribed devices / app users?`,
      confirmText: 'Yes, Send Now',
      variant: 'primary',
    });

    if (!confirmed) return;

    setSendingPush(true);
    try {
      const res = await api.post('/notifications/push/broadcast', {
        title: broadcastForm.title.trim(),
        message: broadcastForm.message.trim(),
        url: broadcastForm.url.trim() || '/',
        type: broadcastForm.type,
      });

      const sentCount = res.data?.stats?.success ?? 0;
      const totalCount = res.data?.stats?.total ?? 0;
      toastSuccess(`Push notification sent successfully to ${sentCount}/${totalCount} devices!`);

      // Reset form & reload stats
      setBroadcastForm({
        title: '',
        message: '',
        url: '/',
        type: 'broadcast',
      });
      await loadPushStats();
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to send broadcast push notification.');
    } finally {
      setSendingPush(false);
    }
  };

  const visibleNotifications = notifications.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.is_read;
    return notification.type === filter;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications & Broadcasts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Send instant push notifications to all users who downloaded the app, and view system alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadPushStats();
              loadNotifications();
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-4">
        <button
          onClick={() => setActiveTab('push')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'push'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>📢</span>
          <span>App Push Broadcast (उपयोगकर्ताओं को नोटिफिकेशन भेजें)</span>
          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full font-bold">
            {subscriberStats.total_subscribers || 0} Devices
          </span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'system'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>📋</span>
          <span>Staff & System Alerts (सिस्टम लॉग्स)</span>
        </button>
      </div>

      {/* Tab 1: App Push Broadcast */}
      {activeTab === 'push' && (
        <div className="space-y-6">
          {/* Status Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total Subscribed Devices
                  </div>
                  <div className="text-3xl font-black text-gray-900 mt-2">
                    {subscriberStats.total_subscribers || 0}
                  </div>
                </div>
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center text-2xl">
                  📱
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Users who downloaded the app or enabled web push notifications.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Auto Result Push
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 mt-2 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                    ACTIVE
                  </div>
                </div>
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center text-2xl">
                  🔔
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Whenever you declare/post any game result, notifications are sent automatically!
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Broadcasts Dispatched
                  </div>
                  <div className="text-3xl font-black text-gray-900 mt-2">
                    {subscriberStats.logs?.length || 0}
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center text-2xl">
                  🚀
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Manual offers and announcements sent by administrators.
              </p>
            </div>
          </div>

          {/* Broadcast Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>✍️</span> Send Push Message / Offer to All App Users
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Broadcast custom messages, game timings, or deposit bonus offers directly to users phones.
            </p>

            {/* Quick Template Chips */}
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-500 mb-2">
                Quick Templates (एक क्लिक में भरें):
              </div>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="px-3 py-1.5 bg-gray-50 hover:bg-amber-50 hover:border-amber-300 border border-gray-200 text-xs font-medium text-gray-700 rounded-lg transition"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Notification Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. फरीदाबाद or धमाका ऑफर or Faridabad Result 29"
                    value={broadcastForm.title}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Type
                  </label>
                  <select
                    value={broadcastForm.type}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="broadcast">📢 General Announcement</option>
                    <option value="offer">🎁 Deposit Bonus / Offer</option>
                    <option value="timing">⏰ Game Timing Alert</option>
                    <option value="result">🏆 Result Update</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Message / Offer Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. फरीदाबाद का गेम 5:50 तक चालू है सभी भाई फरीदाबाद का गेम लगा लीजिये! बेफिकर होके गेम लगाओ हाथों हाथ..."
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Target Link / Destination
                </label>
                <input
                  type="text"
                  placeholder="e.g. / or /results or /wallet"
                  value={broadcastForm.url}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, url: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={sendingPush || !broadcastForm.title || !broadcastForm.message}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-sm rounded-lg shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {sendingPush ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <span>📢</span>
                      <span>Send Push Notification to All Users</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Broadcast History Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Recent Broadcast Dispatches
              </h3>
              <span className="text-xs text-gray-500">
                Last {subscriberStats.logs?.length || 0} messages
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Title & Message</th>
                    <th className="px-6 py-3">Delivery Status</th>
                    <th className="px-6 py-3">Dispatched By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {subscriberStats.logs && subscriberStats.logs.length > 0 ? (
                    subscriberStats.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-100 text-gray-700">
                            {log.notification_type || 'broadcast'}
                          </span>
                        </td>
                        <td className="px-6 py-3 max-w-md">
                          <div className="font-bold text-gray-900">{log.title}</div>
                          <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{log.message}</div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-xs">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold bg-green-50 text-green-700">
                            ✓ {log.success_count || 0} Delivered
                          </span>
                          {log.failure_count > 0 && (
                            <span className="ml-1 text-gray-400">
                              ({log.failure_count} failed)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600">
                          {log.admin_name || 'System / Admin'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        {statsLoading ? 'Loading history...' : 'No push broadcasts sent yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: System Activity Alerts */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'unread', 'system', 'deposit', 'withdraw', 'win'].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-4 py-2 text-sm font-medium capitalize rounded-lg ${
                  filter === item
                    ? 'bg-amber-600 text-white'
                    : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visibleNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`border rounded-xl p-5 ${getNotificationTone(notification)}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-xs font-semibold bg-white/80 border border-gray-200 uppercase tracking-wide text-gray-600 rounded">
                        {notification.type}
                      </span>
                      {!notification.is_read && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded">
                          Unread
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-6">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notification.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}
                    </p>
                  </div>

                  {!notification.is_read && (
                    <button
                      onClick={() => markRead(notification.id)}
                      className="px-3 py-1.5 bg-white border text-xs font-medium text-gray-700 hover:bg-gray-50 rounded"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}

            {visibleNotifications.length === 0 && (
              <div className="bg-white border rounded-xl p-10 text-center text-gray-400">
                {loading ? 'Loading notifications...' : 'No notifications match this filter.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal & Toast Container */}
      <ConfirmModal
        state={confirmState}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
