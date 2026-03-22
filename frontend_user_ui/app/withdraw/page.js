
'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import DepositWithdrawBtns from '../components/DepositWithdrawBtns'
import { userAPI, withdrawAPI } from '../lib/api'
import { formatStatusLabel } from '../lib/formatters'

const WithDrawPage = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [withdrawAmounts, setWithdrawAmounts] = useState({});
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [withdrawGuidelines, setWithdrawGuidelines] = useState([]);

  const fetchData = async () => {
    try {
      const [banksRes, histRes] = await Promise.all([
        userAPI.getBankAccounts(),
        withdrawAPI.history({}),
      ]);
      setBankAccounts(banksRes.bankAccounts || banksRes.bank_accounts || []);
      setHistory(histRes.withdrawals || []);
    } catch {}
  };

  useEffect(() => {
    fetchData();
    userAPI.getUiConfig().then((res) => setWithdrawGuidelines(res.withdraw_guidelines || [])).catch(() => setWithdrawGuidelines([]));
  }, []);

  const handleWithdraw = async (bankId) => {
    const amt = withdrawAmounts[bankId];
    if (!amt || parseInt(amt) <= 0) { setError('Enter valid amount'); return; }
    setError(''); setSuccess(''); setLoading(true);
    try {
      await withdrawAPI.request({ bank_account_id: bankId, amount: parseInt(amt) });
      setSuccess('Withdrawal request submitted!');
      setWithdrawAmounts(prev => ({...prev, [bankId]: ''}));
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to submit withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bankId) => {
    if (!confirm('Delete this bank account?')) return;
    try {
      await userAPI.deleteBankAccount(bankId);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  return (
    <div>
      <header className="sticky top-0 z-40 mx-auto flex w-full max-w-[430px] items-center bg-white px-4 py-3 shadow-sm">
        <a href="/home" className="mr-3 inline-flex"><img alt="back" src="/images/back-btn.png" className="h-5 w-5" /></a>
        <h3 className="flex-1 text-center text-sm font-semibold text-[#111]">Withdraw</h3>
      </header>

        <div className='bg-white pb-6'>
            <DepositWithdrawBtns></DepositWithdrawBtns>
             <div className='mx-auto w-full max-w-[430px] '>

            {error && <div className="mb-2 bg-[#ffe0e0] px-2 py-2 text-xs text-[#c00]">{error}</div>}
            {success && <div className="mb-2 bg-[#e0ffe0] px-2 py-2 text-xs text-[#060]">{success}</div>}

            <section className="border border-[#d6b774] bg-white p-4 shadow-[0_12px_28px_rgba(79,52,10,0.08)]">
              <div>
                <a className="inline-flex w-full items-center justify-center gap-2 bg-[#111] px-4 py-3 text-sm font-semibold text-white" href="/bind-bank-card">
                    <img alt="Add Bank" className="icon" src="/images/addicon.png" /> Add bank account
                    </a>
                </div>
                {bankAccounts.length === 0 && <p className="pt-2.5 text-center text-sm text-[#666]">No bank accounts added yet.</p>}
            </section>

            <div className='mt-4 border border-[#d6b774] bg-white shadow-[0_12px_28px_rgba(79,52,10,0.08)]'>
            <div>
                <div className="px-3 py-3 text-left text-[10px] font-medium text-red-600">
                    {(withdrawGuidelines.length > 0 ? withdrawGuidelines : ['Withdrawal instructions are currently unavailable.']).map((rule, index) => (
                      <p key={`${rule}-${index}`}>{index + 1}. {rule}</p>
                    ))}
                </div>
            </div>
            </div>

            {bankAccounts.map(acc => (
            <div className="relative mt-4 border border-[#d6b774] bg-white p-4 shadow-[0_12px_28px_rgba(79,52,10,0.08)]" key={acc.id}>
              <div className='absolute right-4 top-4 cursor-pointer text-[#b91c1c]' onClick={() => handleDelete(acc.id)}><i className='fa fa-trash'></i></div>
                <h3 className='text-base font-semibold text-[#111]'>{acc.account_holder_name || acc.payee_name || 'Account'}</h3>
                <div className='mt-2 space-y-1 text-xs text-[#6d6659]'>
                    <p>{acc.bank_name}</p>
                    <p>Account no. {acc.account_number}</p>
                    <p>IFSC Code: {acc.ifsc_code}</p>
                </div>
              <div className='mt-4'>
                    <form onSubmit={e => { e.preventDefault(); handleWithdraw(acc.id); }}>
                <div><input className="h-11 w-full border border-[#d8d1c4] bg-[#faf7f0] px-4 text-sm" type='number' placeholder='Enter amount' min="1" value={withdrawAmounts[acc.id] || ''} onChange={e => setWithdrawAmounts(prev => ({...prev, [acc.id]: e.target.value}))} /></div>
                <button className="mt-4 h-11 w-full bg-[#111] text-sm font-semibold text-white" type="submit" disabled={loading}>{loading ? 'Processing...' : 'Withdraw'}</button>
                    </form>
                </div>
            </div>
            ))}

            <div className="mt-4 overflow-x-auto border border-[#ead8ab]">
              <div>
              <table className="w-full border-collapse text-left text-xs text-[#111]">
                    <thead>
                        <tr>
                    <th className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2">Amount</th>
                    <th className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2">Status</th>
                    <th className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2">Account</th>
                    <th className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2">Date</th>
                    <th className="border-b bg-[#f7f0e3] px-3 py-2">Reason</th>
                        </tr>
                        </thead>
                        <tbody>
                            {history.map((w, i) => (
                            <tr key={w.id || i}>
                      <td className="border-b border-r border-[#f0e3c6] px-3 py-2">₹{w.amount}</td>
                      <td className="border-b border-r border-[#f0e3c6] px-3 py-2">{formatStatusLabel(w.status)}</td>
                      <td className="border-b border-r border-[#f0e3c6] px-3 py-2">{w.account_number || '-'}</td>
                      <td className="border-b border-r border-[#f0e3c6] px-3 py-2">{w.created_at ? new Date(w.created_at).toLocaleDateString() : '-'}</td>
                      <td className="border-b px-3 py-2">{w.reject_reason || '-'}</td>
                            </tr>
                            ))}
                    {history.length === 0 && <tr><td className="px-3 py-6 text-center" colSpan="5">No withdrawals yet</td></tr>}
                        </tbody>
                </table>
                </div>
            </div>

            </div>

        </div>

    </div>
  )
}

export default WithDrawPage
