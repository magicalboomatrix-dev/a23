import Link from 'next/link'
import React, { useState } from 'react'

const Header = () => {
  
  const [openMenu, setOpenMenu] = useState(false);
  
  const [usopen, setusOpen] = useState(false);

  const toggleDrawer = () => {
    setusOpen(!usopen);
  };
  
  return (
    <div>
      {/*<header className='header'>
        <div className='tophader'>
            <div className='left'><Link href="/"><b>LOGO</b></Link></div>
            <div className='right'>
                <Link href="/login" className='btn'>LOGIN</Link>
                <Link href="/login" className='btn' style={{background:'#4caf50'}}>REGISTER</Link>
            </div>
        </div>
      </header>*/}

      <header className="top-header">
        <div className="header-inner">
          <div className="left">
            <div className="menu-icon" onClick={() => setOpenMenu(true)}>☰</div>
            <div className="logo">
              <Link href="/"><img src="/images/logo.png" alt="Winbuzz" /></Link>
            </div>
          </div>
          <div className="right">
            <div className="search"><img src="/images/search-icon.png" className='img' alt="Winbuzz" /></div>
            <div className="balance">
              <span>Bal: 0.00</span>
              <small>Exp: 0</small>
            </div>
            <div className="user" onClick={toggleDrawer}><img src="/images/per-icon.png" className='img' alt="Winbuzz" /></div>
          </div>
        </div>
        <div className="notice-bar"><span className="blink-texts"><marquee>महत्वपूर्ण सूचना: हम केवल संख्याओं के अनुमान/भविष्यवाणी प्रदान करते हैं। हमारा किसी भी प्रकार के जुआ या सट्टेबाजी से कोई संबंध नहीं है। किसी भी लाभ या हानि के लिए आप स्वयं पूरी तरह से जिम्मेदार होंगे।</marquee></span></div>        


        {/* Overlay */}
      <div className={`overlay ${openMenu ? "active" : ""}`} onClick={() => setOpenMenu(false)}></div>
      {/* Sidebar */}
      <div className={`sidebar ${openMenu ? "active" : ""}`}>
        <div className="sidebar-header">
          <span className="close-btn" onClick={() => setOpenMenu(false)} >✕</span>
          <div className="logo">
              <Link href="/"><img src="/images/logo.png" alt="Winbuzz" /></Link>
            </div>
        </div>

        <ul className="menu-list">
          <li>Multi Market</li>
          <li>Cricket</li>
          <li>Football</li>
          <li>Tennis</li>
          <li>Politics</li>
          <li>Int Casino</li>
          <li>Sports Book</li>
          <li>Horse Racing</li>
          <li>Greyhound Racing</li>
          <li>Binary</li>
          <li>Kabaddi</li>
          <li>Basketball</li>
          <li>Baseball</li>
        </ul>

     

      </div>


       {/* Drawer */}
      <div className={`drawer ${usopen ? "active" : ""}`}>
        <div className="wallet-box">
          <div className="wallet-item">
            <span>Wallet Amount <br/> <small>(Inclusive bonus)</small></span>
            <strong>0.00</strong>
          </div>
          <div className="wallet-item">
            <span>Net Exposure</span>
            <strong>0.00</strong>
          </div>
          <div className="wallet-item">
            <span>Available Withdrawal</span>
            <strong>0.00</strong>
          </div>
        </div>
        <button className="gold-btn">Refer and Earn</button>
        <button className="outline-btn">Awaiting Bonus 0</button>
        <ul className="menu">
          <li><Link href="/" className='dropdown-item'><i className="fa fa-university"></i> Account Statement</Link></li>
          <li><Link href="/" className='dropdown-item'><i className="fa fa-cog"></i> Betting Profit & Loss</Link></li>
          <li><Link href="/" className='dropdown-item'><i className="fa fa-gavel"></i> Bonus Rules</Link></li>
          <li><Link href="/" className='dropdown-item'><i className="fa fa-sign-out"></i>Sign Out</Link></li>
        </ul>
      </div>
      </header>


    </div>
  )
}

export default Header
