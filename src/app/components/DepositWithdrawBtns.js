import React from 'react'
import Link from 'next/link';

const DepositWithdrawBtns = () => {
  return (
    <div>
      <div className='diposit-withdraw'>
            <div className='flex'>
            <Link href="/" className='green'> <img src="/images/bank-building.png" className='icon' alt="Winbuzz" /> Deposit</Link>
            <Link href="/withdraw" className='red'> <img src="/images/withdraw.png" className='icon' alt="Winbuzz" /> Withdraw</Link>
            </div>
            </div>
    </div>
  )
}

export default DepositWithdrawBtns
