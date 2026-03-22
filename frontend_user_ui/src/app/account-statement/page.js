'use client'
import React, { useState, useEffect } from 'react'
import Header from '../components/Header';
import DepositWithdrawBtns from '../components/DepositWithdrawBtns';
import { userAPI } from '../lib/api'

const AccountStatement = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = new Date().toLocaleDateString('en-CA');
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toLocaleDateString('en-CA');
  const [fromDate, setFromDate] = useState(twoWeeksAgo);
  const [toDate, setToDate] = useState(today);

  const rowsPerPage = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const currentRows = rows.slice(start, start + rowsPerPage);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await userAPI.getAccountStatement({ from: fromDate, to: toDate, limit: 200 });
      setRows(res.transactions || res.statement || []);
      setPage(1);
    } catch {} finally { setLoading(false); }
  };

  const formatCurrency = (value) => `₹${Math.abs(Number(value || 0)).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const getCredit = (row) => {
    const amount = Number(row.amount || 0);
    return amount > 0 ? formatCurrency(amount) : '-';
  };

  const getDebit = (row) => {
    const amount = Number(row.amount || 0);
    return amount < 0 ? formatCurrency(amount) : '-';
  };

  const formatRemark = (remark) => {
    if (!remark) {
      return '-';
    }

    const normalized = String(remark).trim();
    const lower = normalized.toLowerCase();

    if (lower === 'deposit approved') {
      return 'Deposit Approved';
    }

    if (lower.startsWith('withdraw')) {
      return normalized
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    const betMatch = normalized.match(/^(jodi|haruf_andar|haruf_bahar|crossing) bet on (.+)$/i);
    if (betMatch) {
      const typeLabel = betMatch[1]
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      return `${typeLabel} Bet on ${betMatch[2].toUpperCase()}`;
    }

    return normalized
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
        <Header></Header>

        <div className='page-wrapper0 lr-padding' style={{background:'#fff'}}>

        <DepositWithdrawBtns></DepositWithdrawBtns>
        
        <div className='page-wrapper-inners' style={{marginTop: '5px'}}>
            <div className="head-title topround"><h2 className="title-text"><b>Account Statement</b></h2></div>
            <section className='transaction-section'>
                    
                    <div className="filters">
                        <div className="filter-box">
                        <label>From Date :</label>
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                        </div>
                        <div className="filter-box">
                        <label>To Date :</label>
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                        </div>
                    </div>
                    <button className="apply-btn" onClick={fetchData} disabled={loading}>{loading ? 'Loading...' : 'APPLY'}</button>
                   
                   <div className='table-responsive'>
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Sr No</th>
                            <th>Date</th>
                            <th>Credit</th>
                            <th>Debit</th>
                            <th>Balance</th>
                            <th>Remark</th>
                        </tr>
                        </thead>

                        <tbody>
                        {currentRows.map((row, idx) => (
                            <tr key={row.id || idx}>
                            <td>{start + idx + 1}</td>
                            <td>{row.created_at ? new Date(row.created_at).toLocaleString() : row.date || '-'}</td>
                          <td className="green">{getCredit(row)}</td>
                          <td>{getDebit(row)}</td>
                          <td className="green">{row.balance_after != null ? formatCurrency(row.balance_after) : '-'}</td>
                            <td>{formatRemark(row.description || row.remark)}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && <tr><td colSpan="6" style={{textAlign:'center'}}>No transactions found</td></tr>}
                        </tbody>
                    </table>
                    </div>
                    <div className="pagination">
                        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="page-btn">
                        Prev
                        </button>

                        <span className="page-number">
                        Page {page} / {totalPages}
                        </span>

                        <button
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)} className="page-btn"
                        >
                        Next
                        </button>
                    </div>                
            </section>
        </div>
      </div>
      
    </div>
  )
}

export default AccountStatement
