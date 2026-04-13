import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
};

function formatTs(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Badge({ status }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function Support() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator';

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1 });
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/support/tickets', { params: { status: statusFilter || undefined, search: search || undefined, limit: 100 } });
      setTickets(res.data.tickets || []);
      setPagination(res.data.pagination || { total: 0 });
    } catch (err) {
      if (!silent) setError(err.response?.data?.error || err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, search]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/support/tickets/stats');
      setStats(res.data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadTickets();
    loadStats();
  }, [loadTickets, loadStats]);

  const openTicket = async (ticket) => {
    setActiveTicket(ticket);
    setMessages([]);
    setChatLoading(true);
    clearInterval(pollRef.current);
    try {
      const res = await api.get(`/support/tickets/${ticket.id}`);
      setActiveTicket(res.data.ticket);
      setMessages(res.data.messages || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setChatLoading(false);
    }
    // Poll for new messages every 8s
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/support/tickets/${ticket.id}`);
        setMessages(res.data.messages || []);
        setActiveTicket(res.data.ticket);
      } catch (_) {}
    }, 8000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTicket) return;
    setSending(true);
    setError('');
    try {
      await api.post(`/support/tickets/${activeTicket.id}/messages`, { message: newMessage.trim() });
      setNewMessage('');
      const res = await api.get(`/support/tickets/${activeTicket.id}`);
      setMessages(res.data.messages || []);
      setActiveTicket(res.data.ticket);
      loadTickets(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (ticketId, newStatus) => {
    setError('');
    setSuccessMsg('');
    try {
      await api.put(`/support/tickets/${ticketId}/status`, { status: newStatus });
      setSuccessMsg(`Ticket ${newStatus === 'closed' ? 'closed' : 'reopened'}.`);
      const res = await api.get(`/support/tickets/${ticketId}`);
      setActiveTicket(res.data.ticket);
      setMessages(res.data.messages || []);
      loadTickets(true);
      loadStats();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const roleBadge = (role) => {
    if (role === 'admin') return <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">ADMIN</span>;
    if (role === 'moderator') return <span className="ml-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-600">MOD</span>;
    return null;
  };

  return (
    <div className="flex h-full min-h-[80vh] gap-4 p-4 md:p-6">
      {/* LEFT PANEL: Ticket list */}
      <div className={`flex flex-col bg-white rounded-xl shadow border border-gray-100 ${activeTicket ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-shrink-0`}>
        {/* Stats bar */}
        {stats && (
          <div className="flex gap-2 flex-wrap px-4 pt-4 pb-2">
            <div className="flex-1 min-w-0 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center">
              <div className="text-lg font-black text-blue-700">{stats.open_count || 0}</div>
              <div className="text-[11px] text-blue-500 font-semibold">Open</div>
            </div>
            <div className="flex-1 min-w-0 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-center">
              <div className="text-lg font-black text-yellow-700">{stats.in_progress_count || 0}</div>
              <div className="text-[11px] text-yellow-500 font-semibold">In Progress</div>
            </div>
            <div className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center">
              <div className="text-lg font-black text-gray-700">{stats.closed_count || 0}</div>
              <div className="text-[11px] text-gray-400 font-semibold">Closed</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 px-4 pb-3 pt-1 border-b border-gray-100">
          <input
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-400"
            placeholder="Search user, phone, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadTickets()}
          />
          <select
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Support Tickets ({pagination.total || tickets.length})</span>
          <button onClick={() => loadTickets()} className="text-xs text-primary-500 hover:underline font-semibold">Refresh</button>
        </div>

        {/* Ticket rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <span className="text-3xl">🎫</span>
              <span className="text-sm">No tickets found</span>
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${activeTicket?.id === t.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">#{t.id}</span>
                      <Badge status={t.status} />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{t.subject}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      <span className="font-medium">{t.user_name || t.user_phone}</span>
                      {t.moderator_name && <span className="text-gray-400"> · {t.moderator_name}</span>}
                    </p>
                    {t.last_message && (
                      <p className="text-xs text-gray-400 truncate mt-0.5 italic">{t.last_message}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-[10px] text-gray-400 whitespace-nowrap">{formatTs(t.updated_at)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Chat */}
      <div className={`flex-1 flex flex-col bg-white rounded-xl shadow border border-gray-100 ${activeTicket ? 'flex' : 'hidden md:flex'}`}>
        {!activeTicket ? (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
            <span className="text-5xl">💬</span>
            <span className="text-base font-semibold">Select a ticket to view the conversation</span>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <button
                className="md:hidden text-gray-400 hover:text-gray-700 mr-1"
                onClick={() => { setActiveTicket(null); clearInterval(pollRef.current); }}
              >
                ← Back
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-gray-400">#{activeTicket.id}</span>
                  <Badge status={activeTicket.status} />
                </div>
                <h2 className="text-sm font-bold text-gray-800 truncate">{activeTicket.subject}</h2>
                <p className="text-xs text-gray-500">
                  {activeTicket.user_name || activeTicket.user_phone}
                  {activeTicket.user_phone && activeTicket.user_name && ` · ${activeTicket.user_phone}`}
                  {activeTicket.moderator_name && ` · Mod: ${activeTicket.moderator_name}`}
                </p>
              </div>
              <div className="flex gap-2">
                {activeTicket.status !== 'closed' && (
                  <button
                    onClick={() => changeStatus(activeTicket.id, 'closed')}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    Close Ticket
                  </button>
                )}
                {activeTicket.status === 'closed' && (
                  <button
                    onClick={() => changeStatus(activeTicket.id, 'open')}
                    className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-100 transition-colors"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
              {chatLoading ? (
                <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">No messages yet.</div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_role !== 'user';
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${isOwn ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[11px] font-bold ${isOwn ? 'text-white/80' : 'text-gray-500'}`}>{msg.sender_name}</span>
                          {roleBadge(msg.sender_role)}
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60 text-right' : 'text-gray-400 text-right'}`}>{formatTs(msg.created_at)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Alerts */}
            {error && <div className="mx-4 mb-1 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>}
            {successMsg && <div className="mx-4 mb-1 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-600">{successMsg}</div>}

            {/* Compose */}
            {activeTicket.status !== 'closed' ? (
              <form onSubmit={sendMessage} className="flex gap-2 px-4 py-3 border-t border-gray-100">
                <textarea
                  rows={2}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="Type your reply..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="self-end rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </form>
            ) : (
              <div className="px-4 py-3 border-t border-gray-100 text-center text-sm text-gray-400">
                Ticket is closed.{' '}
                <button onClick={() => changeStatus(activeTicket.id, 'open')} className="text-primary-500 underline font-semibold">Reopen to reply</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
