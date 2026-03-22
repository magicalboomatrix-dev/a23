'use client'
import React, { useState, useEffect } from 'react'
import Header from '../components/Header';
import DepositWithdrawBtns from '../components/DepositWithdrawBtns';
import { userAPI } from '../lib/api'

const ProfitLoss = () => {
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
      const res = await userAPI.getProfitLoss({ from: fromDate, to: toDate, limit: 200 });
      setRows(res.records || res.bets || res.profitLoss || res.data || []);
      setPage(1);
    } catch {} finally { setLoading(false); }
  };

  const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  useEffect(() => { fetchData(); }, []);

  return (
    <div style={{paddingBottom:'100px'}}>
        <Header></Header>

        <div className='page-wrapper0 lr-padding' style={{background:'#fff'}}>

        <DepositWithdrawBtns></DepositWithdrawBtns>
        
        <div className='page-wrapper-inners' style={{marginTop: '5px'}}>
            <div className="head-title topround"><h2 className="title-text"><b>Betting Profit and Loss</b></h2></div>
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
                    <button className="apply-btn" onClick={fetchData} disabled={loading}>{loading ? 'Loading...' : 'SEARCH'}</button>
                   
                   <div className='table-responsive'>
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Sr No</th>
                            <th>Date</th>
                            <th>Game</th>
                            <th>Type</th>
                          <th>Bet</th>
                          <th>Win</th>
                          <th>Profit/Loss</th>
                          <th>Status</th>
                        </tr>
                        </thead>

                        <tbody>
                        {currentRows.map((row, idx) => (
                            <tr key={row.id || idx}>
                            <td>{start + idx + 1}</td>
                            <td>{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</td>
                          <td>{row.event || row.game_name || '-'}</td>
                          <td>{(row.event_type || row.bet_type || '-').replaceAll('_', ' ')}</td>
                          <td>{formatCurrency(row.total_amount)}</td>
                          <td className="green">{formatCurrency(row.win_amount)}</td>
                          <td className={Number(row.profit_loss) >= 0 ? 'green' : 'red'}>{formatCurrency(row.profit_loss)}</td>
                          <td>{row.status || '-'}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && <tr><td colSpan="8" style={{textAlign:'center'}}>No data found</td></tr>}
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

export default ProfitLoss
