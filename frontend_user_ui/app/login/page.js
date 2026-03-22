'use client'
import React from 'react'
import Link from 'next/link'


const LoginPage = () => {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#f6f7fa]">
      <div className="px-3 pt-3">
          <Link href="/">
            <img src="/images/back-btn.png" className="h-5 w-5" alt="Back" />
          </Link>
        </div>
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center px-4">     
           
        <div className="w-full max-w-105 bg-white px-4 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
          
          <div>
          
            <section>
              <div className="text-center">
                <img
                  src="/images/login-img.png"
                  className="mx-auto w-4/5"
                  alt="Login Illustration"
                />
              </div>
            </section>
            <section>
              <h1 className="text-center text-[22px] font-black text-[#111]">
                <b>Welcome to A23 Satta</b>
              </h1>
              <p className="pb-2.5 text-center text-[#444]">
                Login to A23 Satta and unlock exciting satta matka <br/> games instant results and real winning opportunities.
              </p>
              
             
              <div className="mt-1 px-2">
                <Link href="/login-account" className="inline-block w-full bg-[#1d1c20] px-4 py-3 text-center text-sm font-semibold text-white">
                  Login 
                </Link>
                <p className="mt-2 text-center text-[13px] font-medium text-[#ff0036]">
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
