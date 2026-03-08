'use client'
import React from 'react'
import Link from 'next/link'

import styles from "../page.module.css";


const LoginPage = () => {
  return (
    <div className='loginPage'>
      
      <main className={styles.page}>        
        <div className="page-wrappers">
          <div className="page-wrapper-login">

            <section className="section-1">
              <div className="image" style={{textAlign:'center'}}>
                <img
                  src="/images/login-img.png"
                  style={{ width: "80%" }}
                  alt="Login Illustration"
                />
              </div>
            </section>
            <section className="section-3">
              <h1 className="title" style={{ textAlign: "center" }}>
                <b>Welcome to A23 Satta</b>
              </h1>
              <p style={{ textAlign: "center",paddingBottom: '10px' }}>
                Login to A23 Satta and unlock exciting satta matka <br/> games instant results and real winning opportunities.
              </p>
              
             
              <div className="login-bx" style={{marginTop:'5px'}}>
                <Link href="/login-account" className="login-btn">
                  Login 
                </Link>
                <p className="text">
                  First time login will register new account for you
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>


    </div>
  )
}

export default LoginPage
