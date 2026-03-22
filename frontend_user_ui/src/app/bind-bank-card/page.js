'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { userAPI } from '../lib/api'

const BindBankCard = () => {
  const router = useRouter();
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!accountNo || !ifsc || !payeeName || !bankName) { setError('All fields are required'); return; }

    setLoading(true);
    try {
      await userAPI.addBankAccount({
        account_number: accountNo,
        ifsc,
        account_holder: payeeName,
        bank_name: bankName,
      });
      setSuccess('Bank account added successfully!');
      setTimeout(() => router.push('/withdraw'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to add bank account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="backheader">
        <div className="brdc">
            <div className="back-btn">
            <a href="/withdraw">
                <img alt="back" src="/images/back-btn.png" />
            </a>
            </div>
            <h3>Bind bank card</h3>
        </div>
        </header>

        <div className='page-wrapper' style={{background:'#fff'}}>
            <section className="add-bank-btn">

                {error && <div style={{background:'#ffe0e0',color:'#c00',padding:'8px',margin:'8px 0',borderRadius:'4px',fontSize:'12px'}}>{error}</div>}
                {success && <div style={{background:'#e0ffe0',color:'#060',padding:'8px',margin:'8px 0',borderRadius:'4px',fontSize:'12px'}}>{success}</div>}

                <form className="form-bx" onSubmit={handleSubmit}>
                    <div className="form-rw">
                        <label className="text" htmlFor="account-no">AccNo.</label>
                        <div className="pos">
                        <input id="account-no" placeholder="Please enter Account No." type="text" value={accountNo} onChange={e => setAccountNo(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-rw">
                        <label className="text" htmlFor="ifsc">IFSC</label>
                        <div className="pos">
                        <input id="ifsc" placeholder="Please enter IFSC" maxLength={11} type="text" value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} />
                        </div>
                    </div>
                    <div className="form-rw">
                        <label className="text" htmlFor="payee-name">AccName.</label>
                        <input id="payee-name" placeholder="Please enter Payee Name." type="text" value={payeeName} onChange={e => setPayeeName(e.target.value)} />
                    </div>
                    <div className="form-rw">
                        <label className="text" htmlFor="bank-name">Bank Name</label>
                        <input id="bank-name" placeholder="Please enter Bank Name (e.g., HDFC, SBI)" type="text" value={bankName} onChange={e => setBankName(e.target.value)} />
                    </div>
                    <button className="login-btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Commit'}</button>
                </form>
                    <br/>
                    <p>
                    Please check the information carefully before submission. If transfer issues
                    occur due to incorrect information, it is the user's responsibility.
                    </p>

            </section>
        </div>

    </div>
  )
}

export default BindBankCard
