'use client'
import React from 'react'
import Link from 'next/link'
import styles from "../page.module.css";

const LoginAccountPage = () => {
  return (
    <div className='loginaccountPage'>
      <main className={styles.pagenotcenter}>
        <div className="page-wrappers">
          <div className="page-wrapper-login"></div>
           <div className="back-btn">
              <Link href="/login">
                <img src="/images/back-btn.png" />
              </Link>
            </div>
            <section className="section-1">
  <h3 className="title">
    <b>Complete Your Profile to Stay Connected</b>
  </h3>
  <h4
    style={{
      fontWeight: "normal",
      fontSize: 16,
      paddingBottom: 10,
      color: "rgb(105, 105, 105)"
    }}
  >
    Exchange more, earn more, make your life better.
  </h4>
  <div className="form-bx">
    <div className="form-rw">
      <label className="text">Full Name </label>
      <input
        id=""
        placeholder="Enter your name"
        type="text"
      />
    </div>
    <div className="form-rw">
      <label className="text">Mobile Number  </label>
      <input
        id=""
        placeholder="Eenter your number"
        type="text"
      />
    </div>
    <div className="form-rw">
      <label className="text">OTP </label>
      <div className="pos">
        <input
          id=""
          placeholder="Enter Your OTP"
          type="text"
          defaultValue=""
        />
        <button type="button">Send OTP</button>
      </div>
    </div>
     <div className="login-bx mb-0 text-left">
        <p className="btntext">
          By continuing you  will receive a one-time <span style={{color:'red'}}>verification code</span> to your phone number by SMS.
        </p>
      </div>
    <button type="button" className="login-btn">
     Complete Profile
    </button>
  </div>
</section>
        
        </div>
      </main>

    </div>
  )
}

export default LoginAccountPage
