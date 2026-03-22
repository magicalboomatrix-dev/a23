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

  return (
    <div>
      <div className="bottom-tabs">
        <span className="bottom-image" />
        <ul>
            <li className="truncate all-sports lpsport">
            <Link href="/">
                <img src="/images/football.png" alt="" className="img-fluid" />
                <div className="title-name">Sports Book</div>
            </Link>            
            </li>
            <li className="truncate lpinplay">
            <Link href="/chart">
                <img src="/images/bar-chart.png" alt="" className="img-fluid" />
                <div className="title-name">Chart</div>
            </Link>            
            </li>
            <li className="truncate">
            <Link href="/">
                &nbsp;
            </Link>
            </li>
            <li className="big">
            <Link href="/">
                <span>
                <img src="/images/home.png" />
                </span>
            </Link>
            </li>
            <li className="truncate lpcasomp">
            <Link href="/">
                <img src="/images/Casino.png" alt="" className="img-fluid" />
                <div className="title-name">Casino</div>
            </Link>            
            </li>
            <li className="truncate promotion lppromotion">
            <Link href="/profile">
                <img src="/images/megaphone.png" alt="" className="img-fluid" />
                <div className="title-name">Profile</div>
            </Link>
            </li>
        </ul>
        </div>


    </div>
  )
}

export default Footer
