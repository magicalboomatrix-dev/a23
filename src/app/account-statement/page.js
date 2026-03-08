'use client'
import React from 'react'
import Link from 'next/link';
import { useState } from "react";
import Header from '../components/Header';
import DepositWithdrawBtns from '../components/DepositWithdrawBtns';

const AccountStatement = () => {
    
    const rows = [
    {
      sr: 1,
      date: "2026-03-03 08:18",
      credit: "0.00",
      debit: "-",
      balance: "0.00",
      remark: "Deposit Free Chip from Up-Line",
    },
    {
      sr: 2,
      date: "2026-03-04 10:10",
      credit: "100.00",
      debit: "-",
      balance: "100.00",
      remark: "Deposit",
    },
    {
      sr: 3,
      date: "2026-03-05 09:30",
      credit: "-",
      debit: "50.00",
      balance: "50.00",
      remark: "Withdraw",
    },
    {
      sr: 4,
      date: "2026-03-06 11:00",
      credit: "20.00",
      debit: "-",
      balance: "70.00",
      remark: "Bonus",
    },
  ];

  const rowsPerPage = 2;
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(rows.length / rowsPerPage);

  const start = (page - 1) * rowsPerPage;
  const currentRows = rows.slice(start, start + rowsPerPage);


  return (
    <div>
        <Header></Header>

        {/*<header className="backheader">
        <div className="brdc">
            <div className="back-btn">
            <a href="/home">
                <img alt="back" src="/images/back-btn.png" />
            </a>
            </div>
            <h3>Account Statement</h3>
        </div>
        </header>*/}

        <div className='page-wrapper0 lr-padding' style={{background:'#fff'}}>

        <DepositWithdrawBtns></DepositWithdrawBtns>
        
        <div className='page-wrapper-inners' style={{marginTop: '5px'}}>
            <div className="head-title topround"><span className="title-text">Account Statement</span></div>
            <section className='transaction-section'>
                    
                    <div className="filters">
                        <div className="filter-box">
                        <label>From Date :</label>
                        <input type="date" defaultValue="2026-02-20" />
                        </div>
                        <div className="filter-box">
                        <label>To Date :</label>
                        <input type="date" defaultValue="2026-03-07" />
                        </div>
                    </div>
                    <button className="apply-btn">APPLY</button>
                   
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
                        {currentRows.map((row) => (
                            <tr key={row.sr}>
                            <td>{row.sr}</td>
                            <td>{row.date}</td>
                            <td className="green">{row.credit}</td>
                            <td>{row.debit}</td>
                            <td className="green">{row.balance}</td>
                            <td>{row.remark}</td>
                            </tr>
                        ))}
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
