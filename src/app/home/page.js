'use client'
import React from 'react'
import Header from '../components/Header';
import HomeHeroBanner from '../components/HomeHeroBanner';
import HomeNewLaunch from '../components/HomeNewLaunch';
import Link from 'next/link';

const HomePage = () => {
  return (
    <div>
      <Header></Header>
      
      <div className='diposit-withdraw'>
        <div className='flex'>
           <Link href="/" className='green'> <img src="/images/bank-building.png" className='icon' alt="Winbuzz" /> Deposit</Link>
           <Link href="/withdraw" className='red'> <img src="/images/withdraw.png" className='icon' alt="Winbuzz" /> Withdraw</Link>
        </div>
      </div>

      <HomeHeroBanner></HomeHeroBanner>
      <HomeNewLaunch></HomeNewLaunch>



    </div>
  )
}

export default HomePage