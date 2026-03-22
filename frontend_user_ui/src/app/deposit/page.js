
'use client'
import React, { useState, useEffect } from 'react'
import Header from '../components/Header'
import Link from 'next/link'
import DepositWithdrawBtns from '../components/DepositWithdrawBtns'
import { depositAPI } from '../lib/api'

const DipositPage = () => {
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!screenshot) {
      setScreenshotPreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(screenshot);
    setScreenshotPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [screenshot]);

  const fetchHistory = async () => {
    try {
      const res = await depositAPI.history({});
      setHistory(res.deposits || []);
    } catch {}
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!amount || parseInt(amount) <= 0) { setError('Enter valid amount'); return; }
    if (!utr) { setError('Enter UTR / transaction reference'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('utr_number', utr);
      if (screenshot) formData.append('screenshot', screenshot);

      await depositAPI.request(formData);
      setSuccess('Deposit request submitted!');
      setAmount(''); setUtr(''); setScreenshot(null);
      fetchHistory();
    } catch (err) {
      setError(err.message || 'Failed to submit deposit');
    } finally {
      setLoading(false);
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
            <h3>Deposit</h3>
        </div>
        </header>

        <div className='page-wrapper lr-padding' style={{paddingBottom:"100px"}}>
            
            <DepositWithdrawBtns></DepositWithdrawBtns>
            
             <div className='page-wrapper-inner'>    
                
            <div className="withdraw-detail card-wrap">

                {error && <div style={{background:'#ffe0e0',color:'#c00',padding:'8px',marginBottom:'8px',borderRadius:'4px',fontSize:'12px'}}>{error}</div>}
                {success && <div style={{background:'#e0ffe0',color:'#060',padding:'8px',marginBottom:'8px',borderRadius:'4px',fontSize:'12px'}}>{success}</div>}

                <div className='fill-amount' style={{marginTop:"0"}}>
                    <form onSubmit={handleSubmit}>
                    <label style={{marginBottom:"5px",display:"block"}}><b>Amount</b></label>
                    <div className='field'><input type='number' placeholder='Enter amount' value={amount} onChange={e => setAmount(e.target.value)} min="1" /></div>
                    <label style={{marginBottom:"5px",display:"block",marginTop:"10px"}}><b>UTR / Transaction ID</b></label>
                    <div className='field'><input type='text' placeholder='Enter UTR number' value={utr} onChange={e => setUtr(e.target.value)} /></div>
                    <label style={{marginBottom:"5px",display:"block",marginTop:"10px"}}><b>Screenshot (optional)</b></label>
                    <div className='field'>
                      <input type='file' accept='image/*' onChange={e => setScreenshot(e.target.files[0] || null)} />
                    </div>
                    {screenshot && (
                      <div style={{marginTop:'10px',padding:'10px',border:'1px solid #e5e7eb',borderRadius:'8px',background:'#fafafa'}}>
                        <div style={{fontSize:'12px',fontWeight:'600',marginBottom:'8px',color:'#111827'}}>
                          Selected screenshot: {screenshot.name}
                        </div>
                        {screenshotPreview && (
                          <img
                            src={screenshotPreview}
                            alt="Selected deposit screenshot"
                            style={{maxWidth:'100%',maxHeight:'220px',borderRadius:'8px',objectFit:'contain'}}
                          />
                        )}
                      </div>
                    )}
                    <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
                    </form>
                </div>
            </div>

            <div className='card-wrap'>
            <div className="card">
                <div className="card-body text-left" style={{fontSize: '10px',color: 'red',fontFamily: '"Mona Sans", sans-serif',fontWeight: '500'}}>
                    <p>1. Enter the exact deposited amount and UTR number.</p>
                    <p>2. Upload payment screenshot for faster verification.</p>
                    <p>3. Deposit will be credited after admin approval.</p>
                    <p>4. Do not submit duplicate deposit requests.</p>
                    <p>5. For issues, contact customer support on WhatsApp.</p>
                </div>
            </div>
            </div>           

            <div className="withdrAW-status">
                <div className='table-inner'>
                <table className="table chart-table">
                    <thead>
                        <tr>
                            <th>UTR</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                        </thead>

                        <tbody>
                            {history.map((d, i) => (
                            <tr key={d.id || i}>
                                <td>{d.utr_number || '-'}</td>
                                <td>₹{d.amount}</td>
                                <td>{d.status}</td>
                                <td>{d.created_at ? new Date(d.created_at).toLocaleDateString() : '-'}</td>
                            </tr>
                            ))}
                            {history.length === 0 && <tr><td colSpan="4" style={{textAlign:'center'}}>No deposits yet</td></tr>}
                        </tbody>
                </table>
                </div>
            </div>

            </div>

        </div>

    </div>
  )
}

export default DipositPage
