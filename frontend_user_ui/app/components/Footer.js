'use client'
import { usePathname } from "next/navigation";
import Link from 'next/link'
import React from 'react'

const Footer = () => {
  const pathname = usePathname();
  const hideFooterRoutes = ["/login", "/login-account", "/bind-bank-card", "/game-page"];
  if (hideFooterRoutes.includes(pathname)) {
    return null;
  }

  // Helper to check if a route is active
  const isActive = (route) => pathname === route;
  const itemClass = (route) => `flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${isActive(route) ? 'text-[#b6842d]' : 'text-white/90'}`;

  return (
    <>
      <div aria-hidden="true" className="mt-10 mb-6 shrink-0" />
      <div className="pointer-events-none fixed bottom-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 justify-center">
        <div className="pointer-events-auto relative w-full rounded-t-[26px] bg-black px-3  pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-5 items-end">
            <Link href="/my-bets" className={itemClass('/my-bets')}>
              <img src="/images/football.png" alt="My Bets" className="h-4.5 w-4.5 object-contain" />
              <div className="text-white">My Bets</div>
            </Link>
            <Link href="/chart" className={itemClass('/chart')}>
              <img src="/images/bar-chart.png" alt="Chart" className="h-4.5 w-4.5 object-contain" />
              <div className="text-white">Chart</div>
            </Link>
            <div className="flex justify-center">
              <Link href="/" className={`-mt-8 flex h-[68px] w-[68px] items-center justify-center rounded-full border-4 border-white bg-black shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${isActive('/') ? 'text-[#b6842d]' : 'text-white'}`}>
                <img src="/images/home.png" alt="Home" className="h-7 w-7 object-contain" />
              </Link>
            </div>
            <Link href="/wallet" className={itemClass('/wallet')}>
              <img src="/images/bank-building.png" alt="Wallet" className="h-4.5 w-4.5 object-contain" />
              <div className="text-white">Wallet</div>
            </Link>
            <Link href="/profile" className={itemClass('/profile')}>
              <img src="/images/megaphone.png" alt="Profile" className="h-4.5 w-4.5 object-contain" />
              <div className="text-white">Profile</div>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default Footer
