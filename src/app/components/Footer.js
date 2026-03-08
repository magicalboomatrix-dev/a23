'use client'
import { usePathname } from "next/navigation";
import Link from 'next/link'
import React from 'react'

const Footer = () => {
  const pathname = usePathname();
  const hideFooterRoutes = ["/login", "/login-account", "/bind-bank-card"];
  if (hideFooterRoutes.includes(pathname)) {
    return null;
  }

  return (
    <div>
      <div className="bottom-tabs">
        <span className="bottom-image" />
        <ul _ngcontent-cuk-c82="">
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
                <span _ngcontent-cuk-c82="">
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
            <Link href="/">
                <img src="/images/megaphone.png" alt="" className="img-fluid" />
                <div className="title-name">Popular</div>
            </Link>
            </li>
        </ul>
        </div>


    </div>
  )
}

export default Footer
