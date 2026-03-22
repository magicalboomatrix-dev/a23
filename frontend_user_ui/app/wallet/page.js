'use client'

import Link from 'next/link';
import Header from '../components/Header';
import { walletAPI } from '../lib/api';
import { useEffect, useState } from 'react';

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadWallet = async () => {
      try {
        const response = await walletAPI.getInfo();
        if (!cancelled) {
          setWallet(response.wallet || response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || 'Failed to load wallet.');
        }
      }
    };

    loadWallet();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f6efe2]">
      <Header />

      <div className="mx-auto w-full max-w-[430px]">
        <section className="mb-1 overflow-hidden border border-[#1a1206] bg-[#050505]">
          <div className="bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)]  text-center text-[#111]">
            <h1 className="text-lg font-bold uppercase tracking-[0.14em]">Wallet</h1>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4d2f00]">Deposit and withdraw from one quick hub</p>
          </div>
<div className="relative overflow-hidden text-white">
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(235,218,141,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(255,0,0,0.12),transparent_34%)]" />

  <div className="relative grid grid-cols-2 gap-3 text-center">

    {/* Main Balance */}
    <div className="flex flex-col items-center justify-center border border-white/10 bg-white/6 backdrop-blur-sm p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/60">
        Main Balance
      </div>

      <div className="mt-2 text-[28px] font-bold leading-none text-[#ebda8d]">
        {formatCurrency(wallet?.balance)}
      </div>
    </div>

    {/* Bonus Wallet */}
    <div className="flex flex-col items-center justify-center border border-white/10 bg-white/6 backdrop-blur-sm p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/60">
        Bonus Wallet
      </div>

      <div className="mt-2 text-[28px] font-bold leading-none text-[#7df48f]">
        {formatCurrency(wallet?.bonus_balance)}
      </div>
    </div>

  </div>
</div>
        </section>

        {error && (
          <div className="mt-5 border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <section className="flex justify-center gap-2 max-w-md mx-auto">

  {/* Deposit */}
  <Link
    href="/deposit"
    className="group w-1/2 overflow-hidden border border-[#d6b774] bg-white shadow-[0_12px_28px_rgba(79,52,10,0.08)]"
  >
    <div className="bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)] py-2 text-[#111] text-center">
      <div className="text-xs font-bold uppercase tracking-[0.12em]">
        Add Money
      </div>
    </div>

    <div className="flex flex-col items-center text-center space-y-2 p-3">

      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111]">
        <img
          src="/images/bank-building.png"
          alt="deposit"
          className="h-6 w-6 object-contain"
        />
      </div>

      <div>
        <h2 className="text-base font-bold text-[#111]">Deposit</h2>
        <p className="mt-1 text-xs text-[#6d6659]">
          Submit UTR and track approval.
        </p>
      </div>

      <div className="text-xs font-semibold text-[#a32020] group-hover:text-[#7a1010]">
        Go to deposit
      </div>

    </div>
  </Link>


  {/* Withdraw */}
  <Link
    href="/withdraw"
    className="group w-1/2 overflow-hidden border border-[#d6b774] bg-white shadow-[0_12px_28px_rgba(79,52,10,0.08)]"
  >
    <div className="bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)] py-2 text-[#111] text-center">
      <div className="text-xs font-bold uppercase tracking-[0.12em]">
        Cash Out
      </div>
    </div>

    <div className="flex flex-col items-center text-center space-y-2 p-3">

      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111]">
        <img
          src="/images/withdraw.png"
          alt="withdraw"
          className="h-6 w-6 object-contain"
        />
      </div>

      <div>
        <h2 className="text-base font-bold text-[#111]">Withdraw</h2>
        <p className="mt-1 text-xs text-[#6d6659]">
          Request payout to saved bank.
        </p>
      </div>

      <div className="text-xs font-semibold text-[#a32020] group-hover:text-[#7a1010]">
        Go to withdraw
      </div>

    </div>
  </Link>

</section>
      </div>
    </div>
  );
}