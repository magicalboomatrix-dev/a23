'use client'

import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import { betAPI, gameAPI } from '../lib/api';
import { formatBetType, formatStatusLabel } from '../lib/formatters';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
];

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function getStatusClasses(status) {
  if (status === 'win') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  }
  if (status === 'loss') {
    return 'border-rose-200 bg-rose-100 text-rose-700';
  }
  return 'border-amber-200 bg-amber-100 text-amber-700';
}

export default function MyBetsPage() {
  const [games, setGames] = useState([]);
  const [bets, setBets] = useState([]);
  const [filters, setFilters] = useState({ game_id: '', status: '', search: '', from_date: '', to_date: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadGames = async () => {
      try {
        const response = await gameAPI.list();
        if (!cancelled) {
          setGames(response.games || []);
        }
      } catch {
        if (!cancelled) {
          setGames([]);
        }
      }
    };

    loadGames();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadBets = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await betAPI.myBets({
          page: pagination.page,
          limit: pagination.limit,
          ...(filters.game_id ? { game_id: filters.game_id } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.from_date ? { from_date: filters.from_date } : {}),
          ...(filters.to_date ? { to_date: filters.to_date } : {}),
        });

        if (cancelled) {
          return;
        }

        setBets(Array.isArray(response.bets) ? response.bets : []);
        setPagination((current) => ({
          ...current,
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 1,
        }));
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || 'Failed to load your bet history.');
          setBets([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBets();
    return () => {
      cancelled = true;
    };
  }, [filters, pagination.page, pagination.limit]);

  const summary = useMemo(() => {
    return bets.reduce((accumulator, bet) => {
      accumulator.totalStake += Number(bet.total_amount || 0);
      accumulator.totalWin += Number(bet.win_amount || 0);
      accumulator.totalBets += 1;
      if (bet.status === 'win') {
        accumulator.winCount += 1;
      }
      return accumulator;
    }, {
      totalStake: 0,
      totalWin: 0,
      totalBets: 0,
      winCount: 0,
    });
  }, [bets]);

  const handleFilterChange = (field, value) => {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters((current) => ({ ...current, [field]: value }));
  };


  // Preset filter handlers
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const last7 = new Date(today);
  last7.setDate(today.getDate() - 6);
  const last7Str = last7.toISOString().slice(0, 10);

  const handlePreset = (preset) => {
    if (preset === 'today') {
      setFilters((current) => ({ ...current, from_date: todayStr, to_date: todayStr, status: '' }));
      setPagination((current) => ({ ...current, page: 1 }));
    } else if (preset === 'last7') {
      setFilters((current) => ({ ...current, from_date: last7Str, to_date: todayStr, status: '' }));
      setPagination((current) => ({ ...current, page: 1 }));
    } else if (preset === 'win') {
      setFilters((current) => ({ ...current, status: 'win' }));
      setPagination((current) => ({ ...current, page: 1 }));
    } else if (preset === 'loss') {
      setFilters((current) => ({ ...current, status: 'loss' }));
      setPagination((current) => ({ ...current, page: 1 }));
    }
  };

  return (
    <div className="min-h-screen bg-[#f6efe2]">
      <Header />

      <div className="mx-auto w-full max-w-[430px]  pb-6">
        <section className="mb-5 overflow-hidden border border-[#1a1206] bg-[#050505] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)]  text-center text-[#111]">
            <h1 className="text-lg font-bold uppercase tracking-[0.14em]">My Bets</h1>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4d2f00]">All placed bets in one themed history view</p>
          </div>

          <div className="relative overflow-hidden  text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(235,218,141,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(255,0,0,0.12),transparent_34%)]" />
            <div className="relative grid grid-cols-2 gap-3">
              <div className="border border-white/10 bg-white/6  backdrop-blur-sm">
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-white/60">Bets On Page</div>
                <div className="mt-2 text-[28px] font-bold leading-none text-[#ebda8d]">{summary.totalBets}</div>
              </div>
              <div className="border border-white/10 bg-white/6  backdrop-blur-sm">
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-white/60">Stake</div>
                <div className="mt-2 text-[28px] font-bold leading-none text-[#ebda8d]">{formatCurrency(summary.totalStake)}</div>
              </div>
              <div className="border border-white/10 bg-white/6  backdrop-blur-sm">
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-white/60">Win Count</div>
                <div className="mt-2 text-[28px] font-bold leading-none text-[#7df48f]">{summary.winCount}</div>
              </div>
              <div className="border border-white/10 bg-white/6  backdrop-blur-sm">
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-white/60">Winning Amount</div>
                <div className="mt-2 text-[28px] font-bold leading-none text-[#7df48f]">{formatCurrency(summary.totalWin)}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Preset filter row */}
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <button type="button" onClick={() => handlePreset('today')} className="border border-[#b6842d] bg-[#fff7e0] px-4 py-2 text-xs font-bold text-[#b6842d] transition hover:bg-[#ebda8d]">Today</button>
          <button type="button" onClick={() => handlePreset('last7')} className="border border-[#b6842d] bg-[#fff7e0] px-4 py-2 text-xs font-bold text-[#b6842d] transition hover:bg-[#ebda8d]">Last 7 Days</button>
          <button type="button" onClick={() => handlePreset('win')} className="border border-[#7df48f] bg-[#eafff0] px-4 py-2 text-xs font-bold text-[#1a7f3c] transition hover:bg-[#b6f7c7]">Wins</button>
          <button type="button" onClick={() => handlePreset('loss')} className="border border-[#f87171] bg-[#fff0f0] px-4 py-2 text-xs font-bold text-[#b91c1c] transition hover:bg-[#fca5a5]">Losses</button>
        </div>

        <section className="mt-5 border border-[#d6b774] bg-white p-4 shadow-[0_12px_28px_rgba(79,52,10,0.08)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="mb-1 text-sm font-bold text-[#141414]">Filters</h2>
              <p className="text-xs text-[#6d6659]">Filter by game, status, keyword, and date range.</p>
            </div>
            <div className="bg-[#111] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ebda8d]">{pagination.total} Total</div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <select
              className="border border-[#d8d1c4] bg-[#faf7f0] px-4 py-3 text-sm font-medium text-[#111] outline-none transition focus:border-[#b6842d] focus:ring-2 focus:ring-[#ebda8d]"
              value={filters.game_id}
              onChange={(event) => handleFilterChange('game_id', event.target.value)}
            >
              <option value="">All Games</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>{game.name}</option>
              ))}
            </select>

            <select
              className="border border-[#d8d1c4] bg-[#faf7f0] px-4 py-3 text-sm font-medium text-[#111] outline-none transition focus:border-[#b6842d] focus:ring-2 focus:ring-[#ebda8d]"
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>{option.label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search game, type, or number"
              className="border border-[#d8d1c4] bg-[#faf7f0] px-4 py-3 text-sm font-medium text-[#111] outline-none transition focus:border-[#b6842d] focus:ring-2 focus:ring-[#ebda8d]"
              value={filters.search}
              onChange={(event) => handleFilterChange('search', event.target.value)}
            />

            <input
              type="date"
              className="border border-[#d8d1c4] bg-[#faf7f0] px-4 py-3 text-sm font-medium text-[#111] outline-none transition focus:border-[#b6842d] focus:ring-2 focus:ring-[#ebda8d]"
              value={filters.from_date}
              onChange={(event) => handleFilterChange('from_date', event.target.value)}
            />

            <input
              type="date"
              className="border border-[#d8d1c4] bg-[#faf7f0] px-4 py-3 text-sm font-medium text-[#111] outline-none transition focus:border-[#b6842d] focus:ring-2 focus:ring-[#ebda8d]"
              value={filters.to_date}
              onChange={(event) => handleFilterChange('to_date', event.target.value)}
            />
          </div>
        </section>

        <section className="mt-6 space-y-5">
          {loading && (
            <div className="border border-[#d6b774] bg-white px-5 py-8 text-center text-sm font-medium text-[#6d6659] shadow-[0_12px_28px_rgba(79,52,10,0.08)]">
              Loading your bets...
            </div>
          )}

          {!loading && error && (
            <div className="border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          {!loading && !error && bets.length === 0 && (
            <div className="border border-dashed border-[#d6b774] bg-white px-5 py-8 text-center shadow-[0_12px_28px_rgba(79,52,10,0.08)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center bg-[#111] text-2xl text-[#ebda8d]">
                <i className="fa-solid fa-receipt" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#111]">No bets found</h3>
              <p className="mt-2 text-sm text-[#6d6659]">Place a bet and it will appear here with numbers, status, and payout details.</p>
            </div>
          )}

          {!loading && !error && bets.map((bet) => (
            <article key={bet.id} className="overflow-hidden border border-[#d6b774] bg-white shadow-[0_12px_28px_rgba(79,52,10,0.08)]">
              <div className="flex items-center justify-between bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)] px-4 py-3.5 text-[#111]">
                <div>
                  <div className="text-sm font-bold uppercase">{bet.game_name}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f3b08]">{formatBetType(bet.type)}</div>
                </div>
                <span className={`border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${getStatusClasses(bet.status)}`}>
                  {formatStatusLabel(bet.status)}
                </span>
              </div>

              <div className="space-y-4 ">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-[#f7f0e3] ">
                    <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-[#7a6a4b]">Stake</div>
                    <div className="mt-1 text-base font-bold text-[#111]">{formatCurrency(bet.total_amount)}</div>
                  </div>
                  <div className="bg-[#f7f0e3] ">
                    <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-[#7a6a4b]">Win</div>
                    <div className="mt-1 text-base font-bold text-[#111]">{formatCurrency(bet.win_amount)}</div>
                  </div>
                  <div className="bg-[#f7f0e3] ">
                    <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-[#7a6a4b]">Placed</div>
                    <div className="mt-1 text-xs font-semibold text-[#111]">{new Date(bet.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="bg-[#f7f0e3] ">
                    <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-[#7a6a4b]">Time</div>
                    <div className="mt-1 text-xs font-semibold text-[#111]">{new Date(bet.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#141414]">Selected Numbers</h3>
                    <span className="text-[11px] text-[#7a6a4b]">Bet #{bet.id}</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {(bet.numbers || []).map((numberRow, index) => (
                      <div key={`${bet.id}-${numberRow.number}-${index}`} className="border border-[#111] bg-[#111] px-3 py-1.5 text-[11px] font-semibold text-[#ebda8d] shadow-sm">
                        {numberRow.number} • {formatCurrency(numberRow.amount)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        {!loading && !error && pagination.totalPages > 1 && (
          <section className="mt-6 flex items-center justify-between gap-4 border border-[#d6b774] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(79,52,10,0.08)]">
            <button
              type="button"
              className="border border-[#111] px-4 py-2 text-xs font-bold text-[#111] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
            >
              Previous
            </button>
            <div className="px-2 text-center">
              <div className="text-sm font-bold text-[#111]">Page {pagination.page}</div>
              <div className="text-[11px] text-[#7a6a4b]">of {pagination.totalPages}</div>
            </div>
            <button
              type="button"
              className="bg-[#111] px-4 py-2 text-xs font-bold text-[#ebda8d] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
            >
              Next
            </button>
          </section>
        )}
      </div>
    </div>
  );
}