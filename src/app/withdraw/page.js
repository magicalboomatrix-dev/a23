
'use client'
import React from 'react'
import Header from '../components/Header'
import Link from 'next/link'
import DepositWithdrawBtns from '../components/DepositWithdrawBtns'

const WithDrawPage = () => {
  return (
    <div>
      <header className="backheader">
        <div className="brdc">
            <div className="back-btn">
            <a href="/home">
                <img alt="back" src="/images/back-btn.png" />
            </a>
            </div>
            <h3>Bank Account</h3>
        </div>
        </header>

        <div className='page-wrapper lr-padding' style={{paddingBottom:"100px"}}>
            <DepositWithdrawBtns></DepositWithdrawBtns>
             <div className='page-wrapper-inner'>
            <section className="add-bank-btn">
                <div className="add-bank">
                    <a className="button-style" href="/bind-bank-card">
                    <img alt="Add Bank" className="icon" src="/images/addicon.png" /> Add bank
                    account
                    </a>
                </div>
                <p style={{ padding: "10px 0px 0px", textAlign: 'center' }}>No bank accounts added yet.</p>
            </section>

            <div className='card-wrap'>
            <div className="card">
                <div className="card-body text-left" style={{fontSize: '10px',color: 'red',fontFamily: '"Mona Sans", sans-serif',fontWeight: '500'}}>
                    <p>1. This form is for withdrawing the amount from the main wallet only.</p>
                    <p>2. The bonus wallet amount cannot be withdrawn by this form.</p>
                    <p>3. Do not put Withdraw request without betting with deposit amount. Such activity
                        may
                        be identified as Suspicious</p>
                    <p>4. If multiple users are using same withdraw account then all the linked users
                        will
                        be blocked.</p>
                    <p>5. Maximum Withdraw time is 45 minutes then only complain on WhatsApp number.</p>
                </div>
            </div>
            </div>

            <div className="card-wrap">
                <a className="reset_withdraw_password" href="#">
                    <div className="card">
                    <div className="card-body payment-issues">                    
                        <b>FOR RESET WITHDRAW PASSWORD CLICK HERE</b>                        
                        <div className='blink-text'><i className="fa-brands fa-whatsapp my-float" /></div>                     
                    </div>
                    </div>
                </a>
            </div>
            
            <div className="withdraw-detail card-wrap">
                <div className='dlt'><i className='fa fa-trash'></i></div>
                <h3 className='u-name'>Mayank Kumar</h3>

                <div className='acc-detail'>
                    <p>SBI</p>
                    <p>Account no. 174400345567</p>
                    <p>IFSC Code: SBIB001234</p>
                </div>

                <div className='fill-amount'>
                    <form>
                    <div className='field'><input type='text' placeholder='Enter amount' /></div>
                    <button>Withdraw</button>
                    </form>
                </div>
            </div>

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
                            <tr>
                                <td className=''>45</td>
                                <td className=''>Close</td>
                                <td className=''>174400345567</td>
                                <td className=''>2026-03-03</td>
                                <td className=''>-</td>        
                            </tr>
                            <tr>
                                <td className=''>45</td>
                                <td className=''>Close</td>
                                <td className=''>174400345567</td>
                                <td className=''>2026-03-03</td>
                                <td className=''>-</td>        
                            </tr>
                            <tr>
                                <td className=''>45</td>
                                <td className=''>Close</td>
                                <td className=''>174400345567</td>
                                <td className=''>2026-03-03</td>
                                <td className=''>-</td>        
                            </tr>
                            <tr>
                                <td className=''>45</td>
                                <td className=''>Close</td>
                                <td className=''>174400345567</td>
                                <td className=''>2026-03-03</td>
                                <td className=''>-</td>        
                            </tr>
                            <tr>
                                <td className=''>45</td>
                                <td className=''>Close</td>
                                <td className=''>174400345567</td>
                                <td className=''>2026-03-03</td>
                                <td className=''>-</td>        
                            </tr>
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
