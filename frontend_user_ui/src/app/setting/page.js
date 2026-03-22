'use client'
import React, { useEffect, useState } from "react";
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from "../page.module.css";
import { useAuth } from '../lib/AuthContext'

const Setting = () => {
    const router = useRouter();
    const { logout } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "auto";
    }, [isOpen]);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

  return (
    <div>
        <header className="backheader">
        <div className="brdc">
            <div className="back-btn">
            <a href="/home">
                <img alt="back" src="/images/back-btn.png" />
            </a>
            </div>
            <h3>Setting</h3>
        </div>
        </header>
      <div className='setting-page-wrap' style={{background:"#f6f7fa"}}>
            <main className={styles.pagenotcenter}>
                <div className="page-wrappers profile-page">
                              
                    <section className="section-1">                                       
                        <ul className="menu">
                            <li>
                                <a className="dropdownitem" href="/">
                                <div className='lft'>
                                <img src="/images/s-icon1.jpg"/>
                                Customer service
                                </div>
                                <div className="arw"><img src="/images/right-arw.png"/></div>
                                </a>
                            </li>
                            <li>                                
                                <button className="open-btn" onClick={() => setIsOpen(true)}>
                                    <div className='lft'>
                                        <img src="/images/s-icon2.jpg"/>
                                        Business coorperation
                                    </div>
                                    <div className="arw"><img src="/images/right-arw.png"/></div>
                                </button>
                            </li>
                            <li>
                                <a className="dropdownitem" href="/">
                                <div className='lft'>
                                <img src="/images/s-icon3.jpg"/>
                                Version
                                </div>
                                <div className="arw"><img src="/images/right-arw.png"/></div>
                                </a>
                            </li>
                            <li>
                                <a className="dropdownitem" href="/">
                                <div className='lft'>
                                <img src="/images/s-icon4.jpg"/>
                                Intall the official version
                                </div>
                                <div className="arw"><img src="/images/right-arw.png"/></div>
                                </a>
                            </li>                        
                            </ul>

                            <div className='logout-btn'>
                                <button className="logout" onClick={handleLogout}>Logout</button>
                            </div>
                    </section>

        </div>
        

        <div className={`overlay ${isOpen ? "show" : ""}`} onClick={() => setIsOpen(false)}/>

        <div className={`popup ${isOpen ? "show" : ""}`}>
            <div className="handle" />
            <h2>Business coorperation</h2>        
            <div className="socialLinkso">
                <Link href="/" style={{display: 'flex',alignItems: 'center',fontSize: '15px',letterSpacing: '.2px'}}>
                <img src="/images/telegram-ic.png" alt="telegram"  width="32" height="32" style={{marginRight: '12px'}} /> Telegram
                </Link>            
                <Link href="/" style={{display: 'flex',alignItems: 'center',fontSize: '15px',letterSpacing: '.2px'}}>
                <img src="/images/whatsapp-ic.png" alt="whatsapp" width="32" height="32"  style={{marginRight: '12px'}} /> WhatsApp
                </Link>
            </div>
            <div className="close-btn" onClick={() => setIsOpen(false)}>
            <img src="/images/close-icon.png" />
            </div>             
        </div> 


        </main>
        </div>

    </div>
  )
}

export default Setting
