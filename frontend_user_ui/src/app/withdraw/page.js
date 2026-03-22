
'use client'
import React, { useState, useEffect } from 'react'
import Header from '../components/Header'
import Link from 'next/link'
import DepositWithdrawBtns from '../components/DepositWithdrawBtns'
import { userAPI, withdrawAPI } from '../lib/api'

const WithDrawPage = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [withdrawAmounts, setWithdrawAmounts] = useState({});
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [banksRes, histRes] = await Promise.all([
        userAPI.getBankAccounts(),
        withdrawAPI.history({})
      ]);
      setBankAccounts(banksRes.bankAccounts || banksRes.bank_accounts || []);
      setHistory(histRes.withdrawals || []);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

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
      <header className="backheader">
        <div className="brdc">
            <div className="back-btn">
            <a href="/home">
                <img alt="back" src="/images/back-btn.png" />
            </a>
            </div>
            <h3>Withdraw</h3>
        </div>
        </header>

        <div className='page-wrapper lr-padding' style={{paddingBottom:"100px"}}>
            <DepositWithdrawBtns></DepositWithdrawBtns>
             <div className='page-wrapper-inner'>

            {error && <div style={{background:'#ffe0e0',color:'#c00',padding:'8px',marginBottom:'8px',borderRadius:'4px',fontSize:'12px'}}>{error}</div>}
            {success && <div style={{background:'#e0ffe0',color:'#060',padding:'8px',marginBottom:'8px',borderRadius:'4px',fontSize:'12px'}}>{success}</div>}

            <section className="add-bank-btn">
                <div className="add-bank">
                    <a className="button-style" href="/bind-bank-card">
                    <img alt="Add Bank" className="icon" src="/images/addicon.png" /> Add bank account
                    </a>
                </div>
                {bankAccounts.length === 0 && <p style={{ padding: "10px 0px 0px", textAlign: 'center' }}>No bank accounts added yet.</p>}
            </section>

            <div className='card-wrap'>
            <div className="card">
                <div className="card-body text-left" style={{fontSize: '10px',color: 'red',fontFamily: '"Mona Sans", sans-serif',fontWeight: '500'}}>
                    <p>1. This form is for withdrawing the amount from the main wallet only.</p>
                    <p>2. The bonus wallet amount cannot be withdrawn by this form.</p>
                    <p>3. Do not put Withdraw request without betting with deposit amount. Such activity may be identified as Suspicious</p>
                    <p>4. If multiple users are using same withdraw account then all the linked users will be blocked.</p>
                    <p>5. Maximum Withdraw time is 45 minutes then only complain on WhatsApp number.</p>
                </div>
            </div>
            </div>

            {bankAccounts.map(acc => (
            <div className="withdraw-detail card-wrap" key={acc.id}>
                <div className='dlt' onClick={() => handleDelete(acc.id)} style={{cursor:'pointer'}}><i className='fa fa-trash'></i></div>
                <h3 className='u-name'>{acc.account_holder_name || acc.payee_name || 'Account'}</h3>
                <div className='acc-detail'>
                    <p>{acc.bank_name}</p>
                    <p>Account no. {acc.account_number}</p>
                    <p>IFSC Code: {acc.ifsc_code}</p>
                </div>
                <div className='fill-amount'>
                    <form onSubmit={e => { e.preventDefault(); handleWithdraw(acc.id); }}>
                    <div className='field'><input type='number' placeholder='Enter amount' min="1" value={withdrawAmounts[acc.id] || ''} onChange={e => setWithdrawAmounts(prev => ({...prev, [acc.id]: e.target.value}))} /></div>
                    <button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Withdraw'}</button>
                    </form>
                </div>
            </div>
            ))}

            <div className="withdrAW-status">
                <div className='table-inner'>
                <table className="table chart-table">
                    <thead>
                        <tr>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Account</th>
                            <th>Date</th>
                            <th>Reason</th>
                        </tr>
                        </thead>
                        <tbody>
                            {history.map((w, i) => (
                            <tr key={w.id || i}>
                                <td>₹{w.amount}</td>
                                <td>{w.status}</td>
                                <td>{w.account_number || '-'}</td>
                                <td>{w.created_at ? new Date(w.created_at).toLocaleDateString() : '-'}</td>
                                <td>{w.reject_reason || '-'}</td>
                            </tr>
                            ))}
                            {history.length === 0 && <tr><td colSpan="5" style={{textAlign:'center'}}>No withdrawals yet</td></tr>}
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
